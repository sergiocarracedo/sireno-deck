import { createServer, type Plugin } from 'vite';
import { default as sirv } from 'sirv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const strictPort = args.includes('--strict-port');
const mode = process.env.SIRENO_EMULATE === '1' ? 'emulate' : 'deck';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const emulatorHtmlPlugin: Plugin = {
  name: 'sireno-emulator-html',
  apply: 'serve',
  configureServer(server) {
    return () => {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          res.setHeader('Content-Type', 'text/html');
          res.end(fs.readFileSync(path.join(__dirname, 'emulator.html'), 'utf8'));
          return;
        }
        next();
      });
      server.middlewares.use(
        '/__emulator',
        sirv(path.join(__dirname, 'src'), { dev: true, single: false }),
      );
    };
  },
};

const config: Parameters<typeof createServer>[0] = {
  configFile: path.join(__dirname, 'vite.config.ts'),
  server: {
    host: '127.0.0.1',
    strictPort,
  },
  mode: 'development',
  root: __dirname,
  plugins: mode === 'emulate' ? [emulatorHtmlPlugin] : [],
};

const server = await createServer(config);

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