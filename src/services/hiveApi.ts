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

// Perform a JSON-RPC call via the Supabase proxy. Returns the underlying Hive JSON-RPC response.
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now(),
  };

  try {
    // Primary path: use Supabase Edge Function proxy so requests include auth automatically
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
