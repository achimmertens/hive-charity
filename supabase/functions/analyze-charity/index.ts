
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    // Parse the request body
    const { title, content } = await req.json();
    
    if (!title || !content) {
      throw new Error('Missing required parameters: title and/or content');
    }

    console.log('Analyzing charity post:', title);

    // Prepare the prompt for OpenAI
    const prompt = `
    Analyze this Hive blog post and determine how strongly it demonstrates charitable activities or intent.
    
    Title: ${title}
    
    Content: ${content.substring(0, 3000)}
    
    Please provide:
    1. A CHARY Score from 0-10 where:
       - 0-3: Minimal or no charitable activity
       - 4-6: Some charitable intent or indirect support
       - 7-10: Strong evidence of direct charitable activities
       
    2. A brief summary in German (2-3 sentences) explaining the charitable aspects of the post or lack thereof.
    
    Format your response as JSON with fields 'score' (number) and 'summary' (string).
    `;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    
    let result;
    try {
      // Try to parse the response as JSON
      result = JSON.parse(assistantMessage);
    } catch (error) {
      console.log('Failed to parse JSON response, extracting manually');
      
      // Extract the score (looking for a number from 0-10)
      const scoreMatch = assistantMessage.match(/score['"]?\s*:\s*([0-9]|10)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      
      // Extract the summary (anything in quotes after "summary")
      let summaryMatch = assistantMessage.match(/summary['"]?\s*:\s*['"]([^'"]+)['"]/i);
      if (!summaryMatch) {
        // Try to find any paragraph that might be the summary
        const paragraphs = assistantMessage.split('\n').filter(p => p.trim().length > 0);
        const summary = paragraphs.find(p => p.trim().length > 20 && !p.includes('score'));
        summaryMatch = summary ? [null, summary] : null;
      }
      
      const summary = summaryMatch 
        ? summaryMatch[1] 
        : "Konnte keine klare Analyse erstellen. Bitte überprüfen Sie den Inhalt manuell.";
      
      result = { score, summary };
    }
    
    console.log('Analysis result:', result);

    // Return the final result
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in analyze-charity function:', error);
    
    return new Response(
      JSON.stringify({
        score: 0,
        summary: `Fehler bei der Analyse: ${error.message}`
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
