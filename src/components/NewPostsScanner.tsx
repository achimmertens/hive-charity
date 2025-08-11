import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, ExternalLink, Tag, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HivePost, fetchCharityPosts } from "@/services/hivePost";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCharityPost, CharityAnalysis } from "@/utils/charityAnalysis";
import { CharityAnalysisDisplay } from "./CharityAnalysis";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const NewPostsScanner: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CharityAnalysis | null>>({});
  const [ranOnce, setRanOnce] = useState(false);

  const handleScan = async () => {
    if (loading) return;
    setLoading(true);
    setRanOnce(true);
    try {
      const candidates = await fetchCharityPosts();
      if (!candidates || candidates.length === 0) {
        toast({ title: "Keine Beiträge gefunden", description: "Es konnten aktuell keine neuen Beiträge geladen werden." });
        setLoading(false);
        return;
      }

      const urls = candidates.map(p => `https://peakd.com/@${p.author}/${p.permlink}`);
      const { data: existing } = await supabase
        .from('charity_analysis_results')
        .select('article_url')
        .in('article_url', urls);

      const existingUrls = new Set((existing ?? []).map(r => r.article_url as string));
      const newOnes = candidates.filter(p => !existingUrls.has(`https://peakd.com/@${p.author}/${p.permlink}`)).slice(0, 10);

      if (newOnes.length === 0) {
        toast({ title: "Keine neuen Beiträge", description: "Alle gefundenen Beiträge wurden bereits angezeigt." });
        setPosts([]);
        setAnalyses({});
        setLoading(false);
        return;
      }

      setPosts(newOnes);
      // set loading placeholders
      const initial: Record<string, CharityAnalysis | null> = {};
      newOnes.forEach(p => { initial[`${p.author}/${p.permlink}`] = null; });
      setAnalyses(initial);

      // Analyze in parallel
      const results = await Promise.all(newOnes.map(async (post) => {
        try {
          const res = await analyzeCharityPost(post);
          return { key: `${post.author}/${post.permlink}`, res } as const;
        } catch (e) {
          console.error('Analyse fehlgeschlagen', e);
          return { key: `${post.author}/${post.permlink}`, res: { charyScore: 0, summary: 'Analyse fehlgeschlagen.' } } as const;
        }
      }));

      const finalAnalyses: Record<string, CharityAnalysis | null> = {};
      results.forEach(r => { finalAnalyses[r.key] = r.res; });
      setAnalyses(finalAnalyses);

      toast({ title: `${newOnes.length} neue Beiträge analysiert`, description: "Die Ergebnisse wurden auch in der Historie gespeichert." });
    } catch (error) {
      console.error(error);
      toast({ title: "Fehler beim Suchen", description: String(error), variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="flex justify-center">
        <Button onClick={handleScan} disabled={loading} className="bg-hive hover:bg-hive/90">
          {loading ? 'Suche läuft…' : 'Neue Beiträge suchen'}
        </Button>
      </div>

      {ranOnce && posts.length === 0 && !loading && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Keine neuen Beiträge</h3>
              <p>Es wurden keine neuen, bisher nicht angezeigten Beiträge gefunden.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6">
          {posts.map((post) => {
            const postId = `${post.author}/${post.permlink}`;
            const analysis = analyses[postId];
            return (
              <div key={postId} className="grid md:grid-cols-2 gap-4">
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">
                      <a
                        href={`https://peakd.com/@${post.author}/${post.permlink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-hive transition-colors"
                      >
                        {post.title}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mb-3">
                      <span className="flex items-center"><User className="h-4 w-4 mr-1" />@{post.author}</span>
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDistanceToNow(new Date(post.created), { addSuffix: true, locale: de })}</span>
                    </div>
                    <p className="text-gray-600 line-clamp-3 mb-3">{post.body}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {post.tags && post.tags.slice(0, 5).map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center">
                          <Tag className="h-3 w-3 mr-1" />{tag}
                        </Badge>
                      ))}
                    </div>
                    <a
                      className="inline-flex items-center text-hive hover:underline text-sm"
                      href={`https://peakd.com/@${post.author}/${post.permlink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" /> Beitrag öffnen
                    </a>
                  </CardContent>
                </Card>
                <CharityAnalysisDisplay analysis={analysis} loading={analysis === null} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewPostsScanner;
