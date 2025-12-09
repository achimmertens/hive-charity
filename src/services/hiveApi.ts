// Lightweight Hive RPC helper using local proxy and direct node calls
export interface RpcResponse<T = any> {
  id: number | string
  jsonrpc: '2.0'
  result?: T
  error?: any
}

// Fallback list of public Hive RPC nodes for direct browser calls if the proxy fails
const HIVE_RPC_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://anyx.io',
];

// Direct RPC call that works like TesteHive: robust direct POST with tolerant parsing
// Tries each node and returns the first valid JSON-RPC response
export async function directPost<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now(),
  };

  const body = JSON.stringify(payload);

  for (const node of HIVE_RPC_NODES) {
    try {
      const resp = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      // Even on non-ok status, try to parse the response
      const text = await resp.text();
      
      try {
        const json = JSON.parse(text) as RpcResponse<T>;
        
        // Check if it looks like a valid JSON-RPC response (has result or error field)
        if (json && typeof json === 'object' && ('result' in json || 'error' in json)) {
          console.log(`✓ Direct RPC success from ${node}`);
          return json;
        }
      } catch (parseErr) {
        console.warn(`Direct RPC from ${node} returned non-JSON (${resp.status}):`, text.slice(0, 100));
        continue;
      }
    } catch (err) {
      console.warn(`Direct RPC fetch to ${node} failed:`, err);
      continue;
    }
  }

  // All nodes failed
  console.error('All direct RPC nodes failed');
  throw new Error('All direct RPC nodes failed');
}

// Perform a JSON-RPC call with local proxy first, then fallback to direct nodes
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now(),
  };

  const body = JSON.stringify(payload);

  // Try 1: Local proxy if available (http://localhost:8788)
  try {
    console.log('Trying local proxy at http://localhost:8788...');
    const res = await fetch('http://localhost:8788/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text) as any;
      
      // Check if it's a valid response from the local proxy
      if (json && typeof json === 'object') {
        // Local proxy returns { result: <jsonrpc> } or { node, result: <jsonrpc> } or { error: true, ... }
        if ('error' in json && json.error) {
          console.warn('Local proxy returned error, trying direct nodes...', json);
        } else if ('result' in json) {
          console.log('✓ Local proxy success, got valid RPC response');
          return json.result || json;
        } else if ('node' in json && 'result' in json) {
          console.log('✓ Local proxy success from node', json.node);
          return json.result;
        }
      }
    } catch (parseErr) {
      console.warn('Local proxy returned non-JSON, trying direct nodes...', parseErr);
    }
  } catch (localErr) {
    console.log('Local proxy not available, trying direct nodes...', localErr);
  }

  // Try 2: Direct public Hive RPC nodes (with tolerant parsing for CORS issues)
  for (const node of HIVE_RPC_NODES) {
    try {
      const res = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      // Try to parse even if status is not OK
      const text = await res.text();
      try {
        const json = JSON.parse(text) as RpcResponse<T>;
        if (json && typeof json === 'object' && ('result' in json || 'error' in json)) {
          console.log('✓ Hive API success via direct node', node);
          return json;
        }
      } catch (parseErr) {
        console.warn(`Direct Hive RPC from ${node} returned non-JSON (${res.status}):`, text.slice(0, 100));
        continue;
      }
    } catch (nodeErr) {
      console.warn(`Error calling direct Hive RPC node ${node}:`, nodeErr);
      continue;
    }
  }

  console.error('All RPC methods failed (local proxy and direct nodes)');
  throw new Error('All RPC nodes failed. Make sure local proxy is running or check your internet connection.');
}
