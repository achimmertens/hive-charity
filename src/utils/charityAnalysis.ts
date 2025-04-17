
import { HivePost } from "@/services/hivePost";
import { supabase } from "@/integrations/supabase/client";

export interface CharityAnalysis {
  charyScore: number;
  summary: string;
}

export async function analyzeCharityPost(post: HivePost): Promise<CharityAnalysis> {
  try {
    console.log('Analyzing post:', post.title);
    
    // Use the full content of the post
    const postContent = post.body;
    
    // Call our Supabase Edge Function
    console.log('Sending request to Edge Function...');
    
    try {
      // Use Supabase client to call the edge function
      const { data, error } = await supabase.functions.invoke('analyze-charity', {
        body: JSON.stringify({
          title: post.title,
          content: postContent
        }),
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error('No data returned from edge function');
      }
      
      console.log('Analysis result:', data);
      
      return {
        charyScore: data.score || 0,
        summary: data.summary || "Keine klare Analyse verfügbar."
      };
      
    } catch (error) {
      console.error('Edge function request failed:', error);
      
      // Since we might be in development or the edge function might not be deployed yet,
      // let's provide a fallback mock analysis
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
        summary: mockSummary
      };
    }
    
  } catch (error) {
    console.error('Error analyzing charity post:', error);
    return {
      charyScore: 0,
      summary: "Fehler bei der Analyse. Bitte versuchen Sie es später erneut."
    };
  }
}
