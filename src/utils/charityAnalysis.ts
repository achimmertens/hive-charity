import { HivePost } from "@/services/hivePost";
import { supabase } from "@/integrations/supabase/client";

// Helper-Funktion für das Warten
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry-Konfiguration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 Sekunde
  maxDelay: 10000 // 10 Sekunden
};

// Rate Limiting Konfiguration
const RATE_LIMIT = {
  maxRequests: 3, // Maximale Anzahl von Anfragen
  timeWindow: 60000, // Zeitfenster in Millisekunden (1 Minute)
  requests: [] as number[] // Zeitstempel der Anfragen
};

// Cache Konfiguration
const ANALYSIS_CACHE = new Map<string, {
  analysis: CharityAnalysis;
  timestamp: number;
}>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

export interface CharityAnalysis {
  charyScore: number;
  summary: string;
  isMock?: boolean;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  // Entferne alte Anfragen außerhalb des Zeitfensters
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(
    timestamp => now - timestamp < RATE_LIMIT.timeWindow
  );
  // Prüfe, ob noch Anfragen möglich sind
  return RATE_LIMIT.requests.length < RATE_LIMIT.maxRequests;
}

export async function analyzeCharityPost(post: HivePost): Promise<CharityAnalysis> {
  try {
    console.log('Analyzing post:', post.title);
    console.log('Author reputation:', post.author_reputation);

    // Erstelle einen Cache-Key aus Autor und Permlink
    const cacheKey = `${post.author}/${post.permlink}`;

    // Prüfe Cache
    const cachedResult = ANALYSIS_CACHE.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log('Using cached analysis for:', post.title);
      return cachedResult.analysis;
    }

    // Prüfe Rate Limit bevor wir die Analyse starten
    if (!checkRateLimit()) {
      console.warn('Rate limit reached, using fallback analysis');
      return generateMockAnalysis(post.body);
    }
    
    // Füge aktuelle Anfrage zum Rate Limiting hinzu
    RATE_LIMIT.requests.push(Date.now());
    
    // Use the full content of the post
    const postContent = post.body;
    
    // Call our Supabase Edge Function
    console.log('Sending request to Edge Function...');
    const requestPayload = {
      title: post.title,
      content: postContent
    };
    try { console.log('Edge Function request payload (truncated):', { title: requestPayload.title, content: requestPayload.content?.slice(0, 500) + '...' }); } catch {}
    
    try {
      let promptFromClient: string | undefined;
      try {
        // Try to import the examples from src to pass into the edge function
        // @ts-ignore - vite raw import
        const raw = await import('@/charityExamples.txt?raw');
        promptFromClient = typeof raw.default === 'string' ? raw.default : undefined;
        if (promptFromClient) {
          console.log('Loaded charityExamples.txt from src (client)');
        }
      } catch (e) {
        console.warn('Could not load src/charityExamples.txt on client:', e);
      }
      // Use Supabase client to call the edge function with retry logic
      let data, error;
      for (let retryCount = 0; retryCount <= RETRY_CONFIG.maxRetries; retryCount++) {
        try {
          if (retryCount > 0) {
            // Exponential Backoff: 1s, 2s, 4s, ...
            const delayTime = Math.min(
              RETRY_CONFIG.initialDelay * Math.pow(2, retryCount - 1),
              RETRY_CONFIG.maxDelay
            );
            console.log(`Retry attempt ${retryCount}, waiting ${delayTime}ms...`);
            await delay(delayTime);
          }

          const response = await supabase.functions.invoke('analyze-charity', {
            body: JSON.stringify({ ...requestPayload, prompt: promptFromClient }),
          });
          
          data = response.data;
          error = response.error;

          // Wenn kein Fehler auftritt, brechen wir die Retry-Schleife ab
          if (!error || !error.message?.includes('429')) {
            break;
          }
        } catch (err) {
          error = err;
          console.warn(`Retry attempt ${retryCount + 1} failed:`, err);
          // Weitermachen mit der nächsten Iteration, falls noch Versuche übrig sind
          if (retryCount < RETRY_CONFIG.maxRetries) {
            continue;
          }
        }
      }
      
      if (error) {
        console.error('Edge function error:', error);
        return generateMockAnalysis(postContent);
      }
      
      if (!data) {
        console.warn('No data returned from edge function');
        return generateMockAnalysis(postContent);
      }
      
      // If the edge function returns an error property, use fallback
      if (data.error) {
        console.warn('Edge function returned an error:', data.message);
        return generateMockAnalysis(postContent);
      }
      
      console.log('Edge Function response:', data);
      if (data?.model) {
        console.log('Edge Function indicates OpenAI model used:', data.model);
      } else {
        console.warn('Edge Function did not include model info.');
      }
      
      // Post-processing heuristics to improve reliability (keyword boosts / plan detection)
      const lowered = (data.summary || "" + " " + data.model || "").toLowerCase();
      const strongKeywords = [/gespendet/, /gesammelt/, /übergeben/, /verteilt/, /zahlung/, /paid/, /donat/, /raised/, /fundrais/];
      const planKeywords = [/planen/, /wir wollen/, /werden kaufen/, /bitte helft/, /wollen nächste/, /planen, einen/];
      let boost = 0;
      try {
        for (const rx of strongKeywords) if (rx.test(lowered)) boost += 3;
        for (const rx of planKeywords) if (rx.test(lowered)) boost -= 2;
      } catch (_) { /* ignore */ }

      // Store the analysis result in the database (only for real analyses, not mocks)
      // Also store the structured response from the edge function if available
      const structured = {
        score: typeof data.score === 'number' ? data.score : (data.score ? Number(data.score) : 0),
        summary: data.summary || '',
        reason: data.reason || '',
        evidence: data.evidence || []
      };

      const adjustedScore = Math.max(0, Math.min(10, Math.round((structured.score || 0) + boost)));

      const analysisData = {
        article_url: `https://peakd.com/@${post.author}/${post.permlink}`,
        author_name: post.author,
        created_at: post.created,
        charity_score: adjustedScore,
        openai_response: JSON.stringify(structured),
        image_url: post.image_url,
        author_reputation: post.author_reputation,
        analyzed_at: new Date().toISOString(),
        title: post.title,
        archived: false,
        is_favorite: false,
        chary_marked: false
      };

      console.log('Saving real analysis to database (upsert):', analysisData);
      const { error: upsertError } = await supabase
        .from('charity_analysis_results')
        .upsert([analysisData], { 
          onConflict: 'article_url',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error storing analysis result:', upsertError);
        throw upsertError;
      } else {
        console.log('Successfully saved real analysis to database');
      }
      
      const analysis = {
        charyScore: typeof data.score === 'number' ? data.score : 0,
        summary: data.summary || "Keine klare Analyse verfügbar.",
        isMock: false
      };

      // Speichere Analyse im Cache
      ANALYSIS_CACHE.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });
      
      return analysis;
      
    } catch (error) {
      console.error('Edge function request failed:', error);
      return generateMockAnalysis(postContent);
    }
    
  } catch (error) {
    console.error('Error analyzing charity post:', error);
    return {
      charyScore: 0,
      summary: "Fehler bei der Analyse. Bitte versuchen Sie es später erneut.",
      isMock: true
    };
  }
}

// Separate function to generate mock analysis for development/fallback
function generateMockAnalysis(postContent: string): CharityAnalysis {
  console.log('Using fallback mock analysis for demonstration');
  
  // Parse the content and assign a basic score
  const hasCharityWords = postContent.toLowerCase().includes('charity') || 
                         postContent.toLowerCase().includes('spende') ||
                         postContent.toLowerCase().includes('helfen');
                         
  const mockScore = hasCharityWords ? Math.floor(Math.random() * 6) + 5 : Math.floor(Math.random() * 5);
  
  let mockSummary = "";
  if (mockScore >= 8) {
    mockSummary = "Dieser Beitrag beschreibt eindeutig karitative Aktivitäten mit direkter Hilfe für Bedürftige.";
  } else if (mockScore >= 5) {
    mockSummary = "Der Beitrag enthält Hinweise auf karitative Absichten und einige unterstützende Aktivitäten.";
  } else {
    mockSummary = "Nur begrenzte Hinweise auf karitative Tätigkeiten im Beitrag gefunden.";
  }
  
  return {
    charyScore: mockScore,
    summary: mockSummary + " (Mock)",
    isMock: true
  };
}
