import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import AnalysisHistoryTable from "@/components/AnalysisHistoryTable";
import { useCharyInComments } from "@/hooks/useCharyInComments";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

// Table columns to be shown and sorted
const columns = [
  { key: 'author_name', label: 'Autor' },
  { key: 'author_reputation', label: 'Reputation' },
  { key: 'analyzed_at', label: 'Analysiert am' },
  { key: 'title', label: 'Artikel-Titel' },
];


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
  const [selectedForFavorites, setSelectedForFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const { toast } = useToast();

  // Fetch analysis data with pagination
  const { data: analysisData, isLoading, error, refetch } = useQuery({
    queryKey: ['charityAnalyses', currentPage, sortKey, sortDirection],
    queryFn: async () => {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;

      const { data, error, count } = await supabase
        .from('charity_analysis_results')
        .select('*', { count: 'exact' })
        .eq('archived', false) // Nur nicht-archivierte Einträge anzeigen
        .order(sortKey === 'analyzed_at' ? 'analyzed_at' : sortKey, { ascending: sortDirection === 'asc' })
        .range(startIndex, endIndex);
      
      if (error) throw error;
      
      const analysesWithTitle = (data ?? []).map(a => ({
        ...a,
        title: getTitleFromUrl(a.article_url, a.openai_response)
      }));

      // Filter out entries with Chinese characters in title or summary
      const cjkRegex = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
      const filtered = analysesWithTitle.filter(a => {
        const t = a.title || '';
        const s = a.openai_response || '';
        return !cjkRegex.test(t) && !cjkRegex.test(s);
      });
      
      return {
        analyses: filtered,
        totalCount: count || 0
      };
    }
  });

  const analyses = analysisData?.analyses || [];
  const totalCount = analysisData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch favorites statuses
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

  const charyMap = useCharyInComments(analyses);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleToggleFavorite = async (analysisId: string, value: boolean) => {
    setFavoriteMap(prev => ({
      ...prev,
      [analysisId]: value
    }));
    
    if (value) {
      setSelectedForFavorites(prev => [...prev, analysisId]);
    } else {
      setSelectedForFavorites(prev => prev.filter(id => id !== analysisId));
    }
  };



  const handleFavoritesSelected = async () => {
    if (selectedForFavorites.length === 0) {
      toast({
        title: "Keine Artikel ausgewählt",
        description: "Bitte wählen Sie mindestens einen Artikel für Favoriten aus.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ is_favorite: true })
        .in('id', selectedForFavorites);
      
      if (error) throw error;
      
      toast({
        title: "Zu Favoriten hinzugefügt",
        description: `${selectedForFavorites.length} Artikel wurden zu Favoriten hinzugefügt.`,
      });
      
      // Reset state and refresh data
      setSelectedForFavorites([]);
      setFavoriteMap({});
      refetch();
      
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Hinzufügen zu Favoriten.",
        variant: "destructive"
      });
    }
  };

  const handleToggleChary = async (_analysisId: string, postId: string, value: boolean) => {
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

  if (!analyses || analyses.length === 0) {
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
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Seite {currentPage} von {totalPages} ({totalCount} Artikel insgesamt)
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleFavoritesSelected} 
            variant="outline"
            className="border-hive text-hive hover:bg-hive hover:text-white"
            disabled={selectedForFavorites.length === 0}
          >
            {selectedForFavorites.length > 0 ? `${selectedForFavorites.length} ` : ''}Favoriten hinzufügen
          </Button>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <AnalysisHistoryTable
            columns={columns}
            analyses={analyses}
            charyMap={charyMap}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onToggleFavorite={handleToggleFavorite}
            onToggleChary={handleToggleChary}
            favoriteMap={favoriteMap}
          />
        </div>
      </Card>
      
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={pageNum === currentPage}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;

