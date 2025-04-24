
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import AnalysisHistoryTable from "@/components/AnalysisHistoryTable";
import { useCharyInComments } from "@/hooks/useCharyInComments";

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

function getTitleFromUrl(url: string, openai_response: string): string {
  // Tries to extract the title from the OpenAI summary or the URL
  if (openai_response && openai_response.length > 0) {
    const first = openai_response.split('\n')[0];
    if (first.length < 80) return first;
  }
  if (!url) return "";
  const match = url.match(/\/@[^\/]+\/(.*)$/);
  if (match && match[1]) return decodeURIComponent(match[1]).slice(0, 52);
  return url.slice(0, 52);
}

const AnalysisHistory = () => {
  const [sortKey, setSortKey] = useState('analyzed_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [archiveMap, setArchiveMap] = useState<Record<string, boolean>>({});
  const [selectedForArchiving, setSelectedForArchiving] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch analysis data
  const { data: analyses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['charityAnalyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charity_analysis_results')
        .select('*')
        .eq('archived', false)  // Only get non-archived entries
        .order('analyzed_at', { ascending: false });
      
      if (error) throw error;
      
      // Add pseudo title for sorting
      const analysesWithTitle = (data ?? []).map(a => ({
        ...a,
        title: getTitleFromUrl(a.article_url, a.openai_response)
      }));
      
      return analysesWithTitle;
    }
  });

  // Fetch favorites and archived statuses
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: favoritesData } = await supabase
          .from('charity_analysis_results')
          .select('id')
          .eq('is_favorite', true);
        
        if (favoritesData) {
          const newFavoriteMap: Record<string, boolean> = {};
          favoritesData.forEach(item => {
            newFavoriteMap[item.id] = true;
          });
          setFavoriteMap(newFavoriteMap);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };
    
    fetchFavorites();
  }, []);

  // Sort analyses
  const sortedAnalyses = [...analyses].sort((a, b) =>
    sortDirection === 'asc'
      ? ascendingComparator(a, b, sortKey)
      : descendingComparator(a, b, sortKey)
  );

  const charyMap = useCharyInComments(sortedAnalyses);

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
      
      setFavoriteMap(prev => ({
        ...prev,
        [analysisId]: value
      }));
      
      toast({
        title: value ? "Als Favorit markiert" : "Aus Favoriten entfernt",
        description: `Der Artikel wurde ${value ? 'zu den Favoriten hinzugefügt' : 'aus den Favoriten entfernt'}.`,
      });
      
      // Refetch data to update the UI
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

  const handleToggleArchive = (analysisId: string, value: boolean) => {
    setArchiveMap(prev => ({
      ...prev,
      [analysisId]: value
    }));
    
    if (value) {
      setSelectedForArchiving(prev => [...prev, analysisId]);
    } else {
      setSelectedForArchiving(prev => prev.filter(id => id !== analysisId));
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedForArchiving.length === 0) {
      toast({
        title: "Keine Artikel ausgewählt",
        description: "Bitte wählen Sie mindestens einen Artikel zum Archivieren aus.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ archived: true })
        .in('id', selectedForArchiving);
      
      if (error) throw error;
      
      toast({
        title: "Archiviert",
        description: `${selectedForArchiving.length} Artikel wurden archiviert.`,
      });
      
      // Reset state and refresh data
      setSelectedForArchiving([]);
      setArchiveMap({});
      refetch();
      
    } catch (error) {
      console.error('Error archiving articles:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Archivieren der Artikel.",
        variant: "destructive"
      });
    }
  };

  const handleToggleChary = async (analysisId: string, postId: string, value: boolean) => {
    // This is just for UI update, actual functionality would require API integration
    const newCharyMap = { ...charyMap };
    newCharyMap[postId] = value;
    
    toast({
      title: value ? "!CHARY markiert" : "!CHARY entfernt",
      description: `Der Artikel wurde als ${value ? '!CHARY markiert' : '!CHARY entfernt'}.`,
    });
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
            <p>Fehler beim Laden der Analysen: {error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!sortedAnalyses || sortedAnalyses.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Charity-Analysen Historie</h1>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Keine Daten vorhanden</h3>
            <p>
              Es wurden noch keine Artikel analysiert. Bitte kehren Sie zur Hauptseite zurück 
              und klicken Sie auf "Artikel auf Charity Scannen", um Daten in dieser Tabelle zu sehen.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Charity-Analysen Historie</h1>
      <div className="flex justify-end mb-4">
        {selectedForArchiving.length > 0 && (
          <Button 
            onClick={handleArchiveSelected} 
            className="bg-hive hover:bg-hive-dark"
          >
            {selectedForArchiving.length} Artikel archivieren
          </Button>
        )}
      </div>
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
            onToggleArchive={handleToggleArchive}
            onToggleChary={handleToggleChary}
            favoriteMap={favoriteMap}
            archiveMap={archiveMap}
            showArchiveButton={selectedForArchiving.length > 0}
          />
        </div>
      </Card>
    </div>
  );
};

export default AnalysisHistory;
