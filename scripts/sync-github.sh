#!/usr/bin/env bash
set -e

REPO_URL="https://github.com/grupoagropecuariaboasorte-a11y/grupoagropecuariaboasorte-a11y.git"

if [ -n "$GITHUB_TOKEN" ]; then
  AUTH_REPO_URL="https://${GITHUB_TOKEN}@github.com/grupoagropecuariaboasorte-a11y/grupoagropecuariaboasorte-a11y.git"
  git remote set-url origin "$AUTH_REPO_URL"
  git push origin main
  echo "Push para o GitHub concluído com sucesso!"
else
  echo "Aviso: GITHUB_TOKEN não configurado no ambiente."
  echo "Configure a variável GITHUB_TOKEN nas configurações do estúdio (Settings > Secrets) com um Personal Access Token com permissão de 'repo', ou use a opção 'Export to GitHub' do AI Studio."
  exit 1
fi
