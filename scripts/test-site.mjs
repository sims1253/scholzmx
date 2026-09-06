import { spawn } from 'node:child_process';
import { preview } from 'astro';

// Let the OS select an unused port and pass the actual URL to both audit tools.
const server = await preview({ server: { host: '127.0.0.1', port: 0 } });
try {
  await new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', process.argv[2] || 'test:audits'], {
      stdio: 'inherit',
      env: { ...process.env, SITE_TEST_URL: `http://127.0.0.1:${server.port}` },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Site audits failed (${signal || code})`));
    });
  });
} finally {
  await server.stop();
}
