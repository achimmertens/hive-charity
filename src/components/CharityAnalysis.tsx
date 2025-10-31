
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from 'lucide-react';
import { CharityAnalysis } from '@/utils/charityAnalysis';
import { Skeleton } from "@/components/ui/skeleton";
import { parseOpenAIResponse } from '@/lib/openaiResponse';

interface CharityAnalysisProps {
  analysis: CharityAnalysis | null;
  loading: boolean;
  openaiResponse?: string | null;
}

export const CharityAnalysisDisplay: React.FC<CharityAnalysisProps> = ({ analysis, loading, openaiResponse }) => {
  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="h-6 w-6 mr-2 animate-spin text-hive" />
            <span>Der Text wird jetzt analysiert</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Bitte warten Sie, während der Artikel auf caritative Aspekte geprüft wird...</p>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  // Parse the structured OpenAI response if available
  const parsed = openaiResponse ? parseOpenAIResponse(openaiResponse) : null;

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Charity Score: {analysis.charyScore}/10
            {analysis.isMock && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                Mock
              </span>
            )}
          </span>
          <AlertCircle className={`h-6 w-6 ${analysis.charyScore >= 7 ? 'text-green-500' : analysis.charyScore >= 4 ? 'text-yellow-500' : 'text-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        {parsed?.summary && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">Zusammenfassung:</h4>
            <p className="text-gray-600">{parsed.summary}</p>
          </div>
        )}
        
        {/* Reason */}
        {parsed?.reason && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">Begründung:</h4>
            <p className="text-gray-600">{parsed.reason}</p>
          </div>
        )}
        
        {/* Evidence */}
        {parsed?.evidence && Array.isArray(parsed.evidence) && parsed.evidence.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">Belege:</h4>
            <ul className="list-disc list-inside space-y-1">
              {parsed.evidence.map((item, idx) => (
                <li key={idx} className="text-gray-600 text-sm">{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Fallback if no parsed data available */}
        {!parsed?.summary && !parsed?.reason && (
          <p className="text-gray-600">{analysis.summary}</p>
        )}
      </CardContent>
    </Card>
  );
};
