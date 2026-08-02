'use strict';
const cds = require('@sap/cds');
const recommendations = require('./ai/recommendations-job');
const reposicao = require('./ai/reposicao-agent');
const setupMessaging = require('./events/messaging');

module.exports = class FranqueadoraService extends cds.ApplicationService {

  async init() {
    const {
      VendaPraticada, KPI_Unidade,
      ItensCatalogo, RegrasCompliance,
      Desvios, Saude_Unidade,
      Unidades, Contratos_Franquia,
      Estoque_Unidade
    } = this.entities;

    // Detecção automática de desvios após nova venda registrada
    // CAP 10: after-handler recebe (results, req) — req.data contém os dados inseridos
    this.after('CREATE', VendaPraticada, async (results, req) => {
      const data = req.data;
      const desvio = await this._detectarDesvios(data, { ItensCatalogo, RegrasCompliance, Desvios });
      await this._recalcularSaude(data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
      // Emite evento se desvio foi detectado
      if (desvio && this.emitDesvioDetectado) {
        await this.emitDesvioDetectado(desvio).catch(() => {});
      }
    });

    // Recalcula score quando KPI é atualizado
    this.after('CREATE', KPI_Unidade, async (results, req) => {
      await this._recalcularSaude(req.data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
    });
    this.after('UPDATE', KPI_Unidade, async (results, req) => {
      await this._recalcularSaude(req.data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
    });

    // Gera o código da unidade automaticamente (padrão uXXXX) quando não informado
    this.before('CREATE', Unidades, async (req) => {
      if (!req.data.codigo) {
        req.data.codigo = await this._proximoCodigoUnidade(Unidades);
      }
    });

    // Ações de IA — geração de recomendações (AI Core/GenAI Hub ou fallback)
    this.on('gerarRecomendacoes', async (req) => {
      const { unidade_ID } = req.data;
      const { count, modo } = await recommendations.gerarParaUnidade(this, unidade_ID);
      return { unidade_ID, recomendacoes: count, modo };
    });

    this.on('gerarRecomendacoesTodas', async () => {
      return await recommendations.gerarParaTodas(this);
    });

    // Estoque: calcula coberturaDias + estoqueCriticality considerando a
    // sazonalidade regional da unidade (demanda ajustada = giro × fator sazonal).
    // O before garante que as colunas-base entrem no $select (o FE pede só as
    // colunas visíveis; sem os campos-base o cálculo não teria dados).
    this.before('READ', Estoque_Unidade, (req) => {
      // Não adicionar colunas em requisições $count — o HANA rejeita
      // colunas não-agregadas em GROUP BY de COUNT queries.
      if (req._.req?.path?.endsWith('/$count') || req.query?.SELECT?.one) return;
      const cols = req.query?.SELECT?.columns;
      if (Array.isArray(cols)) {
        const nomes = new Set(cols.map(c => c.ref?.[c.ref.length - 1]).filter(Boolean));
        for (const base of ['saldoAtual', 'giroMedioDiario', 'leadTimeDias', 'categoria', 'unidade_ID']) {
          if (!nomes.has(base)) cols.push({ ref: [base] });
        }
      }
    });
    this.after('READ', Estoque_Unidade, async (rows) => {
      if (!rows || typeof rows === 'number' || (Array.isArray(rows) && rows.length === 0)) return;
      await reposicao.enriquecerEstoque(this, Array.isArray(rows) ? rows : [rows]);
    });

    // Calcula severidadeCriticality para Desvios (ALTA=1, MEDIA=2, BAIXA=3)
    this.after('READ', Desvios, (rows) => {
      if (!rows) return;
      const list = Array.isArray(rows) ? rows : [rows];
      for (const r of list) {
        if (r.severidade_code) {
          r.severidadeCriticality =
            r.severidade_code === 'ALTA'  ? 1 :
            r.severidade_code === 'MEDIA' ? 2 : 3;
        }
      }
    });

    // Calcula urgenciaCriticality para Pedidos_Reposicao
    // 1=vermelho (PENDENTE/RECUSADO), 2=amarelo (APROVADO/ENVIADO), 3=verde (RECEBIDO)
    this.after('READ', 'Pedidos_Reposicao', (rows) => {
      if (!rows) return;
      const list = Array.isArray(rows) ? rows : [rows];
      for (const r of list) {
        r.urgenciaCriticality =
          r.status_code === 'PENDENTE'  ? 1 :
          r.status_code === 'RECUSADO'  ? 1 :
          r.status_code === 'APROVADO'  ? 2 :
          r.status_code === 'ENVIADO'   ? 2 : 3; // RECEBIDO = verde
      }
    });

    // Agente de Reposição — detecta risco de ruptura e gera pedidos (gpt-4o + fallback)
    this.on('gerarReposicao', async (req) => {
      const { unidade_ID } = req.data;
      const { count, modo } = await reposicao.gerarParaUnidade(this, unidade_ID);
      return { unidade_ID, pedidos: count, modo };
    });

    this.on('gerarReposicaoTodas', async () => {
      return await reposicao.gerarParaTodas(this);
    });

    this.on('rupturaCount', async () => {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_ESTOQUE_UNIDADE WHERE STATUS_CODE='RUPTURA'`
      );
      return CNT;
    });

    this.on('pedidosPendentesCount', async () => {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_PEDIDOS_REPOSICAO WHERE STATUS_CODE='PENDENTE'`
      );
      return CNT;
    });

    this.on('resetarDemo', async () => {
      const { Pedidos_Reposicao, Estoque_Unidade } = this.entities;

      // 1. Remove todos os pedidos (agente recriará automaticamente)
      await DELETE.from(Pedidos_Reposicao);

      // 2. Seed inicial: TODOS os estoques em situação saudável (OK)
      // Cenário de demo começa perfeito — simularVendas vai causar rupturas
      const seedOK = [
        { ID: 'es001', saldoAtual: 180, status_code: 'OK' },
        { ID: 'es002', saldoAtual: 200, status_code: 'OK' },
        { ID: 'es003', saldoAtual: 160, status_code: 'OK' },
        { ID: 'es004', saldoAtual: 175, status_code: 'OK' },
        { ID: 'es005', saldoAtual: 190, status_code: 'OK' },
        { ID: 'es006', saldoAtual: 210, status_code: 'OK' },
        { ID: 'es007', saldoAtual: 185, status_code: 'OK' },
        { ID: 'es008', saldoAtual: 170, status_code: 'OK' },
        { ID: 'es009', saldoAtual: 165, status_code: 'OK' },
        { ID: 'es010', saldoAtual: 195, status_code: 'OK' },
        { ID: 'es011', saldoAtual: 220, status_code: 'OK' },
        { ID: 'es012', saldoAtual: 200, status_code: 'OK' },
        { ID: 'es013', saldoAtual: 180, status_code: 'OK' },
      ];
      for (const item of seedOK) {
        await UPDATE(Estoque_Unidade)
          .set({ saldoAtual: item.saldoAtual, status_code: item.status_code })
          .where({ ID: item.ID });
      }

      return { pedidos: 0, mensagem: `Demo resetada — todos os estoques saudáveis (OK). Use "Simular Vendas" para acionar o cenário.` };
    });

    this.on('simularVendas', async () => {
      const { Estoque_Unidade } = this.entities;

      // Simula uma enxurrada de vendas — reduz estoques abaixo do mínimo em algumas unidades
      // Cada item tem estoqueMinimo definido no seed (~60). Baixamos para causar RUPTURA/ATENCAO.
      const vendas = [
        { ID: 'es001', saldoAtual: 45,  status_code: 'ATENCAO' }, // u178 - Loja Recife
        { ID: 'es002', saldoAtual: 18,  status_code: 'RUPTURA' }, // u156 - Loja Salvador
        { ID: 'es003', saldoAtual: 12,  status_code: 'RUPTURA' }, // u189 - Loja Natal
        { ID: 'es004', saldoAtual: 52,  status_code: 'ATENCAO' }, // u289 - Loja Fortaleza
        { ID: 'es007', saldoAtual: 35,  status_code: 'ATENCAO' }, // u178 - SKU-101
        { ID: 'es008', saldoAtual: 20,  status_code: 'RUPTURA' }, // u156 - Bota Inverno
        { ID: 'es009', saldoAtual: 15,  status_code: 'RUPTURA' }, // u147 - Porto Alegre
        { ID: 'es010', saldoAtual: 18,  status_code: 'RUPTURA' }, // u134 - Floripa
      ];

      for (const item of vendas) {
        await UPDATE(Estoque_Unidade)
          .set({ saldoAtual: item.saldoAtual, status_code: item.status_code })
          .where({ ID: item.ID });
      }

      // Emite eventos para o broker — agentes criam pedidos automaticamente
      const itemsDb = await SELECT.from(Estoque_Unidade).where({ ID: { in: vendas.map(v => v.ID) } });
      for (const item of itemsDb) {
        if (this.emitEstoqueChanged)
          await this.emitEstoqueChanged(item).catch(() => {});
      }

      const rupturas = vendas.filter(v => v.status_code === 'RUPTURA').length;
      const atencao  = vendas.filter(v => v.status_code === 'ATENCAO').length;
      return {
        rupturas: rupturas + atencao,
        mensagem: `${rupturas} rupturas e ${atencao} alertas simulados — Agente de Reposição acionado via AEM.`
      };
    });

    this.on('simularRecebimento', async () => {
      const { Pedidos_Reposicao, Estoque_Unidade } = this.entities;
      const pedidos = await SELECT.from(Pedidos_Reposicao).where({ status_code: 'APROVADO' });
      if (!pedidos.length) return { pedidos: 0, mensagem: 'Nenhum pedido APROVADO para simular.' };
      for (const p of pedidos) {
        const qtd = p.qtdAprovada || p.qtdSugerida || 0;
        if (qtd) {
          const item = await SELECT.one.from(Estoque_Unidade)
            .where({ unidade_ID: p.unidade_ID, sku: p.sku });
          if (item) {
            const novoSaldo = (item.saldoAtual || 0) + qtd;
            const novoStatus = novoSaldo >= item.estoqueMinimo ? 'OK'
              : novoSaldo >= item.estoqueMinimo * 0.5 ? 'ATENCAO' : 'RUPTURA';
            await UPDATE(Estoque_Unidade)
              .set({ saldoAtual: novoSaldo, status_code: novoStatus })
              .where({ ID: item.ID });
            // Emite evento de estoque alterado
            if (this.emitEstoqueChanged) {
              await this.emitEstoqueChanged({ ...item, saldoAtual: novoSaldo, status_code: novoStatus }).catch(() => {});
            }
          }
        }
        await UPDATE(Pedidos_Reposicao)
          .set({ status_code: 'RECEBIDO', dataDecisao: new Date().toISOString() })
          .where({ ID: p.ID });
        // Emite evento de pedido com status alterado
        if (this.emitPedidoStatusChanged) {
          await this.emitPedidoStatusChanged({ ...p, status_code: 'RECEBIDO' }).catch(() => {});
        }
      }
      return { pedidos: pedidos.length, mensagem: `${pedidos.length} pedidos RECEBIDOS e estoque reposto.` };
    });

    const { Pedidos_Reposicao } = this.entities;

    this.on('aprovar', Pedidos_Reposicao, async (req) => {
      const pedido_ID = req.params[0].ID ?? req.params[0];
      const { qtdAprovada, observacao } = req.data;
      const pedido = await SELECT.one.from(Pedidos_Reposicao).where({ ID: pedido_ID });
      if (!pedido) return req.error(404, `Pedido não encontrado`);
      if (pedido.status_code !== 'PENDENTE') return req.error(409, `Pedido já está com status ${pedido.status_code}`);
      await UPDATE(Pedidos_Reposicao).set({
        status_code : 'APROVADO',
        qtdAprovada : qtdAprovada ?? pedido.qtdSugerida,
        aprovador   : req.user?.id ?? 'gestor',
        dataDecisao : new Date().toISOString()
      }).where({ ID: pedido_ID });
      if (this.emitPedidoStatusChanged)
        await this.emitPedidoStatusChanged({ ...pedido, status_code: 'APROVADO', qtdAprovada: qtdAprovada ?? pedido.qtdSugerida }).catch(() => {});
      return { status: 'APROVADO', mensagem: observacao ?? `Aprovado — qtd: ${qtdAprovada ?? pedido.qtdSugerida}` };
    });

    this.on('recusar', Pedidos_Reposicao, async (req) => {
      const pedido_ID = req.params[0].ID ?? req.params[0];
      const { motivo } = req.data;
      const pedido = await SELECT.one.from(Pedidos_Reposicao).where({ ID: pedido_ID });
      if (!pedido) return req.error(404, `Pedido não encontrado`);
      if (pedido.status_code !== 'PENDENTE') return req.error(409, `Pedido já está com status ${pedido.status_code}`);
      await UPDATE(Pedidos_Reposicao).set({
        status_code  : 'RECUSADO',
        aprovador    : req.user?.id ?? 'gestor',
        dataDecisao  : new Date().toISOString(),
        justificativa: `[RECUSADO] ${motivo ?? ''}\n\n${pedido.justificativa ?? ''}`
      }).where({ ID: pedido_ID });
      if (this.emitPedidoStatusChanged)
        await this.emitPedidoStatusChanged({ ...pedido, status_code: 'RECUSADO' }).catch(() => {});
      return { status: 'RECUSADO', mensagem: motivo ?? 'Recusado pelo gestor' };
    });

    // Inicia o módulo de eventos de forma não-bloqueante para não atrasar o startup
    setupMessaging(this).catch(e => cds.log('messaging').warn('Event Mesh init deferred:', e.message));

    return super.init();
  }

  /**
   * Gera o próximo código de unidade no padrão uXXXX (u0001, u0002, ...).
   *
   * ⚠️ IMPLEMENTAÇÃO DEV (opção B): lê o maior código atual e incrementa.
   * Funciona em SQLite e é suficiente para desenvolvimento/demo, MAS em
   * ambiente multi-instância (Cloud Foundry) duas instâncias podem ler o
   * mesmo "último" e gerar códigos duplicados.
   *
   * 🔻 TROCAR NA MIGRAÇÃO PARA HANA:
   *   Substituir por uma SEQUENCE nativa do HANA para garantir unicidade
   *   sob concorrência. Exemplo:
   *     -- db/src/unidade-seq.hdbsequence  (ou via CREATE SEQUENCE)
   *     CREATE SEQUENCE MYFRANCHISE_UNIDADE_SEQ START WITH 1000 INCREMENT BY 1;
   *   E no handler:
   *     const [{ NEXT }] = await cds.run(
   *       `SELECT MYFRANCHISE_UNIDADE_SEQ.NEXTVAL AS NEXT FROM DUMMY`);
   *     return 'u' + String(NEXT).padStart(4, '0');
   *   A sequence do banco é atômica — elimina o risco de colisão.
   */
  async _proximoCodigoUnidade(Unidades) {
    // Busca o maior código no padrão uXXXX (ignora códigos legados como "147")
    const unidades = await SELECT.from(Unidades).columns('codigo');
    let maxNum = 0;
    for (const u of unidades) {
      const m = /^u(\d+)$/.exec(u.codigo ?? '');
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return 'u' + String(maxNum + 1).padStart(4, '0');
  }


  async _detectarDesvios(venda, { ItensCatalogo, RegrasCompliance, Desvios }) {
    const itemCatalogo = await SELECT.one(ItensCatalogo)
      .where({ sku: venda.sku, ativo: true });

    if (!itemCatalogo) {
      // SKU fora do catálogo = desvio de Mix
      await INSERT.into(Desvios).entries({
        unidade_ID:       venda.unidade_ID,
        tipo_code:        'MIX',
        sku:              venda.sku,
        nomeProduto:      venda.nomeProduto,
        precoPraticado:   venda.precoPraticado,
        percentualDesvio: 0,
        severidade_code:  'ALTA',
        status_code:      'ABERTO',
        dataDeteccao:     new Date().toISOString()
      });
      return;
    }

    const dentro = venda.precoPraticado >= itemCatalogo.precoMinimo
                && venda.precoPraticado <= itemCatalogo.precoMaximo;
    if (dentro) return;

    const pct = Math.abs(
      (venda.precoPraticado - itemCatalogo.precoSugerido) / itemCatalogo.precoSugerido * 100
    );

    const regra = await SELECT.one(RegrasCompliance)
      .where({ tipo_code: 'PRECO', ativa: true });

    const limiarAlta  = regra?.limiarAlta_pct  ?? 15;
    const limiarMedia = regra?.limiarMedia_pct ?? 5;
    const severidade  = pct >= limiarAlta  ? 'ALTA'
                      : pct >= limiarMedia ? 'MEDIA'
                      : 'BAIXA';

    await INSERT.into(Desvios).entries({
      unidade_ID:       venda.unidade_ID,
      tipo_code:        'PRECO',
      sku:              venda.sku,
      nomeProduto:      venda.nomeProduto,
      precoAutorizado:  itemCatalogo.precoSugerido,
      precoPraticado:   venda.precoPraticado,
      percentualDesvio: parseFloat(pct.toFixed(2)),
      severidade_code:  severidade,
      status_code:      'ABERTO',
      dataDeteccao:     new Date().toISOString()
    });
  }

  async _recalcularSaude(unidadeId, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade }) {
    const unidade = await SELECT.one(Unidades).where({ ID: unidadeId });
    if (!unidade) return;

    // Último KPI disponível
    const kpis = await SELECT.from(KPI_Unidade)
      .where({ unidade_ID: unidadeId })
      .orderBy('periodo desc')
      .limit(1);
    const kpi = kpis[0];

    // Benchmark do cluster
    const { Benchmark_Cluster } = this.entities;
    const benchmarks = await SELECT.from(Benchmark_Cluster)
      .where({ cluster_code: unidade.cluster_code })
      .orderBy('periodo desc')
      .limit(1);
    const benchmark = benchmarks[0];

    const performancePct = benchmark?.faturamentoMedio > 0 && kpi?.faturamento
      ? Math.min((kpi.faturamento / benchmark.faturamentoMedio) * 100, 100)
      : 50;

    // Contrato ativo
    const contratos = await SELECT.from(Contratos_Franquia)
      .where({ unidade_ID: unidadeId })
      .orderBy('dataVencimento desc')
      .limit(1);
    const contrato = contratos[0];
    const scoreContrato =
      contrato?.status_code === 'ATIVO'             ? 100 :
      contrato?.status_code === 'VENCENDOEM90DIAS'  ? 60  :
      contrato?.status_code === 'VENCENDOEM30DIAS'  ? 30  : 0;

    // Desvios abertos
    const desviosAbertos = await SELECT.from(Desvios)
      .where({ unidade_ID: unidadeId, status_code: { in: ['ABERTO', 'NOTIFICADO'] } });

    const compliancePct = Math.max(0, 100 - (desviosAbertos.length * 12));

    const scoreSaude = parseFloat(
      ((performancePct * 0.40) + (compliancePct * 0.40) + (scoreContrato * 0.20)).toFixed(2)
    );

    const qtdAlertasAlta  = desviosAbertos.filter(d => d.severidade_code === 'ALTA').length;
    const qtdAlertasMedia = desviosAbertos.filter(d => d.severidade_code === 'MEDIA').length;

    const scoreCriticality = scoreSaude < 45 ? 1 : scoreSaude < 70 ? 2 : 3;

    // Verificar se já existe registro de saúde para esta unidade
    const existente = await SELECT.one(Saude_Unidade).where({ unidade_ID: unidadeId });

    if (existente) {
      await UPDATE(Saude_Unidade)
        .where({ unidade_ID: unidadeId })
        .with({
          scoreSaude, compliancePct, performancePct,
          qtdAlertasAlta, qtdAlertasMedia, scoreCriticality,
          dataAtualizacao: new Date().toISOString()
        });
    } else {
      await INSERT.into(Saude_Unidade).entries({
        unidade_ID: unidadeId,
        scoreSaude, compliancePct, performancePct,
        qtdAlertasAlta, qtdAlertasMedia, scoreCriticality,
        dataAtualizacao: new Date().toISOString()
      });
    }
  }
};
