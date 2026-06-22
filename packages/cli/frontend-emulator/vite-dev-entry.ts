import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = await createServer({
  configFile: path.join(__dirname, 'vite.config.ts'),
  server: { host: '127.0.0.1' },
  mode: 'development',
  root: __dirname,
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