import { preview } from 'astro';

// Use the API so automated audits own the process, including in agent environments.
const server = await preview({ server: { host: '127.0.0.1', port: 4321 } });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
