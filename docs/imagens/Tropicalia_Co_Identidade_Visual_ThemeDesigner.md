# Tropicália Co. — Identidade Visual & Guia SAP Theme Designer

**Versão:** 1.0 · **Data:** Agosto 2026  
**Plataforma:** SAP Work Zone Advanced  
**Fonte:** Extraído da apresentação *RunMyFranchise* (Agosto 2026)

---

## 1. Visão Geral da Marca

| Atributo | Valor |
|---|---|
| **Nome** | Tropicália Co. |
| **Tagline** | *"Summer has a homeland"* |
| **Essência** | Cores vibrantes, estampas tropicais e uma energia solar que conecta culturas |
| **Categoria** | Moda lifestyle (verão, praia, lifestyle latino-americano) |
| **Tom de voz** | Vibrante, próximo, autêntico, com raízes brasileiras e alcance global |

---

## 2. Paleta de Cores

### 2.1 Cores Primárias

| Token (nome sugerido) | Nome | Hex | RGB | Uso |
|---|---|---|---|---|
| `--brand-green-dark` | Verde Floresta | `#0B3D2E` | 11, 61, 46 | Shell bar, fundos de seção, headers |
| `--brand-coral` | Coral Tropical | `#FF5A3C` | 255, 90, 60 | Botões emphasized, CTAs, links, alertas |
| `--brand-yellow` | Amarelo Solar | `#FFCC2E` | 255, 204, 46 | Badges, estados selecionados, ícones de destaque |
| `--brand-bg-light` | Areia Tropical | `#FDF6EC` | 253, 246, 236 | Fundo de páginas, cards, áreas de conteúdo |
| `--brand-text-dark` | Noite Tropical | `#12241D` | 18, 36, 29 | Texto principal, títulos sobre fundo claro |

### 2.2 Cores Secundárias

| Token (nome sugerido) | Nome | Hex | RGB | Uso |
|---|---|---|---|---|
| `--brand-teal` | Turquesa | `#22B8B0` | 34, 184, 176 | Mensagens informativas, links secundários, chips |
| `--brand-green-medium` | Verde Médio | `#1F7A4D` | 31, 122, 77 | Mensagens de sucesso, status positivo |
| `--brand-coral-hover` | Coral Suave | `#F46B47` | 244, 107, 71 | Hover/pressed de botões primários |
| `--brand-beige` | Bege Natural | `#D9C9A8` | 217, 201, 168 | Bordas suaves, divisores, superfícies neutras |
| `--brand-green-deep` | Verde Profundo | `#00492C` | 0, 73, 44 | Variante escura para contraste máximo |

### 2.3 Hierarquia Visual

```
FUNDOS           TEXTO PRINCIPAL   AÇÕES / CTAs      DESTAQUES
━━━━━━━━━━━━━    ━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━    ━━━━━━━━━
#FDF6EC          #12241D           #FF5A3C           #FFCC2E
Areia Tropical   Noite Tropical    Coral Tropical    Amarelo Solar
(light pages)    (on light bg)     (primary CTA)     (badges/tags)

#0B3D2E          #FDF6EC           #22B8B0
Verde Floresta   Areia (on dark)   Turquesa
(dark sections)                    (info/secondary)
```

---

## 3. Tipografia

> **Nota:** A apresentação usa fontes do sistema (Calibri). Para o SAP Work Zone, recomenda-se usar as fontes padrão do SAP Fiori (72 / 72 Brand) ou Google Fonts compatíveis.

### 3.1 Recomendação para Work Zone

| Papel | Fonte Recomendada | Fallback SAP |
|---|---|---|
| **Títulos / Headings** | *Playfair Display* (Google Fonts) ou **72 Bold** | `SAP-icons`, 72 |
| **Corpo / Body** | *DM Sans* (Google Fonts) ou **72 Regular** | 72 |
| **Monospace / Dados** | *DM Mono* ou **Courier New** | — |

> Para uma implantação mais simples e 100% alinhada ao SAP Fiori, use exclusivamente a fonte **72** (padrão SAP). Ela garante compatibilidade total com os componentes do Work Zone.

---

## 4. Configuração no SAP UI Theme Designer

### 4.1 Como Acessar

1. Acesse o **SAP Work Zone Advanced** como Administrador
2. Vá em **Site Manager → Administração → UI Theme Designer**
3. Clique em **"Create New Theme"** (ou edite um tema existente)
4. Selecione o tema base: **`sap_horizon`** (recomendado) ou `sap_fiori_3`
5. Clique em **"Customize"**

---

### 4.2 Parâmetros de Cor — Mapeamento Completo

#### 4.2.1 Parâmetros Principais (Quick Theming)

No painel de **Quick Theming** do Theme Designer, configure:

| Parâmetro UI Theme Designer | Cor Tropicália | Hex | Justificativa |
|---|---|---|---|
| `Brand Color` | Coral Tropical | `#FF5A3C` | Cor de ação principal da marca |
| `Background Color` | Areia Tropical | `#FDF6EC` | Fundo quente, acolhedor |
| `Shell Bar Background` | Verde Floresta | `#0B3D2E` | Header com identidade forte da marca |
| `Shell Bar Text/Icon Color` | Areia Tropical | `#FDF6EC` | Contraste sobre verde escuro |

---

#### 4.2.2 Parâmetros Avançados (Expert Mode)

Acesse o **Expert Mode** no Theme Designer e ajuste os seguintes tokens SAP:

```
── SHELL & NAVIGATION ─────────────────────────────────────────
sapShellColor                     #0B3D2E   Verde Floresta
sapShellTextColor                 #FDF6EC   Areia Tropical
sapShellInteractiveTextColor      #FFCC2E   Amarelo Solar
sapShellHoverBackground           #12241D   Noite Tropical
sapShellActiveBackground          #00492C   Verde Profundo
sapShellBorderColor               #1F7A4D   Verde Médio

── BRAND & HIGHLIGHT ───────────────────────────────────────────
sapBrandColor                     #FF5A3C   Coral Tropical
sapHighlightColor                 #FF5A3C   Coral Tropical
sapSelectedColor                  #FF5A3C   Coral Tropical
sapActiveColor                    #F46B47   Coral Suave
sapHoverColor                     #FDF6EC   Areia (hover bg)

── BUTTONS (Emphasized) ────────────────────────────────────────
sapButton_Emphasized_Background        #FF5A3C
sapButton_Emphasized_BorderColor       #FF5A3C
sapButton_Emphasized_TextColor         #FFFFFF
sapButton_Emphasized_Hover_Background  #F46B47
sapButton_Emphasized_Active_Background #0B3D2E

── BUTTONS (Regular) ───────────────────────────────────────────
sapButton_Background               #FFFFFF
sapButton_BorderColor              #0B3D2E
sapButton_TextColor                #0B3D2E
sapButton_Hover_Background         #FDF6EC
sapButton_Hover_BorderColor        #FF5A3C

── LINKS ───────────────────────────────────────────────────────
sapLinkColor                       #FF5A3C
sapLinkHoverColor                  #F46B47
sapLinkActiveColor                 #0B3D2E
sapLinkVisitedColor                #22B8B0

── BACKGROUNDS ─────────────────────────────────────────────────
sapBackgroundColor                 #FDF6EC   Areia Tropical
sapBaseColor                       #FFFFFF   Branco puro (cards)
sapTileBackground                  #FFFFFF
sapPageHeader_Background           #0B3D2E
sapPageHeader_TextColor            #FDF6EC
sapPageFooter_Background           #12241D
sapPageFooter_TextColor            #D9C9A8

── TEXT ────────────────────────────────────────────────────────
sapTextColor                       #12241D   Noite Tropical
sapTitleColor                      #0B3D2E   Verde Floresta
sapContent_LabelColor              #0B3D2E
sapContent_IconColor               #FF5A3C

── SEMANTIC COLORS ─────────────────────────────────────────────
sapSuccessColor                    #1F7A4D   Verde Médio
sapSuccessBorderColor              #1F7A4D
sapSuccessBackground               #E8F5EE

sapWarningColor                    #FFCC2E   Amarelo Solar
sapWarningBorderColor              #E5A800   (escurecer 10%)
sapWarningBackground               #FFF8DC

sapErrorColor                      #D0360D   (vermelho padrão SAP)
sapErrorBackground                 #FFDBD9

sapInformationColor                #22B8B0   Turquesa
sapInformationBackground           #E0F7F6

── ACCENTS ─────────────────────────────────────────────────────
sapAccentColor1                    #FF5A3C   Coral Tropical
sapAccentColor2                    #FFCC2E   Amarelo Solar
sapAccentColor3                    #22B8B0   Turquesa
sapAccentColor4                    #0B3D2E   Verde Floresta
sapAccentColor5                    #1F7A4D   Verde Médio
sapAccentColor6                    #D9C9A8   Bege Natural
```

---

### 4.3 Configuração do Shell Bar (SAP Work Zone)

No Work Zone, o **Shell Bar** (barra superior de navegação) pode ter configuração separada via **Site Settings**:

1. **Site Manager → Settings → Appearance**
2. Configure:
   - **Header Background Color:** `#0B3D2E`
   - **Header Text Color:** `#FDF6EC`
   - **Site Title:** `Tropicália Co.`
   - **Logo:** Faça upload de logo com fundo transparente

---

### 4.4 Work Zone Content Package — CSS Customizado

Para ajustes que o Theme Designer não cobre, use o campo de **CSS customizado** disponível em **Site Settings → Custom CSS**:

```css
/* === TROPICÁLIA CO. — Custom CSS para SAP Work Zone Advanced === */

/* Shell Bar refinements */
.sapUshellShellHead {
  background-color: #0B3D2E !important;
  border-bottom: 3px solid #FFCC2E !important;
}

/* Título do site na shell bar */
.sapUshellAppTitle {
  color: #FDF6EC !important;
  font-weight: 700 !important;
  letter-spacing: 0.05em;
}

/* Cards de launchpad — borda de destaque */
.sapUshellTile:hover {
  border-top: 3px solid #FF5A3C !important;
  box-shadow: 0 4px 12px rgba(11, 61, 46, 0.15) !important;
}

/* Botão de ação primário (emphasized) */
.sapMBtnEmphasized {
  background-color: #FF5A3C !important;
  border-color: #FF5A3C !important;
  color: #FFFFFF !important;
}

.sapMBtnEmphasized:hover {
  background-color: #F46B47 !important;
}

/* Page background */
.sapUiBody, .sapUShell-base {
  background-color: #FDF6EC !important;
}

/* Links */
a, .sapMLnk {
  color: #FF5A3C !important;
}

/* Status badges */
.sapMObjectStatus.sapMObjectStatusSuccess .sapMObjectStatusText {
  color: #1F7A4D !important;
}

/* Notification badges na shell */
.sapUshellNotificationBadge {
  background-color: #FFCC2E !important;
  color: #12241D !important;
}
```

> **⚠ Atenção:** CSS customizado deve ser testado em cada atualização do Work Zone, pois classes internas podem mudar.

---

## 5. Ícones e Iconografia

Use exclusivamente o conjunto **SAP Icons (SAP-icons)** para garantir consistência com o Fiori.

| Contexto | Ícone SAP | Código |
|---|---|---|
| Estoque / Ruptura | `product` | `sap-icon://product` |
| Previsão / IA | `ai` ou `future` | `sap-icon://ai` |
| Franqueado / Loja | `retail-store` | `sap-icon://retail-store` |
| KPIs / Dashboard | `bar-chart` | `sap-icon://bar-chart` |
| Alerta de ruptura | `alert` | `sap-icon://alert` |
| NPS / Satisfação | `customer-financial-fact-sheet` | `sap-icon://customer-financial-fact-sheet` |
| Pedido | `cart` | `sap-icon://cart` |
| Notificações | `bell` | `sap-icon://bell` |

---

## 6. Checklist de Implementação

### Theme Designer
- [ ] Criar novo tema baseado em `sap_horizon`
- [ ] Configurar Quick Theming (Brand Color, Shell Bar, Background)
- [ ] Entrar em Expert Mode e ajustar os tokens listados na Seção 4.2.2
- [ ] Salvar e publicar o tema
- [ ] Atribuir o tema ao site no Site Manager

### Work Zone Site Settings
- [ ] Fazer upload do logo da Tropicália Co. (transparente, formato SVG ou PNG)
- [ ] Definir nome do site: `Tropicália Co.`
- [ ] Aplicar o tema customizado criado
- [ ] Adicionar CSS customizado (Seção 4.4)
- [ ] Testar em mobile (Work Zone é responsivo)

### Validação
- [ ] Verificar contraste de acessibilidade (WCAG AA) nas combinações de cor usadas
- [ ] Testar no tema claro (sap_horizon) e verificar se há necessidade de variante escura
- [ ] Validar visual nos principais casos de uso: Portal Franqueador e Portal Franqueado

---

## 7. Referências

- [SAP UI Theme Designer — Documentação oficial](https://ui5.sap.com/topic/a1c0b8f7f4c24ffe9a9bede4d78a7b87)
- [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/)
- [SAP Work Zone — Custom Theming](https://help.sap.com/docs/build-work-zone-advanced-edition/sap-build-work-zone-advanced-edition/custom-css)
- [SAP Icons Explorer](https://ui5.sap.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html)

---

*Documento gerado a partir da apresentação RunMyFranchise.pptx · Agosto 2026*
