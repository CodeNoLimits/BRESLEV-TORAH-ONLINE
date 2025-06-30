import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { setTimeout as wait } from 'timers/promises';

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('close', code => {
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function waitFor(url, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  await run('npm', ['run', 'build']);

  const port = process.env.TEST_PORT || '3333';
  const server = spawn('node', ['dist/index.js'], {
    env: { ...process.env, PORT: port, GEMINI_API_KEY: 'dummy-key' },
    stdio: 'inherit'
  });

  try {
    await waitFor(`http://localhost:${port}/health`);
    const health = await fetch(`http://localhost:${port}/health`);
    console.log('Health status:', health.status);

    const sefaria = await fetch(`http://localhost:${port}/api/sefaria/texts/Likutei_Moharan.1`);
    console.log('Sefaria status:', sefaria.status);
  } finally {
    server.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
