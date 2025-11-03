// Simple local Hive JSON-RPC proxy for development
// Usage: node scripts/hive-proxy-local.js [port]
// Listens for POST requests with JSON body { rpc: <jsonrpc> } or raw JSON-RPC body.
// Tries multiple public Hive RPC nodes and returns the first valid response.

import http from 'http';

const HIVE_RPC_NODES = [
  'https://api.hive.blog',
  'https://api.ausbit.dev'
];

const PORT = parseInt(process.argv[2], 10) || 7070;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

import https from 'https';
import { URL } from 'url';

function postText(nodeUrl, body) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(nodeUrl);
      const opts = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        }
      };

      const req = https.request(opts, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, text: data }));
      });

      req.on('error', (e) => reject(e));
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function tryNodes(rpcPayload) {
  let lastError = null;
  for (const node of HIVE_RPC_NODES) {
    try {
      const body = JSON.stringify(rpcPayload);
      const r = await postText(node, body);
      const text = r && r.text ? r.text : '';
      const status = r && r.statusCode ? r.statusCode : 0;
      if (!status || status < 200 || status >= 300) {
        lastError = { node, status, text };
        continue;
      }
      try {
        const json = JSON.parse(text);
        return { node, result: json };
      } catch (err) {
        lastError = { node, error: 'invalid-json', text };
        continue;
      }
    } catch (err) {
      lastError = { node, error: err && err.message ? err.message : String(err) };
      continue;
    }
  }
  return { error: true, message: 'All RPC nodes failed', lastError };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: true, message: 'Only POST allowed' });
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      sendJson(res, 400, { error: true, message: 'Invalid JSON' });
      return;
    }

    const rpcPayload = parsed.rpc ?? parsed;
    if (!rpcPayload) {
      sendJson(res, 400, { error: true, message: 'Missing rpc payload' });
      return;
    }

    const result = await tryNodes(rpcPayload);
    if (result && result.error) {
      sendJson(res, 502, result);
      return;
    }

    sendJson(res, 200, result);
  });
});

server.listen(PORT, () => {
  console.log(`Local hive-proxy listening on http://localhost:${PORT}/ (POST JSON-RPC payloads as { rpc: {...} } )`);
});
