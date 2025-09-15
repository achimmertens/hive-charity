
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from 'lucide-react';
import { CharityAnalysis } from '@/utils/charityAnalysis';
import { Skeleton } from "@/components/ui/skeleton";

interface CharityAnalysisProps {
  analysis: CharityAnalysis | null;
  loading: boolean;
}

export const CharityAnalysisDisplay: React.FC<CharityAnalysisProps> = ({ analysis, loading }) => {
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

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Charity Score: {analysis.charyScore}/10
            {analysis.isMock && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">Mock</span>
            )}
          </span>
          <AlertCircle className={`h-6 w-6 ${analysis.charyScore >= 7 ? 'text-green-500' : analysis.charyScore >= 4 ? 'text-yellow-500' : 'text-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{analysis.summary}</p>
      </CardContent>
    </Card>
  );
};
