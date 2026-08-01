[← README](../../README.md)

# Pré-requisitos para instalar o Joule no SAP Build Work Zone, Standard Edition

**Contexto:** Onboarding do SAP Joule integrado ao SAP Build Work Zone, Standard Edition  
**Fonte:** Documentação oficial SAP — Joule Onboarding Guide (Customer-Managed Provisioning)  
**Data:** Julho 2026

---

## 1. Pré-requisitos de Conta e Licenciamento

| Requisito | Detalhe |
|---|---|
| **SAP BTP Enterprise Account** | Global account com license type `CUSTOMER` (não trial) |
| **SAP AI Units** | SKU 8019164 — necessários para capabilities Premium; Base capabilities não exigem AI Units |
| **Entitlement: Joule** | Atribuído na global account e distribuído à subconta |
| **Entitlement: SAP Build Work Zone, standard edition** | Plano `foundation` ou `standard` — todas as global accounts enterprise já incluem o plano `foundation` |
| **Datacenter suportado** | EU10, EU11, US10, AP10, JP10 ou EU20 |

---

## 2. Pré-requisitos de Identidade (obrigatórios)

| Requisito | Detalhe |
|---|---|
| **SAP Cloud Identity Services (IAS)** | Tenant de Identity Authentication ativo e configurado |
| **Trust configurada na subconta BTP** | Trust entre SAP Authorization & Trust Management Service (XSUAA) e o tenant IAS |
| **Work Zone usando IAS como IdP** | O SAP Build Work Zone, standard edition **deve** estar configurado para usar Identity Authentication (não o IdP default do BTP). Se ainda usa o default, é necessário [migrar para IAS](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/switching-to-sap-cloud-identity-services-identity-authentication) |
| **Mesmo tenant IAS** | Se Joule e Work Zone estiverem em subcontas diferentes, ambas devem apontar para o **mesmo tenant IAS** |

---

## 3. Pré-requisitos de Infraestrutura BTP

| Requisito | Detalhe |
|---|---|
| **Subconta com entitlements** | A subconta deve ter os entitlements para Joule e Work Zone Standard |
| **Subscription ativa do Work Zone** | O Work Zone Standard já deve estar provisionado (subscription criada e instância de serviço existente) |
| **Joule pode usar uma instância existente** | A SAP recomenda instalar o Joule numa instância de Work Zone já existente — ele não cria uma nova. Joule interage com **apenas uma** instância de Work Zone |

---

## 4. Processo de Ativação

1. **Validar entitlements** na global account (Joule + Work Zone Standard)
2. **Confirmar que Work Zone Standard está usando IAS** como IdP
3. **Executar o Joule Booster** no BTP Cockpit:
   - Navegar para a subconta → Boosters → procurar "Joule"
   - Na tela "Select Integrations", selecionar os produtos SAP que serão integrados
   - O booster cria automaticamente as subscriptions, instâncias de serviço, destinations e formations necessárias
4. **Não selecionar Standard e Advanced simultaneamente** — isso causa falha. Apenas uma edição por subconta.

---

## 5. Notas Importantes

- **Se o Joule já foi configurado antes**, não é possível executar o booster novamente. Nesse caso, os sistemas devem ser adicionados manualmente à formation existente.
- **O Joule usa o navigation service** do Work Zone Standard para resolver intent-based navigation e configurar content providers — por isso a dependência.
- **Mesmo plano para app e serviço**: ao configurar o Work Zone Standard, o plano escolhido para a subscription deve ser o mesmo usado na service instance (foundation ou standard).

---

## 6. Cenário: Booster já executado — Adicionar sistemas manualmente à Formation

Quando o booster já foi executado antes, ele retorna o erro:

> *"Could not include system das-application-ias to the formation because it conflicts with the following rule: System das-application-ias can be part of only one formation of type Integration with Joule."*

A solução é **incluir manualmente os sistemas na formation existente** via o BTP Cockpit.

### Passo a passo

1. **Acesse o BTP Cockpit** na sua **global account** (não na subconta)
2. **Navegue até System Landscape → Formations**
   - Menu lateral esquerdo → **System Landscape** → aba **Formations**
3. **Localize a formation do Joule**
   - Procure a formation do tipo **"Integration with Joule"**
   - Ela já existe porque o booster foi executado anteriormente
4. **Clique em "Include Systems"** (canto superior direito da formation)
5. **Selecione os sistemas que deseja adicionar**
   - Nessa tela, você verá todos os sistemas registrados na sua global account
   - Selecione o(s) sistema(s) que precisa incluir (ex.: SAP Build Work Zone, S/4HANA, SuccessFactors, etc.)
6. **Clique em "Next Step" → "Include"**
   - O sistema será adicionado à lista de sistemas da formation
7. **Aguarde o status ficar "Ready"**
   - A formation pode ficar em estado "Synchronizing" por alguns minutos

### Regras importantes

| Regra | Detalhe |
|---|---|
| **Um sistema por formation Joule** | Cada sistema só pode pertencer a **uma** formation do tipo "Integration with Joule" na global account |
| **Um Joule por formation** | Cada formation pode conter apenas **um** sistema do tipo Joule |
| **Sistema não aparece na lista?** | Se o sistema SAP não aparece na página Systems, ele pode estar associado a outro customer ID. Nesse caso, adicione-o manualmente via **System Landscape → Systems → Register** |
| **Work Zone: apenas uma edição** | Não inclua Standard e Advanced na mesma formation — causa conflito |

### Se precisar remover e re-adicionar

Em alguns cenários (como reconfigurar a integração), é possível:

1. **Excluir o sistema da formation** (Exclude)
2. **Re-incluir** com a configuração correta

Isso é útil quando a formation está em estado inconsistente ou quando o sistema precisa ser re-registrado.

---

## Referências

- [Prerequisites for Customer Managed Provisioning](https://help.sap.com/docs/JOULE/6189c8655c484916bb8eb767126a653a/d42f2b7768f44b98a91f2d4178e8593c.html)
- [SAP Build Work Zone — Joule Integration](https://help.sap.com/docs/JOULE/6189c8655c484916bb8eb767126a653a/0e8ee589267d4a1598bcf8d434755c93.html)
- [Run the Joule Booster](https://help.sap.com/docs/JOULE/6189c8655c484916bb8eb767126a653a/34157c476600476cb9180062db6002af.html)
- [Switching to Identity Authentication](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/switching-to-sap-cloud-identity-services-identity-authentication)
- [Enabling Joule — Creating Formations](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/e208f1fe75b748cb953b9e9db4b91bec.html)
- [Formations — Extensibility Concepts](https://help.sap.com/docs/btp/sap-business-technology-platform/extensibility-concepts?version=Cloud#formations)
- [Adding, Registering and Deregistering Systems](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/2ffdaff0f1454acdb046876045321c91.html)


---

[← Voltar ao README](../../README.md)
