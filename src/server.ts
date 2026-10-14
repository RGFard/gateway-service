import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = await buildApp();
  const { HOST, PORT } = app.config;

  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`Gateway Service listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}

void start();
