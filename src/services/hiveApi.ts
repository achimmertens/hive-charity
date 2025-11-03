// Lightweight Hive RPC helper with node fallback to avoid CORS/400 issues on individual nodes
export interface RpcResponse<T = any> {
  id: number | string
  jsonrpc: '2.0'
  result?: T
  error?: any
}

// A small pool of reliable public Hive nodes (order matters; we'll try each until one succeeds)
const HIVE_NODES = [
  'https://api.openhive.network',
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://anyx.io'
];

// Perform a JSON-RPC call with automatic node fallback. Returns the full JSON-RPC response.
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now()
  };

  // Try each node until we get a valid result
  for (const node of HIVE_NODES) {
    try {
      const res = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // If the node returns a non-2xx status (often 400) it may also omit CORS headers.
      // In that case, do NOT try to read the body – just continue to the next node.
      if (!res.ok) {
        continue;
      }

      const json = (await res.json()) as RpcResponse<T>;

      // If the response contains a usable result, return it; otherwise try next node.
      if (json && typeof json === 'object' && 'result' in json) {
        return json;
      }
    } catch (e) {
      // Network/CORS/parse errors – try the next node
      continue;
    }
  }

  throw new Error(`All Hive nodes failed for method ${method}`);
}
