# scripts/ops — Ferramentas de Manutenção Manual

Scripts executados **manualmente** por operadores. Nenhum deles é chamado pela aplicação em produção nem faz parte do fluxo de demo.

| Script | Quando usar |
|---|---|
| `sync-jg-to-mf.py` | Copia todas as tabelas do schema `RUNMYFRANCHISE_JG` (Juliana) para `RUNMYFRANCHISE_MF`. Usar quando o JG tiver dados atualizados que precisam ser espelhados no MF. |
| `sync-runmyfranchise-mf.py` | Alternativa ao anterior: sincroniza do schema HDI (via RT user + CF service key) para o MF via DBADMIN. |
| `clean-hana-seed-tables.py` | Limpa tabelas de seed HDI antes de um re-deploy que causaria unique-constraint. Executar uma vez antes de `cf deploy` quando necessário. **Atenção:** referencia o schema HDI antigo (`MYFRANCHISE_*`), não as tabelas flat `T_*`/`M_*`. |
| `create_article_image_table.py` | DDL one-time: criou a tabela `M_ARTICLE_IMAGE` no `RUNMYFRANCHISE_MF`. Já foi executado — não executar novamente. |

## O que controla o cenário BAD/GOOD na demo

O switch de cenário **não usa esses scripts**. É feito pelo app `demo-admin` (botões BAD/GOOD), que chama `POST /admin/switch-scenario` no `mcp-server.js`, que executa SQL direto via DBADMIN na tabela `M_DEMO_STATE`.
