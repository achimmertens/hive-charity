
import { HivePost } from "@/services/hivePost";

export interface CharityAnalysis {
  charyScore: number;
  summary: string;
}

export async function analyzeCharityPost(post: HivePost): Promise<CharityAnalysis> {
  try {
    console.log('Analyzing post:', post.title);
    
    // Verwende den vollständigen Inhalt des Posts
    const postContent = post.body;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Your name is CharityChecker. You are an AI assistant that evaluates social media content strictly based on the given text.
            Your task is to determine whether the text explicitly indicates that the author has done something good for one or more people.
            Answer in the language in which the text is written.
            NEVER ADD, INVENT, OR ASSUME ANY INFORMATION NOT EXPLICITLY STATED IN THE TEXT.
            
            Rating guidelines:
            - Only rate actions explicitly mentioned in the text.
            - Charitable acts are those that directly help people alleviate hunger, hardship, illness, or other suffering.
            - Rate the text on a CHARY scale from 0 to 10.
            - Evaluate the CHARY score by rating the Charitable Intent, the Specificity, the Emotional Connection, the Transparency and the Call to Action.
            - 0 means: no recognizable charitable act was found in the text
            - 10 means: an extraordinarily charitable act was explicitly described in the text
            - If the text does not mention any charitable acts, the score must be 0.
            
            Answer format:
            ALWAYS BEGIN YOUR ANSWER EXACTLY with !CHARY:x (where x is the CHARY score from 0-10)
            
            After the score, provide ONLY ONE SHORT SENTENCE explaining your decision, using ONLY information explicitly stated in the text.
            If no charitable act is mentioned, state this fact.
            Build an average of the total !CHARY Score with these criteria:
            1. directness of help:
               - Low (1-3): Indirect or planned aid
               - Medium (4-6): Direct, but one-off or small-scale aid operations
               - High (7-10): Direct, extensive or repeated aid actions
            
            2. scope of the aid:
               - Low (1-3): Aid for individuals or small groups
               - Medium (4-6): Aid for several people or a specific community
               - High (7-10): Help for many people or entire communities
            
            3. type of support:
               - Basic needs (food, clothing, shelter): 5-8 points
               - Medical care: 7-10 points
               - Education and future opportunities: 6-9 points
               - Emotional support: 1-3 points
            
            4. sustainability of the aid:
               - One-off action: 1-5 points
               - Regular support: 6-8 points
               - Long-term change: 9-10 points
            
            5. personal commitment:
               - Monetary donation: 3-7 points (depending on the amount)
               - Investment of time: 5-9 points
               - Combination of both: 7-10 points
            
            6. target group:
               - General population: 3-6 points
               - Particularly vulnerable groups (e.g. children, elderly, sick people): 7-10 points
            
            7. context of the aid:
               - In times of normal circumstances: 3-7 points
               - In times of crisis or emergency: 8-10 points
            
            8. Proof of aid:
               - No proof: 1 point
               - Bills with Money that was paid: 7 - 9 points
               - Listing of other helpers: 6-9 points
               - Combination of both: 10 points
            
            Take these criteria into account when evaluating the text and assigning the CHARY score. The final score should reflect a balanced consideration of all relevant criteria.
            
            IF THE AUTHOR ONLY TALKS ABOUT SOMEONE ELSE WHO DOES CHARITY AND IT IS NOT THE AUTHOR ITSELF WHO DOES CHARITY, THEN THE SCORE MUST BE 0.
            IF THE AUTOR DIDN'T DO CHARITY BY HIMSELF OR IS ONLY PLANING TO DO IT, THE SCORE MUST BE 0.`
          },
          {
            role: "user",
            content: postContent
          }
        ],
        temperature: 0.7,
      }),
    });

    // Überprüfen, ob die Antwort erfolgreich war
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      console.error('No valid response from OpenAI:', data);
      throw new Error('Keine gültige Antwort von der KI erhalten.');
    }
    
    const analysisText = data.choices[0].message.content;
    console.log('Raw analysis text:', analysisText);

    // Extract the CHARY score and summary
    const scoreMatch = analysisText.match(/!CHARY:(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    // Get everything after the !CHARY:X pattern as summary
    let summary = '';
    if (scoreMatch) {
      summary = analysisText.substring(analysisText.indexOf(scoreMatch[0]) + scoreMatch[0].length).trim();
    } else {
      summary = analysisText.split('\n')[0] || 'Keine eindeutige Analyse verfügbar.';
    }
    
    // Remove any extra !CHARY labels if present
    summary = summary.replace(/!CHARY:\d+/g, '').trim();
    
    console.log('Extracted score:', score);
    console.log('Extracted summary:', summary);
    
    return {
      charyScore: score,
      summary: summary
    };
  } catch (error) {
    console.error('Error analyzing charity post:', error);
    return {
      charyScore: 0,
      summary: 'Fehler bei der Analyse. Bitte versuchen Sie es später erneut.'
    };
  }
}
