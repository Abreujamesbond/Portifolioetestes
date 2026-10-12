# Testar e publicar o Conecta na Vercel

## Ver agora, sem conta ou instalação

Baixe `preview/Conecta-previa.html` e abra no navegador. É uma demonstração interativa com todas as telas e exemplos. Cadastro de clientes de teste, funil, tarefas, modelos, estoque e pedidos funcionam no navegador. Essa prévia não tem login, não envia mensagens e não sincroniza entre aparelhos. Use apenas dados de exemplo.

As alterações são salvas no armazenamento do navegador quando ele permite; caso contrário, duram enquanto a página estiver aberta. Exportação dos testes está disponível em Configurações. “Reiniciar prévia” repõe os exemplos.

Para recriar o arquivo:

```bash
npm ci
npm run build:preview
```

## Primeira publicação na Vercel: prévia

1. Envie os arquivos **do projeto** para a branch `main` do repositório conectado à Vercel. Confira se o commit aparece no GitHub.
2. Na Vercel, abra o projeto conectado a esse repositório (ou importe-o, caso ainda não exista). A raiz deve ser a pasta que contém `package.json` e `vercel.json`.
3. Mantenha Node.js **24.x**. O arquivo `vercel.json` já define Vite, o comando `npm run build:vercel` e a saída `dist`.
4. Publique **sem `DATABASE_URL`** para testar a demonstração. O site abrirá diretamente com exemplos e terá uma faixa indicando que os dados ficam apenas no navegador.

O link `*.vercel.app` é criado pela Vercel após um deploy bem-sucedido. Conectar o repositório à Vercel não concede a este ambiente acesso ao painel: confirme o resultado em **Deployments** e abra **Visit**.

## Ativar a conta e os dados persistentes

Depois de avaliar a prévia:

1. Conecte um banco **Neon Postgres** ao projeto pela Vercel Marketplace, ou use um banco Neon existente.
2. Nas variáveis de ambiente do projeto, configure `DATABASE_URL` com a conexão Neon. Use somente a interface segura de variáveis da Vercel; não inclua o valor no código ou no chat.
3. Defina `SETUP_TOKEN` como uma chave particular e longa, criada pelo seu gerenciador de senhas. Ela autoriza apenas a criação inicial do proprietário.
4. Faça um novo deploy. Com `DATABASE_URL`, o build deixa de ser demonstração e usa a API e o banco remoto.
5. Abra o site, informe a chave de configuração e crie seu acesso. Depois, entre normalmente com e-mail e senha. O primeiro cadastro cria as tabelas e a conta; outras pessoas não podem abrir contas adicionais.

A demonstração não é importada automaticamente no banco. Os dados reais passam a pertencer à conta e podem ser acessados de aparelhos diferentes no mesmo endereço. O banco SQLite usado no desenvolvimento permanece intacto; não há migração automática dele para o Neon.

## Como a implantação funciona

- A Vercel serve os arquivos estáticos de `dist/` e executa `api/index.mjs` para a API Express.
- `server/app.mjs` exporta o aplicativo sem abrir uma porta permanente; `server/index.mjs` é usado somente para execução local.
- Em Vercel, a persistência usa Neon por HTTPS, sem gravar clientes em arquivos temporários da função.
- As alterações em clientes, pedidos e estoque usam uma revisão de banco para impedir sobrescritas concorrentes entre funções.
- `DATABASE_URL` e `SETUP_TOKEN` permanecem no servidor e não são incluídos no pacote do navegador.
- Configure as variáveis nos ambientes da Vercel que pretende usar. Um ambiente sem banco sempre gera a demonstração; não o use para clientes reais.

## Validação e limites

O projeto tem testes da aplicação local, prévia estática e regras de banco. Um banco Neon real e o deploy da Vercel precisam ser verificados depois que sua conta e variáveis forem conectadas. Os testes locais não comprovam que um deploy remoto ou a conexão Neon estejam funcionando.

A aplicação é individual. A proteção contra tentativas repetidas de login é local à instância da função; uma publicação pública com dados reais deve utilizar também os controles de acesso e proteção disponíveis no projeto da Vercel.
