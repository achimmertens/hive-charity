
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import AnalysisHistoryTable from "@/components/AnalysisHistoryTable";
import { useCharyInComments } from "@/hooks/useCharyInComments";

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
  if (openai_response && openai_response.length > 0) {
    const first = openai_response.split('\n')[0];
    if (first.length < 80) return first;
  }
  if (!url) return "";
  const match = url.match(/\/@[^\/]+\/(.*)$/);
  if (match && match[1]) return decodeURIComponent(match[1]).slice(0, 52);
  return url.slice(0, 52);
}

const Archive = () => {
  const [sortKey, setSortKey] = useState('analyzed_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [selectedForRestore, setSelectedForRestore] = useState<string[]>([]);
  const [archiveMap, setArchiveMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Explicitly fetch only archived items
  const { data: analyses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['archivedAnalyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charity_analysis_results')
        .select('*')
        .eq('archived', true)
        .order('analyzed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching archived items:', error);
        throw error;
      }
      
      return data?.map(a => ({
        ...a,
        title: getTitleFromUrl(a.article_url, a.openai_response)
      })) ?? [];
    }
  });

  // Set up favorite map
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
  
  // Set up archive map - all items in this view are archived
  useEffect(() => {
    if (analyses.length > 0 && Object.keys(archiveMap).length === 0) {
      const newArchiveMap: Record<string, boolean> = {};
      analyses.forEach(item => {
        newArchiveMap[item.id] = true;
      });
      setArchiveMap(newArchiveMap);
    }
  }, [analyses, archiveMap]);

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
    
    if (!value) {
      setSelectedForRestore(prev => [...prev, analysisId]);
    } else {
      setSelectedForRestore(prev => prev.filter(id => id !== analysisId));
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedForRestore.length === 0) {
      toast({
        title: "Keine Artikel ausgewählt",
        description: "Bitte wählen Sie mindestens einen Artikel zum Wiederherstellen aus.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ archived: false })
        .in('id', selectedForRestore);
      
      if (error) throw error;
      
      toast({
        title: "Wiederhergestellt",
        description: `${selectedForRestore.length} Artikel wurden wiederhergestellt.`,
      });
      
      setSelectedForRestore([]);
      setArchiveMap({});
      refetch();
      
    } catch (error) {
      console.error('Error restoring articles:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Wiederherstellen der Artikel.",
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
            <p>Fehler beim Laden des Archivs: {error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!sortedAnalyses || sortedAnalyses.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Archiv</h1>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Keine archivierten Artikel vorhanden</h3>
            <p>
              Es wurden noch keine Artikel archiviert. Bitte gehen Sie zur Analyse-Historie,
              um Artikel zu archivieren.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Archiv</h1>
      <div className="flex justify-end mb-4">
        {selectedForRestore.length > 0 && (
          <Button 
            onClick={handleRestoreSelected} 
            className="bg-hive hover:bg-hive-dark"
          >
            {selectedForRestore.length} Artikel wiederherstellen
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
            favoriteMap={favoriteMap}
            archiveMap={archiveMap}
            showArchiveButton={selectedForRestore.length > 0}
          />
        </div>
      </Card>
    </div>
  );
};

export default Archive;
