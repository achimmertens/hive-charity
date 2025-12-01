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
      return new Response(JSON.stringify({ error: true, message: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rpcPayload = body.rpc ?? body;

    // Validate basic JSON-RPC shape
    if (!rpcPayload || typeof rpcPayload !== 'object' || (!rpcPayload.method && !rpcPayload.params)) {
      return new Response(JSON.stringify({ error: true, message: 'Missing JSON-RPC payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Try multiple public Hive RPC nodes server-side to avoid client CORS issues
    const HIVE_RPC_NODES = [
      'https://api.hive.blog',
      'https://api.deathwing.me',
      'https://anyx.io'
    ];

    let lastError: any = null;
    for (const node of HIVE_RPC_NODES) {
      try {
        const res = await fetch(node, { method: 'POST', body: JSON.stringify(rpcPayload), headers: { 'Content-Type': 'application/json' } });
        const text = await res.text();
        // If server returned non-JSON or non-ok, keep trying
        if (!res.ok) {
          lastError = { node, status: res.status, text };
          continue;
        }
        // Try parse JSON
        try {
          const json = JSON.parse(text);
          // Return the node response and indicate which node was used
          return new Response(JSON.stringify({ node, result: json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          // Node returned non-JSON; continue trying others
          lastError = { node, error: 'invalid-json', text };
          continue;
        }
      } catch (err) {
        lastError = { node, error: err instanceof Error ? err.message : String(err) };
        continue;
      }
    }

    // If we get here, no node returned a usable response
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
