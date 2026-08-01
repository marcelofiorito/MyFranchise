#!/bin/bash
# assign-role.sh — reatribui o role MyFranchise_Gestor_DEV após deploy
# Uso: ./assign-role.sh [email]
# Se email não for passado, usa marcelo.fiorito@sap.com

USER=${1:-"marcelo.fiorito@sap.com"}
SUBACCOUNT="0a3bf8c0-f8f0-438e-8326-50322e696406"
ROLE="MyFranchise_Gestor_DEV"

echo "Atribuindo role '$ROLE' para '$USER'..."

btp assign security/role-collection "$ROLE" \
  --to-user "$USER" \
  --subaccount "$SUBACCOUNT" \
  --create-user-if-missing 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Role '$ROLE' atribuído com sucesso para $USER"
else
  echo "❌ Falhou. Tente:"
  echo "   1. btp login --sso"
  echo "   2. ./assign-role.sh $USER"
fi
