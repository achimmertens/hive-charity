
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
    // Get the Gemini API key from environment (.env)
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not found in environment variables');
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Gemini API key is missing. Please set the GEMINI_API_KEY secret in Supabase.',
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
    const { title, content } = requestData;
    
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
    // Load the strict prompt and examples from environment variable
    // Load the prompt and examples from charityExamples.txt at runtime
    let charityPrompt = '';
    try {
      // Read prompt and examples from function directory
      charityPrompt = await Deno.readTextFile('./charityExamples.txt');
    } catch (err) {
      console.error('Could not read charityExamples.txt:', err);
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Could not read charityExamples.txt. Please ensure the file exists in the function folder.',
          score: 0,
          summary: 'Die Analyse konnte nicht durchgeführt werden, da die Prompt-Datei fehlt.'
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
    // Compose the full prompt for Gemini
    const prompt = `${charityPrompt}\n\n---\nNow analyze the following Hive blog post according to the instructions and examples above.\nTitle: ${title}\nContent: ${content.substring(0, 3000)}\n\nReturn your answer in JSON format with fields 'score' (number) and 'summary' (string).`;

    try {
      // Call Gemini API
      console.log('Sending request to Gemini API...');
      console.log('Using API key with first 5 chars:', GEMINI_API_KEY.substring(0, 5) + '...');

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} ${errorText}`);
        return new Response(
          JSON.stringify({
            error: true,
            message: `Gemini API error: ${response.status}`,
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
      console.log('Gemini API response received');

      // Gemini response parsing
      let answer = "";
      try {
        // Robust: candidates kann fehlen oder leer sein
        if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
          answer = data.candidates[0].content.parts[0].text;
        } else {
          throw new Error("Gemini response missing candidates or content");
        }
      } catch (e) {
        console.error('Failed to parse Gemini response:', e);
        return new Response(
          JSON.stringify({
            error: true,
            message: 'Fehler beim Parsen der Gemini-Antwort.',
            score: 0,
            summary: 'Fehler beim Parsen der Gemini-Antwort.'
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

      let result;
      try {
        result = JSON.parse(answer);
        console.log('Successfully parsed JSON response from Gemini');
      } catch (error) {
        console.log('Failed to parse JSON response from Gemini, extracting manually');
        // Extract the score (looking for a number from 0-10)
        const scoreMatch = answer.match(/score['"]?\s*:\s*([0-9]|10)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
        // Extract the summary (anything in quotes after "summary")
        let summaryMatch = answer.match(/summary['"]?\s*:\s*['"]([^'"]+)['"]/i);
        let summary = "";
        if (summaryMatch && summaryMatch[1]) {
          summary = summaryMatch[1];
        } else {
          // Try to find any paragraph that might be the summary
          const paragraphs = answer.split('\n').filter(p => p.trim().length > 0);
          const found = paragraphs.find(p => p.trim().length > 20 && !p.includes('score'));
          summary = found || "Konnte keine klare Analyse erstellen. Bitte überprüfen Sie den Inhalt manuell.";
        }
        result = { score, summary };
        console.log('Manually extracted result from Gemini:', result);
      }

      // Validate that we have a score and summary
      if (!result.score && result.score !== 0) {
        result.score = 0;
      }
      if (!result.summary) {
        result.summary = "Keine klare Analyse verfügbar.";
      }
      console.log('Final analysis result from Gemini:', result);

      // Return the final result
      return new Response(
        JSON.stringify({
          score: result.score,
          summary: result.summary
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
      
    } catch (error) {
      console.error('Gemini API request error:', error);
      
      return new Response(
        JSON.stringify({
          error: true,
          message: `Error calling Gemini API: ${error.message}`,
          score: 0,
          summary: 'Fehler bei der Analyse. Bitte versuchen Sie es später erneut.'
        }),
        { 
          status: 200, // Return 200 so client can handle this gracefully
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
  } catch (error) {
    console.error('Error in analyze-charity function:', error);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message,
        score: 0,
        summary: `Fehler bei der Analyse: ${error.message}`
      }),
      { 
        status: 200, // Returning 200 even for errors to ensure client can process them
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
