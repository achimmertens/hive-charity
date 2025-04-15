
import { supabase } from "@/integrations/supabase/client";
import { HivePost } from "@/services/hivePost";

export interface CharityAnalysis {
  charyScore: number;
  summary: string;
}

export async function analyzeCharityPost(post: HivePost): Promise<CharityAnalysis> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Your name is CharityChecker. You are an AI assistant that evaluates social media content strictly based on the given text.
            Your task is to determine whether the text explicitly indicates that the author has done something good for one or more people.
            Answer in German. NEVER ADD, INVENT, OR ASSUME ANY INFORMATION NOT EXPLICITLY STATED IN THE TEXT.`
          },
          {
            role: "user",
            content: post.body
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // Extract the CHARY score and summary
    const scoreMatch = analysisText.match(/!CHARY:(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    const summary = analysisText.split('\n')[1] || 'Keine Analyse verfügbar.';

    return {
      charyScore: score,
      summary: summary
    };
  } catch (error) {
    console.error('Error analyzing charity post:', error);
    return {
      charyScore: 0,
      summary: 'Fehler bei der Analyse.'
    };
  }
}
