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
  const maxShown = 20;

  // Load persisted entries on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('currentCharityPostsV1');
      if (raw) {
        const parsed = JSON.parse(raw) as { post: HivePost; analysis: CharityAnalysis }[];
        const restoredPosts = parsed.map(p => p.post).slice(0, maxShown);
        const restoredAnalyses: Record<string, CharityAnalysis | null> = {};
        parsed.slice(0, maxShown).forEach(p => {
          restoredAnalyses[`${p.post.author}/${p.post.permlink}`] = p.analysis;
        });
        setPosts(restoredPosts);
        setAnalyses(restoredAnalyses);
        setRanOnce(true);
      }
    } catch (e) {
      console.warn('Failed to restore current posts', e);
    }
  }, []);

  const handleScan = async () => {
    if (loading) return;
    setLoading(true);
    setRanOnce(true);
    try {
      const candidates = await fetchCharityPosts();
      // Filter out posts containing Chinese characters in title or body
      const cjkRegex = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
      const candidatesFiltered = (candidates || []).filter(p => !cjkRegex.test(p.title) && !cjkRegex.test(p.body));
      if (!candidatesFiltered || candidatesFiltered.length === 0) {
        toast({ title: "Keine Beiträge gefunden", description: "Es konnten aktuell keine neuen Beiträge geladen werden." });
        setLoading(false);
        return;
      }

      const urls = candidatesFiltered.map(p => `https://peakd.com/@${p.author}/${p.permlink}`);
      const { data: existing } = await supabase
        .from('charity_analysis_results')
        .select('article_url')
        .in('article_url', urls);

      const existingUrls = new Set((existing ?? []).map(r => r.article_url as string));
      const newOnes = candidatesFiltered.filter(p => !existingUrls.has(`https://peakd.com/@${p.author}/${p.permlink}`)).slice(0, 10);

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
      setAnalyses(prev => ({ ...prev, ...initial }));

      // Analyze in parallel
      const results = await Promise.all(newOnes.map(async (post) => {
        try {
          const res = await analyzeCharityPost(post);
          return { key: `${post.author}/${post.permlink}`, post, res } as const;
        } catch (e) {
          console.error('Analyse fehlgeschlagen', e);
          return { key: `${post.author}/${post.permlink}`, post, res: { charyScore: 0, summary: 'Analyse fehlgeschlagen.' } } as const;
        }
      }));

      const finalAnalyses: Record<string, CharityAnalysis | null> = { ...analyses };
      results.forEach(r => { finalAnalyses[r.key] = r.res; });

      // Persist and limit to maxShown, newest first
      const existingRaw = localStorage.getItem('currentCharityPostsV1');
      const existingList: { post: HivePost; analysis: CharityAnalysis }[] = existingRaw ? JSON.parse(existingRaw) : [];
      const combined = [...results.map(r => ({ post: r.post, analysis: r.res })), ...existingList];
      const dedupMap = new Map<string, { post: HivePost; analysis: CharityAnalysis }>();
      for (const item of combined) {
        dedupMap.set(`${item.post.author}/${item.post.permlink}`, item);
      }
      const persisted = Array.from(dedupMap.values()).slice(0, maxShown);
      localStorage.setItem('currentCharityPostsV1', JSON.stringify(persisted));

      setAnalyses(finalAnalyses);
      setPosts(persisted.map(p => p.post));

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
                  <div className="grid md:grid-cols-3 gap-4">
                    {post.image_url ? (
                      <div className="md:col-span-1 h-48 md:h-full overflow-hidden bg-gray-100">
                        <img 
                          src={post.image_url} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                    <div className={`${post.image_url ? 'md:col-span-2' : 'md:col-span-3'} p-4`}>
                      <CardHeader className="p-0 pb-2">
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
                      <CardContent className="p-0">
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
                    </div>
                  </div>
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
