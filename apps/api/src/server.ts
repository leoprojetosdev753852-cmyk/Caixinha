import { buildApp } from './app';
import { env } from './env';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 API rodando em http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const signals = ['SIGINT', 'SIGTERM'] as const;
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Recebido ${signal}, encerrando...`);
      await app.close();
      process.exit(0);
    });
  });
}

main();
