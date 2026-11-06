const { spawn } = require('child_process');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t']);
    } else {
      proc.kill('SIGTERM');
    }
  } catch {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await get(url);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000);
    }
  }
}

async function run() {
  console.log('========================================================');
  console.log('IGNITRON 2K26 — PHASE 02 INTEGRATION VALIDATION SUITE');
  console.log('========================================================\n');

  let backend = null;
  let frontend = null;

  try {
    // -----------------------------------------------------------------
    // Step 1: Start Backend
    // -----------------------------------------------------------------
    console.log('[STEP 1] Starting NestJS Backend (port 4000)...');
    backend = spawn('node', ['apps/backend/dist/main.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BACKEND_PORT: '4000', NODE_ENV: 'development' },
    });

    backend.stdout.on('data', (d) => process.stdout.write(`[BACKEND] ${d}`));
    backend.stderr.on('data', (d) => process.stderr.write(`[BACKEND ERR] ${d}`));

    let backendOnline = false;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      try {
        const res = await get('http://127.0.0.1:4000/api/health');
        if (res.status === 200 && res.body?.status === 'ok') {
          backendOnline = true;
          break;
        }
      } catch {}
    }

    if (!backendOnline) {
      throw new Error('Backend failed to respond on http://127.0.0.1:4000/api/health within 45s');
    }
    console.log(' -> NestJS Backend successfully booted and listening.\n');

    // -----------------------------------------------------------------
    // Step 2: Validate Direct Backend Endpoints
    // -----------------------------------------------------------------
    console.log('[STEP 2] Verifying Backend Health & Readiness Endpoints...');
    const health = await get('http://127.0.0.1:4000/api/health');
    console.log(' -> GET /api/health response:', JSON.stringify(health.body));
    if (
      health.status !== 200 ||
      health.body.status !== 'ok' ||
      health.body.application !== 'IGNITRON 2K26' ||
      health.body.service !== 'backend' ||
      !health.body.timestamp
    ) {
      throw new Error(`Health payload failed schema contract: ${JSON.stringify(health.body)}`);
    }
    console.log(' -> [PASS] GET /api/health liveness contract verified.');

    const ready = await get('http://127.0.0.1:4000/api/health/ready');
    console.log(' -> GET /api/health/ready response:', JSON.stringify(ready.body), `(HTTP ${ready.status})`);
    if (
      (ready.status === 200 && ready.body.status === 'ready' && ready.body.checks?.database === 'connected') ||
      (ready.status === 503 && ready.body.status === 'not_ready' && ready.body.checks?.database === 'disconnected')
    ) {
      console.log(` -> [PASS] GET /api/health/ready contract verified. DB status: ${ready.body.checks?.database}\n`);
    } else {
      throw new Error(`Readiness payload failed contract: ${JSON.stringify(ready.body)}`);
    }

    // -----------------------------------------------------------------
    // Step 3: Start Frontend Dev Server (Vite with Proxy)
    // -----------------------------------------------------------------
    console.log('[STEP 3] Starting Vite Frontend with /api proxy (port 5173)...');
    const isWin = process.platform === 'win32';
    const feBin = isWin ? 'cmd.exe' : 'npm';
    const feArgs = isWin ? ['/c', 'npm', 'run', 'dev', '-w', '@ignitron/frontend'] : ['run', 'dev', '-w', '@ignitron/frontend'];

    frontend = spawn(feBin, feArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    frontend.stdout.on('data', (d) => process.stdout.write(`[FRONTEND] ${d}`));
    frontend.stderr.on('data', (d) => process.stderr.write(`[FRONTEND ERR] ${d}`));

    let frontendOnline = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      try {
        const res = await get('http://127.0.0.1:5173/');
        if (res.status === 200 && typeof res.body === 'string' && res.body.includes('IGNITRON 2K26')) {
          frontendOnline = true;
          break;
        }
      } catch {}
    }

    if (!frontendOnline) {
      throw new Error('Frontend failed to respond on http://127.0.0.1:5173 within 30s');
    }
    console.log('\n -> Vite Frontend successfully booted and serving HTML.\n');

    // -----------------------------------------------------------------
    // Step 4: Verify Frontend-to-Backend Proxy Communication
    // -----------------------------------------------------------------
    console.log('[STEP 4] Verifying Frontend -> Backend Proxy Communication...');
    await sleep(2000);
    const proxiedHealth = await getWithRetry('http://127.0.0.1:5173/api/health');
    console.log(' -> Proxied GET /api/health:', JSON.stringify(proxiedHealth.body));
    if (proxiedHealth.status !== 200 || proxiedHealth.body?.status !== 'ok') {
      throw new Error(`Proxied health request failed: ${JSON.stringify(proxiedHealth)}`);
    }

    const proxiedReady = await getWithRetry('http://127.0.0.1:5173/api/health/ready');
    console.log(' -> Proxied GET /api/health/ready:', JSON.stringify(proxiedReady.body), `(HTTP ${proxiedReady.status})`);
    if (
      proxiedReady.body?.checks?.database !== 'connected' &&
      proxiedReady.body?.checks?.database !== 'disconnected'
    ) {
      throw new Error(`Proxied readiness check failed: ${JSON.stringify(proxiedReady)}`);
    }
    console.log(' -> [PASS] Frontend proxy correctly proxies /api/health and /api/health/ready.\n');

    // -----------------------------------------------------------------
    // Step 5: Verify Graceful Handling When Backend Is Terminated
    // -----------------------------------------------------------------
    console.log('[STEP 5] Testing Backend Disconnected State...');
    console.log(' -> Terminating NestJS backend...');
    killProcess(backend);
    backend = null;
    await sleep(2500);

    let disconnectedDetected = false;
    try {
      const offlineProbe = await get('http://127.0.0.1:5173/api/health');
      if (offlineProbe.status >= 500) {
        disconnectedDetected = true;
        console.log(` -> Frontend proxy returned HTTP ${offlineProbe.status} (Backend Unreachable).`);
      }
    } catch {
      disconnectedDetected = true;
      console.log(' -> Request failed with connection error as expected.');
    }

    if (!disconnectedDetected) {
      throw new Error('Expected proxy request to fail or return 5xx when backend is down.');
    }
    console.log(' -> [PASS] Disconnected state correctly triggered when backend is terminated.\n');

    console.log('========================================================');
    console.log('ALL PHASE 02 INTEGRATION CHECKS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    killProcess(backend);
    killProcess(frontend);
  }
}

run().catch((err) => {
  console.error('\n[FATAL ERROR IN INTEGRATION SUITE]:', err);
  process.exit(1);
});

