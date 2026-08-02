# RunMyFranchise — Infraestrutura de Eventos

**Status:** Em configuração — modo autônomo com SAP Advanced Event Mesh  
**Data:** Agosto 2026  
**Objetivo:** Tornar os agentes de IA completamente autônomos via eventos em tempo real

---

## 1. Visão Geral da Arquitetura de Eventos

```
Modificação no HANA (Estoque, Pedidos, Desvios)
    │
    ▼ [CAP emite evento via @cap-js/advanced-event-mesh]
SAP Advanced Event Mesh — MyFranchiseBroker (VPN: myfranchise)
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

### 2.1 SAP Advanced Event Mesh — MyFranchiseBroker

| Campo | Valor |
|---|---|
| **Nome** | MyFranchiseBroker |
| **Service ID** | `6tqai7d78ui` |
| **Host** | `mr-connection-wkfjn3mjitx.messaging.solace.cloud` |
| **VPN** | `myfranchise` |
| **Datacenter** | `eks-us-east-1a` (AWS US East) |
| **Tipo** | Developer (Broker 100) |
| **Admin Username** | `myfranchise-admin` |
| **SEMP Config URI** | `https://mr-connection-wkfjn3mjitx.messaging.solace.cloud:943/SEMP/v2/config` |
| **WebSocket (SMF)** | `wss://mr-connection-wkfjn3mjitx.messaging.solace.cloud:443` |

> ⚠️ Senhas armazenadas apenas no CF como user-provided service — nunca no código.

### 2.2 SAP Cloud Identity Services (IAS) — OAuth Client

| Campo | Valor |
|---|---|
| **CF Service Instance** | `aem-ias-oauth` (subaccount: `sa-build-platform-org / DEV`) |
| **xsappname** | `aem-oauth-runmyfranchise` |
| **Client ID** | `d39fea30-40d9-4bc7-94c5-02fca4bec365` |
| **Token Endpoint** | `https://a5adbsfjs.accounts.cloud.sap/oauth2/token` |
| **IAS Tenant** | `a5adbsfjs.accounts.cloud.sap` |
| **Grant Type** | `client_credentials` |

> Client secret armazenado apenas como CF service key (`aem-ias-key`).

### 2.3 CF User-Provided Services

| Nome | Subaccount | Uso |
|---|---|---|
| `advanced-event-mesh` | `sa-build-platform-org / DEV` | Binding do CAP ao broker Solace |
| `myfranchise-aem` | `sa-build-platform-org / DEV` | Credenciais AEM (backup) |
| `myfranchise-eventmesh` | `sa-build-platform-org / DEV` | Credenciais Event Mesh clássico |

---

## 3. Configuração OAuth no Broker (SEMP API)

### 3.1 O que foi configurado via SEMP

Executado no broker `AMER-USEast-Broker-00` (para teste) e no `MyFranchiseBroker`:

```bash
BROKER_HOST="mr-connection-wkfjn3mjitx.messaging.solace.cloud:943"
VPN="myfranchise"
IAS_URL="https://a5adbsfjs.accounts.cloud.sap"

# OAuth Profile criado
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

# Profile definido como default
curl -X PATCH "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"authenticationOauthDefaultProfileName": "ias_runmyfranchise"}'

# Client username criado para o CAP app
curl -X POST "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}/clientUsernames" \
  -u "${MGMT_USER}:${MGMT_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"clientUsername": "d39fea30-40d9-4bc7-94c5-02fca4bec365", "enabled": true}'
```

### 3.2 Pendente — Habilitar OAuth no VPN

O comando abaixo requer um usuário com permissão de admin de cluster (não o vpn-admin):

```bash
curl -X PATCH "https://${BROKER_HOST}/SEMP/v2/config/msgVpns/${VPN}" \
  -u "${CLUSTER_ADMIN_USER}:${CLUSTER_ADMIN_PASS}" \
  -H "Content-Type: application/json" \
  -d '{"authenticationOauthEnabled": true}'
```

**Alternativa:** Habilitar via Cluster Manager UI → Open Broker Manager → VPN → Authentication → Enable OAuth.

---

## 4. Configuração CAP

### 4.1 package.json

```json
{
  "dependencies": {
    "@cap-js/advanced-event-mesh": "^1.0.0"
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

> Em produção, o CAP encontra automaticamente o serviço `advanced-event-mesh` pelo nome do CF binding.

### 4.3 User-provided service — formato esperado pelo plugin

```json
{
  "authentication-service": {
    "tokenendpoint": "https://a5adbsfjs.accounts.cloud.sap/oauth2/token",
    "clientid": "d39fea30-40d9-4bc7-94c5-02fca4bec365",
    "clientsecret": "<armazenado no CF>"
  },
  "endpoints": {
    "advanced-event-mesh": {
      "uri": "wss://mr-connection-wkfjn3mjitx.messaging.solace.cloud:443",
      "smf_uri": "wss://mr-connection-wkfjn3mjitx.messaging.solace.cloud:443"
    }
  },
  "vpn": "myfranchise"
}
```

### 4.4 mta.yaml — binding

```yaml
- name: myfranchise-srv
  requires:
    - name: advanced-event-mesh   # user-provided service
```

```yaml
resources:
  - name: advanced-event-mesh
    type: org.cloudfoundry.user-provided-service
```

---

## 5. Código de Eventos (srv/events/messaging.js)

### 5.1 Tópicos e handlers

```javascript
const TOPIC_ESTOQUE = 'myfranchise/runmyfranchise/v1/Estoque/Changed';
const TOPIC_PEDIDO  = 'myfranchise/runmyfranchise/v1/Pedido/StatusChanged';
const TOPIC_DESVIO  = 'myfranchise/runmyfranchise/v1/Desvio/Detectado';

// Handler autônomo — dispara agente se ruptura detectada
messaging.on(TOPIC_ESTOQUE, async (msg) => {
  if (msg.data.status_code === 'RUPTURA' || msg.data.status_code === 'ATENCAO') {
    // Verifica se já existe PENDENTE antes de criar
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

## 6. Status e Próximos Passos

| Item | Status | Próximo passo |
|---|---|---|
| MyFranchiseBroker provisionado | ✅ | — |
| OAuth Profile `ias_runmyfranchise` criado | ✅ | — |
| Client username CAP criado | ✅ | — |
| `authenticationOauthEnabled: true` no VPN | ✅ | Habilitado via Broker Manager UI |
| User-provided service com credenciais IAS+Solace | ✅ | `advanced-event-mesh` atualizado |
| Deploy CAP com `kind: advanced-event-mesh` | ❌ BLOQUEIO | Plugin exige instância gerenciada no mesmo espaço CF — não aceita user-provided service cross-subaccount |
| Instância gerenciada AEM no espaço DEV | ⏳ | Provisionar `aem-validation-service` na subaccount `sa-build-platform-org` ou usar Service Manager para expor cross-subaccount |
| Teste end-to-end: venda → ruptura → pedido automático | ⏳ | Após instância gerenciada disponível |
| Integration Suite iFlow consumindo tópico | ⏳ | Fase 2 |
| SBPA aprovação automática via evento | ⏳ | Fase 3 |

### Detalhe do Bloqueio

O plugin `@cap-js/advanced-event-mesh` v1.0.0 valida o VCAP_SERVICES buscando especificamente um binding com `label: "advanced-event-mesh"` e `plan: "aem-validation-service"` — uma instância **gerenciada** pelo SAP Service Manager. Um `user-provided service` não tem esses campos e é rejeitado com:

```
Error: Missing credentials for SAP Integration Suite, advanced event mesh with plan "aem-validation-service"
```

**Solução:** Provisionar o `aem-validation-service` diretamente na subaccount `sa-build-platform-org` (verificar entitlements) ou usar o SAP Service Manager para expor a instância da subaccount Presales BR USA como serviço gerenciado no espaço DEV.

---

## 7. Referências

- [CAP Advanced Event Mesh Plugin](https://cap.cloud.sap/docs/guides/events/is-aem)
- [Solace SEMP v2 API](https://docs.solace.com/API-Developer-Online-Ref-Documentation/swagger-ui/software-broker/config/index.html)
- [SAP Community — AEM OAuth Setup](https://community.sap.com/t5/technology-blog-posts-by-sap/securing-sap-advanced-event-mesh-oauth-configuration-and-semp-api/ba-p/13750269)
- [IAS OAuth2 for AEM](https://community.sap.com/t5/sap-cap-blog-posts/complete-guide-setting-up-cap-plugin-for-advanced-event-mesh-with-oauth/ba-p/14264212)
