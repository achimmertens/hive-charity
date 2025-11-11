import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scansDir = path.resolve(__dirname, '..', 'scans');
const scannerScript = path.resolve(__dirname, 'scanCharyComments.js');
const PORT = process.env.SCAN_RUNNER_PORT ? Number(process.env.SCAN_RUNNER_PORT) : 8787;

function json(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

function listScans() {
  if (!fs.existsSync(scansDir)) return [];
  return fs.readdirSync(scansDir).filter(f => f.endsWith('.json')).sort().reverse();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/scan') {
    // spawn the scanner script and return when complete
    try {
      const before = listScans();
      const child = spawn(process.execPath, [scannerScript], { cwd: path.resolve(__dirname) });
      let out = '';
      let err = '';
      child.stdout.on('data', (c) => { out += c.toString(); });
      child.stderr.on('data', (c) => { err += c.toString(); });
      child.on('close', (code) => {
        const after = listScans();
        const created = after.filter(x => !before.includes(x));
        json(res, 200, { ok: true, code, created, out, err });
      });
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/scans') {
    const files = listScans();
    return json(res, 200, { ok: true, files });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/scans/')) {
    const name = decodeURIComponent(url.pathname.replace('/scans/', ''));
    const filePath = path.join(scansDir, name);
    if (!fs.existsSync(filePath)) return json(res, 404, { ok: false, error: 'not found' });
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(content);
      return;
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e) });
    }
  }

  json(res, 404, { ok: false, error: 'unknown' });
});

server.listen(PORT, () => {
  console.log(`Scan runner listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
