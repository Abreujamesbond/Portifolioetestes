import app, { getStore } from './app.mjs';
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Conecta pronto na porta ${port}`));
function stop() { server.close(async () => { try { (await getStore()).close(); } finally { process.exit(0); } }); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
