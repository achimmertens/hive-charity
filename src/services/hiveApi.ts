// Lightweight Hive RPC helper using Supabase Edge Function proxy to avoid CORS issues
export interface RpcResponse<T = any> {
  id: number | string
  jsonrpc: '2.0'
  result?: T
  error?: any
}

// Hive proxy is implemented as a Supabase Edge Function, so we call it via the Supabase client
import { supabase } from '@/integrations/supabase/client';

// Perform a JSON-RPC call via the Supabase proxy. Returns the underlying Hive JSON-RPC response.
export async function rpc<T = any>(method: string, params: any): Promise<RpcResponse<T>> {
  const payload = {
    jsonrpc: '2.0' as const,
    method,
    params,
    id: Date.now(),
  };

  try {
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
    console.error('Error calling Hive proxy:', e);
    throw e;
  }
}
