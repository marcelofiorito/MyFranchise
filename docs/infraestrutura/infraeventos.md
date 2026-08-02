# RunMyFranchise — Infraestrutura de Eventos

**Status:** Em configuração final — SAP Advanced Event Mesh (novo tenant dedicado)
**Data:** Agosto 2026
**Objetivo:** Tornar os agentes de IA completamente autônomos via eventos em tempo real

---

## 1. Visão Geral da Arquitetura de Eventos

```
Modificação no HANA (Estoque, Pedidos, Desvios)
    │
    ▼ [CAP emite evento via @cap-js/advanced-event-mesh]
SAP Advanced Event Mesh — MyFranchiseBroker (VPN: myfranchise)
Tenant dedicado: subaccount Presales Build Platform
    │
    ├──► CAP consome evento → Agente de Reposição verifica cobertura
    │         └── Se ruptura → cria Pedido PENDENTE automaticamente
    │
    ├──► Integration Suite iFlow (perspectiva do integrador na demo)
    │         └── Log/Monitor em tempo real
    │
    └──► (fase 2) SBPA — aprovação automática de pedidos de baixo valor
```

### Tópicos publicados

| Tópico | Trigger | Consumidor |
|---|---|---|
| `myfranchise/runmyfranchise/v1/Estoque/Changed` | Modificação de saldo (simularRecebimento, resetarDemo) | Agente de Reposição |
| `myfranchise/runmyfranchise/v1/Pedido/StatusChanged` | Aprovação/Rejeição de pedido | Log / SBPA (fase 2) |
| `myfranchise/runmyfranchise/v1/Desvio/Detectado` | Desvio detectado após venda | Recálculo de score |

---

## 2. Recursos Criados

### 2.1 SAP Advanced Event Mesh — MyFranchiseBroker (NOVO — tenant dedicado)

| Campo | Valor |
|---|---|
| **Nome** | MyFranchiseBroker |
| **Service ID** | `bflbp3sasmb` |
| **Host (SMF)** | `wss://mr-connection-yfqw57w6xwk.messaging.solace.cloud:443` |
| **Host (SEMP/HTTPS)** | `https://mr-connection-yfqw57w6xwk.messaging.solace.cloud:943` |
| **VPN** | `myfranchise` |
| **Datacenter** | `eks-us-east-1a` (AWS US East) |
| **Tipo** | Developer — Broker 100 |
| **Tenant Solace** | `qy37d5a9chh` (dedicado à subaccount Presales Build Platform) |
| **SEMP Config URI** | `https://mr-connection-yfqw57w6xwk.messaging.solace.cloud:943/SEMP/v2/config` |

> ⚠️ Senhas armazenadas apenas no CF como user-provided service — nunca no código.

### 2.2 Subscription AEM na subaccount Presales Build Platform

| Campo | Valor |
|---|---|
| **Subaccount** | `0a3bf8c0-f8f0-438e-8326-50322e696406` (Presales Build Platform) |
| **App** | `integration-suite-advanced-event-mesh` |
| **Plano subscription** | `default` (console web — Cluster Manager) |
| **Plano service** | `broker-100` (quota: 1 de 2 brokers disponíveis) |
| **URL Cluster Manager** | `https://us10.console.pubsub.em.services.cloud.sap` |

### 2.3 SAP Cloud Identity Services (IAS) — OAuth Client

| Campo | Valor |
|---|---|
| **CF Service Instance** | `aem-ias-oauth` (subaccount: `sa-build-platform-org / DEV`) |
| **xsappname** | `aem-oauth-runmyfranchise` |
| **Client ID** | `d39fea30-40d9-4bc7-94c5-02fca4bec365` |
| **Token Endpoint** | `https://a5adbsfjs.accounts.cloud.sap/oauth2/token` |
| **IAS Tenant** | `a5adbsfjs.accounts.cloud.sap` |
| **Grant Type** | `client_credentials` |

> Client secret armazenado apenas como CF service key (`aem-ias-key`).

### 2.4 CF Services — subaccount sa-build-platform-org / DEV

| Nome CF | Tipo | Uso |
|---|---|---|
| `advanced-event-mesh` | user-provided | Credenciais IAS+Solace para o plugin CAP |
| `myfranchise-aem-managed` | managed (aem-validation-service-plan) | Validação do broker (obrigatório pelo plugin) |
| `aem-ias-oauth` | managed (identity/application) | OAuth client IAS |

---

## 3. Configuração OAuth no Broker (SEMP API)

Executado no `MyFranchiseBroker` via SEMP:

```bash
BROKER_HOST="mr-connection-yfqw57w6xwk.messaging.solace.cloud:943"
VPN="myfranchise"
IAS_URL="https://a5adbsfjs.accounts.cloud.sap"
IAS_CLIENT_ID="d39fea30-40d9-4bc7-94c5-02fca4bec365"

# PASSO 1: Habilitar OAuth no VPN ✅
curl -X PATCH "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"authenticationOauthEnabled": true}'

# PASSO 2: Criar OAuth Profile IAS ✅
curl -X POST "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}/authenticationOauthProfiles" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d "{
    \"oauthProfileName\": \"ias_runmyfranchise\",
    \"oauthRole\": \"resource-server\",
    \"issuer\": \"${IAS_URL}\",
    \"resourceServerRequiredIssuer\": \"${IAS_URL}\",
    \"endpointJwks\": \"${IAS_URL}/oauth2/certs\",
    \"resourceServerValidateAudienceEnabled\": false,
    \"resourceServerValidateScopeEnabled\": false,
    \"resourceServerValidateIssuerEnabled\": true,
    \"enabled\": true
  }"

# PASSO 3: Definir como default ✅
curl -X PATCH "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"authenticationOauthDefaultProfileName": "ias_runmyfranchise"}'

# PASSO 4: Criar client username para CAP ✅
curl -X POST "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}/clientUsernames" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"clientUsername": "d39fea30-40d9-4bc7-94c5-02fca4bec365", "enabled": true}'
```

---

## 4. Configuração CAP

### 4.1 package.json

```json
{
  "dependencies": {
    "@cap-js/advanced-event-mesh": "^1.0.0",
    "@sap/xb-msg-amqp-v100": "^0.9.58"
  }
}
```

### 4.2 .cdsrc.json (messaging)

```json
{
  "requires": {
    "messaging": {
      "[production]": {
        "kind": "advanced-event-mesh"
      },
      "[development]": {
        "kind": "file-based-messaging"
      },
      "format": "cloudevents"
    }
  }
}
```

### 4.3 User-provided service `advanced-event-mesh` — formato

```json
{
  "authentication-service": {
    "tokenendpoint": "https://a5adbsfjs.accounts.cloud.sap/oauth2/token",
    "clientid": "d39fea30-40d9-4bc7-94c5-02fca4bec365",
    "clientsecret": "<armazenado no CF>"
  },
  "endpoints": {
    "advanced-event-mesh": {
      "uri": "https://mr-connection-yfqw57w6xwk.messaging.solace.cloud:943",
      "smf_uri": "wss://mr-connection-yfqw57w6xwk.messaging.solace.cloud:443"
    }
  },
  "vpn": "myfranchise"
}
```

### 4.4 Como o plugin funciona (fluxo interno)

O plugin `@cap-js/advanced-event-mesh` requer **dois bindings** simultaneamente:

1. **`advanced-event-mesh`** (user-provided) → credenciais IAS + Solace SMF para conexão de mensagens
2. **`aem-validation-service-plan`** (managed) → credenciais handshake para validar o broker via API SAP

O plugin usa o binding `aem-validation-service-plan` para chamar `em-pubsub-broker.mesh.cf.us10.hana.ondemand.com/handshake` e confirmar que o broker é gerenciado pela SAP. Sem esse binding, a inicialização falha.

### 4.5 mta.yaml — bindings do myfranchise-srv

```yaml
- name: myfranchise-srv
  requires:
    - name: myfranchise-db
    - name: myfranchise-uaa
    - name: myfranchise-aicore
    - name: myfranchise-aem-managed    # aem-validation-service-plan (validação)
    - name: advanced-event-mesh        # user-provided (credenciais IAS+Solace)
```

---

## 5. Código de Eventos (srv/events/messaging.js)

### 5.1 Tópicos e handlers autônomos

```javascript
const TOPIC_ESTOQUE = 'myfranchise/runmyfranchise/v1/Estoque/Changed';
const TOPIC_PEDIDO  = 'myfranchise/runmyfranchise/v1/Pedido/StatusChanged';
const TOPIC_DESVIO  = 'myfranchise/runmyfranchise/v1/Desvio/Detectado';

// Handler autônomo — dispara agente se ruptura detectada
messaging.on(TOPIC_ESTOQUE, async (msg) => {
  if (msg.data.status_code === 'RUPTURA' || msg.data.status_code === 'ATENCAO') {
    const existing = await SELECT.one.from(Pedidos_Reposicao)
      .where({ unidade_ID: msg.data.unidade_ID, sku: msg.data.sku, status_code: 'PENDENTE' });
    if (!existing) {
      await reposicao.gerarParaUnidade(srv, msg.data.unidade_ID);
    }
  }
});
```

### 5.2 Pontos de emissão

| Onde | Evento emitido |
|---|---|
| `after CREATE VendaPraticada` (se desvio detectado) | `Desvio/Detectado` |
| `simularRecebimento` (após UPDATE estoque) | `Estoque/Changed` |
| `aprovar` (bound action) | `Pedido/StatusChanged` |
| `recusar` (bound action) | `Pedido/StatusChanged` |

---

## 6. Limpeza — Tenant Antigo (SAP Presales BR USA)

Recursos que podem ser deletados do tenant antigo (`gkd3k1qalf1`):

| Recurso | ID | Ação |
|---|---|---|
| MyFranchiseBroker (antigo) | `6tqai7d78ui` | ✅ Já deletado |
| `myfranchise-aem-key` em `aem-validation-instance` | — | Pode deletar |
| `aem-ias-oauth` (se não usado por outro projeto) | — | Pode deletar após validação |

---

## 7. Status e Próximos Passos

| Item | Status | Observação |
|---|---|---|
| Tenant AEM dedicado provisionado | ✅ | Subaccount Presales Build Platform |
| MyFranchiseBroker criado | ✅ | id: `bflbp3sasmb`, VPN: `myfranchise` |
| OAuth habilitado no VPN | ✅ | Via SEMP |
| OAuth Profile `ias_runmyfranchise` criado | ✅ | IAS como resource server |
| Client username CAP criado | ✅ | `d39fea30-40d9-4bc7-94c5-02fca4bec365` |
| User-provided service com `uri: https://` | ✅ | Corrigido de `wss://` para `https://` no `uri` |
| Deploy CAP com `kind: advanced-event-mesh` | ⏳ | Restage em andamento |
| Teste end-to-end: venda → ruptura → pedido automático | ⏳ | Após deploy bem-sucedido |
| Limpeza recursos tenant antigo | ⏳ | Após validação |
| Integration Suite iFlow consumindo tópico | ⏳ | Fase 2 |
| SBPA aprovação automática via evento | ⏳ | Fase 3 |

---

## 8. Referências

- [CAP Advanced Event Mesh Plugin](https://cap.cloud.sap/docs/guides/events/is-aem)
- [Solace SEMP v2 API](https://docs.solace.com/API-Developer-Online-Ref-Documentation/swagger-ui/software-broker/config/index.html)
- [SAP Community — AEM OAuth Setup](https://community.sap.com/t5/technology-blog-posts-by-sap/securing-sap-advanced-event-mesh-oauth-configuration-and-semp-api/ba-p/13750269)
- [IAS OAuth2 for AEM](https://community.sap.com/t5/sap-cap-blog-posts/complete-guide-setting-up-cap-plugin-for-advanced-event-mesh-with-oauth/ba-p/14264212)
