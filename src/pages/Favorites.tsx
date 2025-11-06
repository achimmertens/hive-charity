
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import AnalysisHistoryTable from "@/components/AnalysisHistoryTable";
import { useCharyInComments } from "@/hooks/useCharyInComments";
import { useToast } from "@/hooks/use-toast";

// Table columns to be shown and sorted
const columns = [
  { key: 'author_name', label: 'Autor' },
  { key: 'author_reputation', label: 'Reputation' },
  { key: 'created_at', label: 'Erstellt am' },
  { key: 'title', label: 'Artikel-Titel' },
];

const descendingComparator = (a: any, b: any, orderBy: string) => {
  if (a[orderBy] < b[orderBy]) return 1;
  if (a[orderBy] > b[orderBy]) return -1;
  return 0;
};

const ascendingComparator = (a: any, b: any, orderBy: string) => {
  if (a[orderBy] < b[orderBy]) return -1;
  if (a[orderBy] > b[orderBy]) return 1;
  return 0;
};

import { parseOpenAIResponse } from '@/lib/openaiResponse';

function getTitleFromUrl(url: string, openai_response: string): string {
  // Tries to extract the title from the OpenAI summary or the URL
  if (openai_response && openai_response.length > 0) {
    try {
      const parsed = parseOpenAIResponse(openai_response);
      if (parsed.summary && parsed.summary.length < 80) return parsed.summary;
    } catch {}
    const first = openai_response.split('\n')[0];
    if (first.length < 80) return first;
  }
  if (!url) return "";
  const match = url.match(/\/@[^\/]+\/(.*)$/);
  if (match && match[1]) return decodeURIComponent(match[1]).slice(0, 52);
  return url.slice(0, 52);
}

const Favorites = () => {
  const [sortKey, setSortKey] = useState('analyzed_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [manualCharyMap, setManualCharyMap] = useState<Record<string, boolean>>({});

  // Fetch favorited analyses (include archived ones so favorites set in Archive also show up)
  const { data: analyses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['favoriteAnalyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charity_analysis_results')
        .select('*')
        .eq('is_favorite', true)
        .order('analyzed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }
      
      return data?.map(a => ({
        ...a,
        title: getTitleFromUrl(a.article_url, a.openai_response)
      })) ?? [];
    }
  });

  // Initialize favoriteMap based on fetched analyses
  useEffect(() => {
    if (analyses.length > 0) {
      const newFavoriteMap: Record<string, boolean> = {};
      analyses.forEach(item => {
        newFavoriteMap[item.id] = true;
      });
      setFavoriteMap(newFavoriteMap);
    }
  }, [analyses]);

  const sortedAnalyses = [...analyses].sort((a, b) =>
    sortDirection === 'asc'
      ? ascendingComparator(a, b, sortKey)
      : descendingComparator(a, b, sortKey)
  );

  const apiCharyMap = useCharyInComments(sortedAnalyses);
  
  // Merge API chary data with database chary_marked and manual changes
  const dbCharyMap: Record<string, boolean> = {};
  sortedAnalyses.forEach(analysis => {
    const urlMatch = analysis.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
    if (urlMatch) {
      const key = `${urlMatch[1]}/${urlMatch[2]}`;
      if (analysis.chary_marked) {
        dbCharyMap[key] = true;
      }
    }
  });
  
  const charyMap = { ...apiCharyMap, ...dbCharyMap, ...manualCharyMap };

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleToggleFavorite = async (analysisId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ is_favorite: value })
        .eq('id', analysisId);
      
      if (error) throw error;
      
      toast({
        title: value ? "Als Favorit markiert" : "Aus Favoriten entfernt",
        description: `Der Artikel wurde ${value ? 'zu den Favoriten hinzugefügt' : 'aus den Favoriten entfernt'}.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Favoritenstatus.",
        variant: "destructive"
      });
    }
  };

  const handleToggleChary = async (analysisId: string, postId: string, value: boolean) => {
    // Update local state immediately for responsive UI
    setManualCharyMap(prev => ({
      ...prev,
      [postId]: value
    }));
    
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ chary_marked: value })
        .eq('id', analysisId);
      
      if (error) throw error;
      
      toast({
        title: value ? "!CHARY markiert" : "!CHARY entfernt",
        description: `Der Artikel wurde als ${value ? '!CHARY markiert' : '!CHARY entfernt'}.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating chary status:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des !CHARY Status.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAnalysis = async (analysisId: string, newResponse: string) => {
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ openai_response: newResponse })
        .eq('id', analysisId);
      
      if (error) throw error;
      
      toast({
        title: "Analyse aktualisiert",
        description: "Die Analyse wurde erfolgreich gespeichert.",
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating analysis:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern der Analyse.",
        variant: "destructive"
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hive"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-6 w-6" />
            <p>Fehler beim Laden der Favoriten: {error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!sortedAnalyses || sortedAnalyses.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Favoriten</h1>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Keine Favoriten vorhanden</h3>
            <p>
              Es wurden keine Favoriten gefunden. Favoriten können in der Analyse-Historie
              oder im Archiv markiert werden (Spalte „Favorit“). Wenn Sie Beiträge als Favoriten
              markiert haben, stellen Sie bitte sicher, dass die Synchronisation mit der Datenbank
              funktioniert oder aktualisieren Sie die Seite.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Favoriten</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <AnalysisHistoryTable
            columns={columns}
            analyses={sortedAnalyses}
            charyMap={charyMap}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onToggleFavorite={handleToggleFavorite}
            onToggleChary={handleToggleChary}
            favoriteMap={favoriteMap}
            onUpdateAnalysis={handleUpdateAnalysis}
            isEditable={true}
          />
        </div>
      </Card>
    </div>
  );
};

export default Favorites;
