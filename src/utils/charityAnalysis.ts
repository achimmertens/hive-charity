import { HivePost } from "@/services/hivePost";
import { supabase } from "@/integrations/supabase/client";

export interface CharityAnalysis {
  charyScore: number;
  summary: string;
  isMock?: boolean;
}

export async function analyzeCharityPost(post: HivePost): Promise<CharityAnalysis> {
  try {
    console.log('Analyzing post:', post.title);
    console.log('Author reputation:', post.author_reputation);
    
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
      // Use Supabase client to call the edge function
      const { data, error } = await supabase.functions.invoke('analyze-charity', {
        body: JSON.stringify({ ...requestPayload, prompt: promptFromClient }),
      });
      
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
      // Store the analysis result in the database
      // Always upsert (insert or update) so every scanned article appears in the history
      const analysisData = {
        article_url: `https://peakd.com/@${post.author}/${post.permlink}`,
        author_name: post.author,
        created_at: post.created,
        charity_score: data.score,
        openai_response: data.summary,
        image_url: post.image_url,
        author_reputation: post.author_reputation,
        analyzed_at: new Date().toISOString(),
        title: post.title,
        archived: false, // ensure new analyses are not archived
        is_favorite: false // standardmäßig nicht als Favorit markiert
      };

      console.log('Saving to database (upsert):', analysisData);
      // Use upsert to ensure every scanned article appears only once, updated if re-scanned
      const { error: upsertError } = await supabase
        .from('charity_analysis_results')
        .upsert([analysisData], { 
          onConflict: 'article_url',
          ignoreDuplicates: false // Bestehende Einträge aktualisieren
        });

      if (upsertError) {
        console.error('Error storing analysis result:', upsertError);
        throw upsertError; // Fehler weiterwerfen, damit die UI reagieren kann
      } else {
        console.log('Successfully saved to database (upsert)');
      }
      
      return {
        charyScore: typeof data.score === 'number' ? data.score : 0,
        summary: data.summary || "Keine klare Analyse verfügbar.",
        isMock: false
      };
      
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
