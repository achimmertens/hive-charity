// Lightweight Hive RPC helper using Supabase Edge Function proxy to avoid CORS issues
export interface RpcResponse<T = any> {
  id: number | string
  jsonrpc: '2.0'
  result?: T
  error?: any
}

// Hive proxy is implemented as a Supabase Edge Function, so we call it via the Supabase client
import { supabase } from '@/integrations/supabase/client';

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

// Perform a JSON-RPC call via the Supabase proxy. Returns the underlying Hive JSON-RPC response.
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now(),
  };

  // Try 1: Local proxy if available (http://localhost:8788)
  try {
    console.log('Trying local proxy at http://localhost:8788...');
    const res = await fetch('http://localhost:8788/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text) as any;
      
      // Check if it's a valid response from the local proxy
      if (json && typeof json === 'object') {
        // Local proxy returns { result: <jsonrpc> } or { node, result: <jsonrpc> } or { error: true, ... }
        if ('error' in json && json.error) {
          console.warn('Local proxy returned error, continuing to next method...', json);
        } else if ('result' in json) {
          console.log('✓ Local proxy success, got valid RPC response');
          return json.result || json;
        } else if ('node' in json && 'result' in json) {
          console.log('✓ Local proxy success from node', json.node);
          return json.result;
        }
      }
    } catch (parseErr) {
      console.warn('Local proxy returned non-JSON, continuing...', parseErr);
    }
  } catch (localErr) {
    console.log('Local proxy not available, continuing to Edge Function...', localErr);
  }

  // Try 2: Supabase Edge Function proxy
  try {
    console.log('Trying Supabase Edge Function proxy...');
    const { data, error } = await supabase.functions.invoke('hive-proxy', {
      body: { rpc: payload },
    });

    if (error) {
      console.error('Hive proxy invoke error:', error);
      throw new Error(error.message || 'Hive proxy invoke error');
    }

    if (!data) {
      throw new Error('No data returned from Hive proxy');
    }

    // Edge function returns either { node, result: <jsonrpc> } or { error: true, message, ... }
    if ('error' in data && (data as any).error) {
      console.error('Hive proxy responded with error:', data);
      throw new Error((data as any).message || 'Hive proxy error');
    }

    const rpcResponse = (data as { node: string; result: RpcResponse<T> }).result;

    if (rpcResponse && typeof rpcResponse === 'object' && 'result' in rpcResponse) {
      console.log('✓ Hive API success via proxy node', (data as { node: string }).node);
      return rpcResponse;
    }

    console.error('Unexpected Hive proxy response shape:', data);
    throw new Error('Invalid response format from Hive proxy');
  } catch (e) {
    // If the proxy fails (e.g. all RPC nodes down from Supabase), fall back to direct browser calls
    console.warn('Hive proxy failed, falling back to direct Hive RPC nodes:', e);

    for (const node of HIVE_RPC_NODES) {
      try {
        const res = await fetch(node, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn(`Direct Hive RPC failed on ${node} with status ${res.status}`);
          continue;
        }

        const text = await res.text();

        try {
          const json = JSON.parse(text) as RpcResponse<T>;
          if (json && typeof json === 'object' && ('result' in json || 'error' in json)) {
            console.log('✓ Hive API success via direct node', node);
            return json;
          }
        } catch (parseErr) {
          console.warn(`Direct Hive RPC returned invalid JSON from ${node}`, parseErr);
          continue;
        }
      } catch (nodeErr) {
        console.warn(`Error calling direct Hive RPC node ${node}`, nodeErr);
        continue;
      }
    }

    console.error('All direct Hive RPC nodes failed after proxy failure');
    throw e instanceof Error ? e : new Error(String(e));
  }
}
