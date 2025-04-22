
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card } from "@/components/ui/card";

const AnalysisHistory = () => {
  const { data: analyses, isLoading, error } = useQuery({
    queryKey: ['charityAnalyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charity_analysis_results')
        .select('*')
        .order('analyzed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hive"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="p-6">
          <p className="text-red-500">Fehler beim Laden der Analysen: {error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Charity-Analysen Historie</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Autor</TableHead>
                <TableHead>Reputation</TableHead>
                <TableHead>Charity Score</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead>Analysiert am</TableHead>
                <TableHead>OpenAI Analyse</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses?.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell>
                    <a 
                      href={analysis.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-hive hover:underline"
                    >
                      {analysis.author_name}
                    </a>
                  </TableCell>
                  <TableCell>{analysis.author_reputation?.toFixed(0) || 'N/A'}</TableCell>
                  <TableCell>{analysis.charity_score}</TableCell>
                  <TableCell>
                    {format(new Date(analysis.created_at), 'PPp', { locale: de })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(analysis.analyzed_at), 'PPp', { locale: de })}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">{analysis.openai_response}</div>
                  </TableCell>
                  <TableCell>
                    {analysis.image_url && (
                      <a
                        href={analysis.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-hive hover:underline"
                      >
                        Bild anzeigen
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AnalysisHistory;
