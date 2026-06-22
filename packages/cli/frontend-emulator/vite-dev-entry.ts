import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = process.env.SIRENO_VITE_PORT
  ? Number(process.env.SIRENO_VITE_PORT)
  : undefined;
const strictPort = port !== undefined;

const server = await createServer({
  configFile: path.join(__dirname, 'vite.config.ts'),
  server: { host: '127.0.0.1', port, strictPort },
  mode: 'development',
  root: __dirname,
});

const boundPort = (await server.listen()).httpServer?.address();
if (boundPort && typeof boundPort === 'object') {
  process.stdout.write(`READY ${boundPort.port}\n`);
}

process.on('SIGTERM', () => {
  server.close().then(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close().then(() => process.exit(0));
});