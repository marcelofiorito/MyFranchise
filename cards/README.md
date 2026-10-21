# cards/ — UI Integration Cards (Work Zone)

Os cards desta pasta são **deployados manualmente** no Work Zone via Content Manager. Não fazem parte do `mta.yaml`.

## Como fazer upload

1. Acesse o **Work Zone Content Manager** no BTP
2. Vá em **Upload** → selecione o arquivo `.zip` do card desejado
3. Atribua o card ao site e ao role adequado

## Estrutura

Cada card tem uma pasta com o código-fonte e um arquivo `.zip` pronto para upload:

| Card | Descrição |
|---|---|
| `card01_alertas_ruptura` | Alertas de ruptura de estoque em tempo real |
| Demais cards (card02–card11) | Indicadores de rede, NPS, pedidos, etc. |

> O card `card01_custom_test` é uma variante de teste do card01 — não é o card em produção.

## Baseline de dados

Os dados que os cards exibem vêm do schema `RUNMYFRANCHISE_JG` via Datasphere/SAC. O cenário BAD/GOOD é controlado pelo app `demo-admin` — os cards refletem automaticamente o estado ativo.
