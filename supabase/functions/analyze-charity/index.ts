
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(
        JSON.stringify({
          error: true,
          message: 'OpenAI API key is missing. Please set the OPENAI_API_KEY secret in Supabase.',
          score: 0,
          summary: 'Die Analyse konnte nicht durchgeführt werden, da der API-Schlüssel fehlt.'
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Parse the request body
    const requestData = await req.json();
    const { title, content, prompt } = requestData;
    
    if (!title || !content) {
      console.error('Missing required parameters:', { title: !!title, content: !!content });
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Missing required parameters: title and/or content',
          score: 0,
          summary: 'Fehler: Unvollständige Daten für die Analyse.'
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('Analyzing charity post:', title);
    console.log('Content length:', content.length);

    // Prepare the prompt for OpenAI
    let charityPrompt = '';
    if (prompt && typeof prompt === 'string' && prompt.trim().length > 0) {
      charityPrompt = prompt;
      console.log('Using client-provided prompt (charityExamples)');
    } else {
      try {
        charityPrompt = await Deno.readTextFile('./charityExamples.txt');
        console.log('Loaded prompt from function folder (charityExamples.txt)');
      } catch (err) {
        console.error('Could not read charityExamples.txt:', err);
        charityPrompt = 'You are a charity content evaluator. Score from 0-10 and summarize.';
      }
    }
    
  const systemPrompt = `${charityPrompt}\n\nAnalyze the following Hive blog post according to the instructions and examples above. Return your answer in JSON format with the following fields exactly:\n- score: integer (0-10)\n- summary: short string (one or two sentences)\n- reason: short string explaining why this score was chosen (explicit facts only)\n- evidence: an array of 0..3 short excerpts from the text that justify the score\n\nImportant: do NOT output any extra text before or after the JSON. The JSON must be parseable.`;

    // Call OpenAI API
    console.log('Sending request to OpenAI API...');
  const model = 'gpt-4o-mini';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Title: ${title}\nContent: ${content.substring(0, 3000)}` }
          ],
          max_tokens: 500,
          temperature: 0.0
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        console.error(`OpenAI API error: ${status} ${errorText}`);
        
        if (status === 429) {
          return new Response(
            JSON.stringify({
              error: true,
              message: 'Rate limit reached. Please try again in a few minutes.',
              retryAfter: response.headers.get('Retry-After') || '60'
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: true,
            message: `OpenAI API error: ${status}`,
            score: 0,
            summary: 'Fehler bei der Verbindung zum Analyse-Dienst. Bitte versuchen Sie es später erneut.'
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      const data = await response.json();
      console.log('OpenAI API response received');

      // Parse OpenAI response
      let answer = "";
      if (data?.choices?.[0]?.message?.content) {
        answer = data.choices[0].message.content;
      } else {
        throw new Error("OpenAI response missing choices or content");
      }

      let result: any = {};
      try {
        result = JSON.parse(answer);
        console.log('Successfully parsed JSON response from OpenAI');
      } catch (error) {
        console.log('Failed to parse JSON response from OpenAI, attempting to extract fields');
        // Best-effort extraction
        const scoreMatch = answer.match(/"?score"?\s*[:=]\s*([0-9]|10)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        const summaryMatch = answer.match(/"?summary"?\s*[:=]\s*['\"]([^'\"]+)['\"]/i);
        const summary = summaryMatch?.[1] || (answer.split('\n').find(l => l.trim().length > 20) || 'Keine klare Analyse verfügbar.');
        const reasonMatch = answer.match(/"?reason"?\s*[:=]\s*['\"]([^'\"]+)['\"]/i);
        const reason = reasonMatch?.[1] || '';
        const evidenceMatches = Array.from(answer.matchAll(/['\"]?evidence['\"]?\s*[:=]\s*\[([^\]]*)\]/i))[0];
        let evidence: string[] = [];
        if (evidenceMatches && evidenceMatches[1]) {
          evidence = evidenceMatches[1].split(/['\"],?\s*['\"]/).map(s => s.replace(/^[\[\]'\"]/g, '').trim()).filter(Boolean).slice(0,3);
        }
        result = { score, summary, reason, evidence };
      }

      // Normalize fields
      if (typeof result.score !== 'number') result.score = Number(result.score || 0) || 0;
      if (!result.summary) result.summary = 'Keine klare Analyse verfügbar.';
      if (!result.reason) result.reason = '';
      if (!Array.isArray(result.evidence)) result.evidence = [];

      // Ensure numeric bounds
      result.score = Math.max(0, Math.min(10, Math.round(result.score)));

      return new Response(
        JSON.stringify({
          score: result.score,
          summary: result.summary,
          reason: result.reason,
          evidence: result.evidence,
          model
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
      
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('OpenAI API request error:', error);
      
      return new Response(
        JSON.stringify({
          error: true,
          message: `Error calling OpenAI API: ${error.message}`,
          score: 0,
          summary: 'Fehler bei der Analyse. Bitte versuchen Sie es später erneut.'
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
  } catch (error: any) {
    console.error('Error in analyze-charity function:', error);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message,
        score: 0,
        summary: `Fehler bei der Analyse: ${error.message}`
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
