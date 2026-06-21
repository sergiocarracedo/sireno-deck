import { createServer } from 'vite';

const args = process.argv.slice(2);
const strictPort = args.includes('--strict-port');
const mode = process.env.SIRENO_EMULATE === '1' ? 'emulate' : 'deck';

const server = await createServer({
  configFile: import.meta.dirname + '/vite.config.ts',
  server: {
    host: '127.0.0.1',
    strictPort,
  },
  mode: mode === 'emulate' ? 'development' : 'development',
});

const port = (await server.listen()).httpServer?.address();
if (port && typeof port === 'object') {
  process.stdout.write(`READY ${port.port}\n`);
}

process.on('SIGTERM', () => {
  server.close().then(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close().then(() => process.exit(0));
});