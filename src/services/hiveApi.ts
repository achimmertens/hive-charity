// Lightweight Hive RPC helper using Supabase Edge Function proxy to avoid CORS issues
export interface RpcResponse<T = any> {
  id: number | string
  jsonrpc: '2.0'
  result?: T
  error?: any
}

// Use the Supabase Edge Function proxy to avoid CORS issues
const HIVE_PROXY_URL = 'https://zwxepwsfcxfifiupmjmk.supabase.co/functions/v1/hive-proxy';

// Perform a JSON-RPC call via the Supabase proxy. Returns the full JSON-RPC response.
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now()
  };

  try {
    const res = await fetch(HIVE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Hive proxy error (${res.status}):`, errorText);
      throw new Error(`Hive proxy failed with status ${res.status}`);
    }

    const json = (await res.json()) as RpcResponse<T>;

    if (json && typeof json === 'object' && 'result' in json) {
      console.log(`✓ Hive API success via proxy`);
      return json;
    }
    
    if (json && json.error) {
      console.error('Hive API error:', json.error);
      throw new Error(`Hive API error: ${JSON.stringify(json.error)}`);
    }

    throw new Error('Invalid response format from Hive proxy');
  } catch (e) {
    console.error('Error calling Hive proxy:', e);
    throw e;
  }
}
