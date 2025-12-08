import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept either raw JSON-RPC body or { rpc: { ... } }
    const body = await req.json().catch(() => null);
    if (!body) {
      console.error('hive-proxy: Invalid JSON body received');
      return new Response(JSON.stringify({ error: true, message: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rpcPayload = body.rpc ?? body;
    console.log('hive-proxy: Received RPC request:', JSON.stringify(rpcPayload).slice(0, 200));

    // Validate basic JSON-RPC shape
    if (!rpcPayload || typeof rpcPayload !== 'object' || (!rpcPayload.method && !rpcPayload.params)) {
      console.error('hive-proxy: Missing JSON-RPC payload');
      return new Response(JSON.stringify({ error: true, message: 'Missing JSON-RPC payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extended list of public Hive RPC nodes for better reliability
    const HIVE_RPC_NODES = [
      'https://api.hive.blog',
      'https://api.deathwing.me',
      'https://rpc.ecency.com',
      'https://hive-api.arcange.eu',
      'https://api.openhive.network',
      'https://techcoderx.com',
      'https://hived.emre.sh',
      'https://anyx.io'
    ];

    let lastError: any = null;
    for (const node of HIVE_RPC_NODES) {
      try {
        console.log(`hive-proxy: Trying node ${node}...`);
        const res = await fetch(node, { 
          method: 'POST', 
          body: JSON.stringify(rpcPayload), 
          headers: { 'Content-Type': 'application/json' },
        });
        const text = await res.text();
        
        console.log(`hive-proxy: Node ${node} responded with status ${res.status}`);
        
        // If server returned non-ok, keep trying
        if (!res.ok) {
          console.warn(`hive-proxy: Node ${node} returned error status ${res.status}: ${text.slice(0, 100)}`);
          lastError = { node, status: res.status, text: text.slice(0, 200) };
          continue;
        }
        
        // Try parse JSON
        try {
          const json = JSON.parse(text);
          
          // Check for JSON-RPC error in the response
          if (json.error) {
            console.warn(`hive-proxy: Node ${node} returned JSON-RPC error:`, JSON.stringify(json.error).slice(0, 200));
            lastError = { node, jsonRpcError: json.error };
            continue;
          }
          
          console.log(`hive-proxy: Success from node ${node}`);
          // Return the node response and indicate which node was used
          return new Response(JSON.stringify({ node, result: json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          // Node returned non-JSON; continue trying others
          console.warn(`hive-proxy: Node ${node} returned invalid JSON: ${text.slice(0, 100)}`);
          lastError = { node, error: 'invalid-json', text: text.slice(0, 200) };
          continue;
        }
      } catch (err) {
        console.warn(`hive-proxy: Node ${node} fetch failed:`, err instanceof Error ? err.message : String(err));
        lastError = { node, error: err instanceof Error ? err.message : String(err) };
        continue;
      }
    }

    // If we get here, no node returned a usable response
    console.error('hive-proxy: All RPC nodes failed. Last error:', JSON.stringify(lastError));
    // We return HTTP 200 with an error payload so the frontend can handle fallbacks
    return new Response(
      JSON.stringify({ error: true, message: 'All RPC nodes failed', lastError, statusCode: 502 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('hive-proxy error:', error);
    return new Response(JSON.stringify({ error: true, message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
