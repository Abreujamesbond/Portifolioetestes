#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Portifolioetestes
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) { throw new Error("Conecta requer Node.js 24 ou superior."); }'
npm ci --cache /workspace/.cache/conecta-npm --no-audit --no-fund
npm run build
