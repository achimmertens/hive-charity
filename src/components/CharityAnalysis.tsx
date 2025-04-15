
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';
import { CharityAnalysis } from '@/utils/charityAnalysis';

interface CharityAnalysisProps {
  analysis: CharityAnalysis | null;
  loading: boolean;
}

export const CharityAnalysisDisplay: React.FC<CharityAnalysisProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Charity Score: {analysis.charyScore}/10</span>
          <AlertCircle className={`h-6 w-6 ${analysis.charyScore >= 7 ? 'text-green-500' : analysis.charyScore >= 4 ? 'text-yellow-500' : 'text-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{analysis.summary}</p>
      </CardContent>
    </Card>
  );
};
