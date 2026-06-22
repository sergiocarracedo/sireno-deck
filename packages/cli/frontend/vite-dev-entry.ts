import { createServer } from 'vite';

const args = process.argv.slice(2);
const strictPort = args.includes('--strict-port');
const mode = process.env.SIRENO_EMULATE === '1' ? 'emulate' : 'deck';

const config: Parameters<typeof createServer>[0] = {
  configFile: import.meta.dirname + '/vite.config.ts',
  server: {
    host: '127.0.0.1',
    strictPort,
  },
  mode: 'development',
  root: import.meta.dirname,
};

if (mode === 'emulate') {
  config.appType = 'custom';
  (config as Record<string, unknown>).emulatorMode = true;
}

const server = await createServer(config);

if (mode === 'emulate') {
  // In emulate mode, serve emulator.html at root and the React deck app
  // at /decks/* so the iframe can load it.
  const { default: sirv } = await import('sirv');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fileURLToPath = await import('node:url');
  const __dirname = path.dirname(fileURLToPath.fileURLToPath(import.meta.url));
  const httpServer = server.httpServer;
  if (httpServer) {
    httpServer.middlewares.use((req, res, next) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.setHeader('Content-Type', 'text/html');
        res.end(fs.readFileSync(path.join(__dirname, 'emulator.html'), 'utf8'));
        return;
      }
      next();
    });
    // Also serve the emulator static dir under /__emulator
    httpServer.middlewares.use(
      '/__emulator',
      sirv(path.join(__dirname, 'src'), { dev: true, single: false }),
    );
  }
}

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