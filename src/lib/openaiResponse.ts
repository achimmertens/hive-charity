// Utility to parse the OpenAI response stored in the DB.
// The Edge function and client now store a JSON string in `openai_response` when possible.
// This helper is defensive: it tries to parse JSON, falls back to extracting a first line summary
// when the field is plain text, and always returns a stable shape.

export type ParsedOpenAI = {
  score?: number | null;
  summary?: string | null;
  reason?: string | null;
  evidence?: string | null;
  raw?: string | null;
};

export function parseOpenAIResponse(openai_response?: string | null): ParsedOpenAI {
  if (!openai_response) return { raw: null };

  // Try to parse JSON first
  try {
    const obj = JSON.parse(openai_response);
    // If it looks like the structured object we expect, return a normalized shape
    if (obj && (obj.score !== undefined || obj.summary !== undefined || obj.reason !== undefined)) {
      return {
        score: typeof obj.score === 'number' ? obj.score : obj.score ? Number(obj.score) : null,
        summary: obj.summary ?? null,
        reason: obj.reason ?? null,
        evidence: obj.evidence ?? null,
        raw: openai_response
      };
    }
  } catch (e) {
    // Not JSON — continue to fallback parsing
  }

  // Fallback heuristics: look for labelled fields in plain-text responses
  const parsed: ParsedOpenAI = { raw: openai_response };

  // Try to extract a score like "Score: 7/10" or "score: 7"
  const scoreMatch = openai_response.match(/score\D{0,6}(\d{1,2})(?:\s*\/\s*10)?/i);
  if (scoreMatch) parsed.score = Number(scoreMatch[1]);

  // Try to find a section headers summary/reason/evidence in the text
  const summaryMatch = openai_response.match(/summary[:\-\s]*([\s\S]*?)(?:\n\s*reason[:\-\s]*|\n\s*evidence[:\-\s]*|$)/i);
  if (summaryMatch) parsed.summary = summaryMatch[1].trim();

  const reasonMatch = openai_response.match(/reason[:\-\s]*([\s\S]*?)(?:\n\s*evidence[:\-\s]*|$)/i);
  if (reasonMatch) parsed.reason = reasonMatch[1].trim();

  const evidenceMatch = openai_response.match(/evidence[:\-\s]*([\s\S]*?)$/i);
  if (evidenceMatch) parsed.evidence = evidenceMatch[1].trim();

  // If we still don't have a summary, use the first non-empty line as a fallback
  if (!parsed.summary) {
    const first = openai_response.split('\n').find(l => l.trim().length > 0);
    parsed.summary = first ? first.trim() : openai_response.slice(0, 200);
  }

  return parsed;
}

export function shortSummary(summary?: string | null, max = 120) {
  if (!summary) return '';
  if (summary.length <= max) return summary;
  return summary.slice(0, max).trim() + '...';
}
