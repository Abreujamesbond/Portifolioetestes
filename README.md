# Conecta

Ferramenta web individual para organizar a venda de placas NFC: clientes, funil, agenda, mensagens, pedidos e estoque. Interface em português, adaptada para computador e celular.

## Prévia interativa e Vercel

Para ver a ferramenta sem instalar um servidor, abra `preview/Conecta-previa.html` no navegador. Gere o arquivo com `npm run build:preview` se necessário. A demonstração usa exemplos salvos somente no navegador.

O projeto inclui `vercel.json` e uma API compatível com Vercel Functions. Sem um banco configurado, `npm run build:vercel` gera a prévia. Com `DATABASE_URL` do Neon e `SETUP_TOKEN`, gera a aplicação com conta e persistência remota. Veja o [passo a passo para a Vercel](docs/VERCEL.md).

## Começar

Requisito: **Node.js 24.x**. O SQLite já faz parte dessa versão do Node; não é necessário instalar um banco separado.

Na pasta do projeto:

```bash
npm ci --cache /workspace/.cache/conecta-npm
npm run build
npm start
```

O servidor usa a porta **3001**. O primeiro acesso apresenta o cadastro do proprietário: informe seu nome, marca, e-mail e uma senha de pelo menos 10 caracteres. Nenhuma senha padrão é criada. Os dados fictícios de demonstração são opcionais e claramente identificados.

Para editar o projeto com atualização automática:

```bash
npm run dev
```

Esse comando inicia a interface na porta **5173** e a API na **3001**. Use uma sessão de terminal para manter os processos ativos. `Ctrl+C` encerra os dois. Não execute `npm start` e `npm run dev` ao mesmo tempo na mesma porta.

## Fluxo principal

1. Preencha suas informações em **Configurações** e ajuste os produtos em **Pedidos & estoque**.
2. Cadastre clientes ou importe uma planilha CSV. A importação mostra uma prévia e ignora telefones repetidos ou negócios com o mesmo nome e cidade.
3. Acompanhe as etapas em **Funil de vendas**. Os cartões podem ser arrastados; o seletor oferece a mesma ação no celular e pelo teclado.
4. Registre tarefas na **Minha agenda**, incluindo retornos e entregas.
5. Escolha um modelo em **Mensagens**, personalize o texto e revise a prévia. O botão abre o WhatsApp com o texto preparado. O envio é confirmado por você no WhatsApp. Copiar ou abrir uma mensagem não muda o status do cliente.
6. Cadastre os lotes recebidos antes de registrar pedidos. O pedido reserva as unidades e guarda o custo dos lotes usados; uma compra posterior não altera esse custo.
7. Confirme o pagamento e, depois, a entrega. Cancelar um pedido a receber devolve suas unidades aos lotes de origem.

O cadastro tem uma opção de autorização para mensagens pelo WhatsApp e uma opção **Não contatar**. Esta última bloqueia a abertura de mensagens e encerra lembretes de contato pendentes daquele cliente.

## Dados e operação

- No modo local sem `DATABASE_URL`, o banco fica em `data/conecta.sqlite`. Na Vercel, os registros ficam no Neon. A pasta `data/` está fora do Git.
- Os registros e sessões sobrevivem à reinicialização do servidor. Para usar computador e celular na mesma conta, ambos precisam acessar **a mesma instalação hospedada**.
- A exportação em **Configurações** baixa os registros em JSON, sem senhas ou sessões. A interface desta versão não restaura JSON exportado.
- Para uma cópia integral restaurável, pare o servidor e copie a pasta `data/` inteira. Restaure-a com o servidor parado. Preserve essa pasta em um volume persistente durante hospedagem ou atualizações.
- O primeiro usuário é o proprietário da instalação. Configure o acesso antes de expor a instalação na internet.
- As senhas são armazenadas com scrypt e salt individual; as sessões usam cookies HttpOnly e SameSite. As requisições de alteração verificam a origem.
- Os valores financeiros são inteiros em centavos. O estoque usa os lotes mais antigos primeiro. O resultado financeiro corresponde a recebimentos menos o custo das placas vendidas e as despesas do período.

### Configuração de execução

| Variável      | Padrão                    | Uso                                                                |
| ------------- | ------------------------- | ------------------------------------------------------------------ |
| `PORT`        | `3001`                    | Porta HTTP do servidor                                             |
| `HOST`        | `127.0.0.1`               | Interface de rede; em uma hospedagem pode ser necessário `0.0.0.0` |
| `DATA_DIR`    | `data/` dentro do projeto | Caminho para o volume persistente com SQLite                       |
| `TRUST_PROXY` | desativado                | Defina `1` somente atrás de um proxy HTTPS confiável de um salto   |

Em uma hospedagem com SQLite, sirva a aplicação por HTTPS, use uma única instância ligada ao volume persistente e mantenha os arquivos de dados fora da pasta pública. Na Vercel, use o adaptador Neon descrito no guia. A API e a interface devem ser servidas pela mesma origem. O desenvolvimento local e a demonstração dispensam serviços externos. O modo com conta na Vercel requer Neon e a chave inicial `SETUP_TOKEN`.

**Publicar um ambiente de desenvolvimento do Codex não publica este site na internet.** A hospedagem da aplicação e um endereço público são uma etapa separada.

## Validação

```bash
npm run build
npm test
python3 tests/browser_smoke.py
npm run build:preview
npm run build:vercel
python3 tests/preview_smoke.py
# Restaure o build local com conta depois de testar a prévia:
npm run build
```

O adaptador remoto é testado com Postgres embarcado (PGlite), incluindo transações e disputa pelo estoque. Isso não substitui o teste de conexão com Neon na implantação. Os testes de domínio e API usam o executor nativo do Node, um banco temporário e credenciais descartáveis geradas durante o teste. Conferem custos congelados, estoque, cancelamento, concorrência, autenticação, origem das requisições, importação sem duplicatas e persistência após reinício.

O teste de navegador requer Python com Playwright e Chromium em `/usr/bin/chromium`, já disponíveis neste ambiente. Ele cria um servidor e um banco temporários, exercita cadastro, mensagens sem envio, tarefas, produtos, estoque, pedidos, pagamento, entrega, importação, exportação, saída e entrada. Também verifica as sete telas no celular. Os testes não enviam mensagens pelo WhatsApp.

## Estrutura

- `src/`: React e TypeScript; estilos próprios e fontes locais.
- `server/app.mjs`: API Express e autenticação; `server/index.mjs` inicia o servidor local.
- `server/storage.mjs`: persistência remota Neon; `server/sqlite-store.mjs`: desenvolvimento local em SQLite.
- `api/index.mjs`: entrada da função na Vercel.
- `server/domain.mjs`: regras de clientes, pedidos, lotes, valores e cancelamentos.
- `tests/`: testes de domínio, API e navegador.
- `docs/`: capturas da interface usando dados fictícios.

## Escopo desta primeira versão

Inclui uma conta individual, armazenamento no servidor, funil, modelos editáveis de mensagem, tarefas, CSV, exportação, produtos, lotes, pedidos e despesas. A pesquisa automática de empresas, integração com a API oficial do WhatsApp, envio automático, sincronização de respostas, contas de equipe, recuperação de senha por e-mail, devoluções de pedidos pagos e implantação pública ainda não estão implementadas.

O projeto foi desenvolvido com código e identidade próprios, usando como referência funcional o fluxo analisado durante a conversa.
