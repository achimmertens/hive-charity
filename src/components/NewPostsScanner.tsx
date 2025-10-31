import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertTriangle, Brain, Calendar, ExternalLink, Tag, User, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HivePost, fetchCharityPosts } from "@/services/hivePost";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCharityPost, CharityAnalysis } from "@/utils/charityAnalysis";
import { CharityAnalysisDisplay } from "./CharityAnalysis";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { postComment, votePost } from "@/services/hiveComment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { HiveUser } from "@/services/hiveAuth";

interface NewPostsScannerProps {
  user: HiveUser;
}

const NewPostsScanner: React.FC<NewPostsScannerProps> = ({ user }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CharityAnalysis | null>>({});
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [charyMap, setCharyMap] = useState<Record<string, boolean>>({});
  const [ranOnce, setRanOnce] = useState(false);
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [voteOpen, setVoteOpen] = useState<Record<string, boolean>>({});
  const [voteValue, setVoteValue] = useState<Record<string, number>>({});
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const maxShown = 30;

  // Load favorite + chary flags + openai_response for currently displayed posts from Supabase
  React.useEffect(() => {
    const loadFavorites = async () => {
      try {
        if (!posts || posts.length === 0) return;
        const urls = posts.map(p => `https://peakd.com/@${p.author}/${p.permlink}`);
        const { data } = await supabase
          .from('charity_analysis_results')
          .select('article_url, is_favorite, chary_marked, openai_response')
          .in('article_url', urls as string[]);

        const favMap: Record<string, boolean> = {};
        const charyFlags: Record<string, boolean> = {};
        const openaiMap: Record<string, string | null> = {};
        (data || []).forEach((row: any) => {
          const match = row.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
          if (match) {
            const key = `${match[1]}/${match[2]}`;
            favMap[key] = !!row.is_favorite;
            charyFlags[key] = !!row.chary_marked;
            openaiMap[key] = row.openai_response || null;
          }
        });
        setFavoriteMap(favMap);
        setCharyMap(charyFlags);
        
        // Update analyses with openai_response
        setAnalyses(prev => {
          const updated = { ...prev };
          Object.keys(openaiMap).forEach(key => {
            if (updated[key]) {
              updated[key] = { ...updated[key]!, openaiResponse: openaiMap[key] };
            }
          });
          return updated;
        });
      } catch (e) {
        console.warn('Failed to load favorite flags for visible posts', e);
      }
    };

    loadFavorites();
  }, [posts]);

  const handleToggleFavorite = async (post: HivePost, value: boolean) => {
    const postUrl = `https://peakd.com/@${post.author}/${post.permlink}`;
    try {
      // Check if an analysis record exists for this article
      const { data: existing } = await supabase
        .from('charity_analysis_results')
        .select('id')
        .eq('article_url', postUrl)
        .single();

      if (!existing) {
        toast({ title: 'Analyse fehlt', description: 'Bitte analysiere den Artikel zuerst, damit er in der Historie gespeichert wird und als Favorit markiert werden kann.' });
        // revert UI state
        setFavoriteMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: false }));
        return;
      }

      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ is_favorite: value })
        .eq('article_url', postUrl);

      if (error) throw error;

      setFavoriteMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: value }));
      toast({ title: value ? 'Als Favorit markiert' : 'Aus Favoriten entfernt' });
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      toast({ title: 'Fehler', description: 'Favorit konnte nicht gesetzt werden.', variant: 'destructive' });
      setFavoriteMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: !value }));
    }
  };

  const handleToggleChary = async (post: HivePost, value: boolean) => {
    const postUrl = `https://peakd.com/@${post.author}/${post.permlink}`;
    try {
      // Check if an analysis record exists for this article
      const { data: existing } = await supabase
        .from('charity_analysis_results')
        .select('id')
        .eq('article_url', postUrl)
        .single();

      if (!existing) {
        toast({ title: 'Analyse fehlt', description: 'Bitte analysiere den Artikel zuerst, damit er in der Historie gespeichert wird und als !CHARY markiert werden kann.' });
        // revert UI state
        setCharyMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: false }));
        return;
      }

      const { error } = await supabase
        .from('charity_analysis_results')
        .update({ chary_marked: value })
        .eq('article_url', postUrl);

      if (error) throw error;

      setCharyMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: value }));
      toast({ title: value ? '!CHARY markiert' : '!CHARY entfernt' });
    } catch (e) {
      console.error('Failed to toggle !CHARY:', e);
      toast({ title: 'Fehler', description: '!CHARY konnte nicht gesetzt werden.', variant: 'destructive' });
      setCharyMap(prev => ({ ...prev, [`${post.author}/${post.permlink}`]: !value }));
    }
  };

  // Check if user has voted on posts
  const checkVoteStatus = async (posts: HivePost[], username: string) => {
    if (!username) return;
    
    try {
      const voteChecks = posts.map(async (post) => {
        const postId = `${post.author}/${post.permlink}`;
        try {
          const response = await fetch("https://api.hive.blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "condenser_api.get_active_votes",
              params: [post.author, post.permlink],
              id: 1
            })
          });
          const data = await response.json();
          const votes = data.result || [];
          const userVoted = votes.some((vote: any) => vote.voter === username);
          return { postId, voted: userVoted };
        } catch (error) {
          console.error(`Failed to check vote status for ${postId}:`, error);
          return { postId, voted: false };
        }
      });
      
      const results = await Promise.all(voteChecks);
      const voteStatus: Record<string, boolean> = {};
      results.forEach(({ postId, voted }) => {
        voteStatus[postId] = voted;
      });
      setHasVoted(voteStatus);
    } catch (error) {
      console.error('Failed to check vote status:', error);
    }
  };

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
        
        // Check vote status for restored posts
        if (user?.username) {
          checkVoteStatus(restoredPosts, user.username);
        }
      }
    } catch (e) {
      console.warn('Failed to restore current posts', e);
    }
    
    // Listen for manual analyses added from other parts of the app (Index)
    const handler = (ev: Event) => {
      try {
        // @ts-ignore
        const detail = ev.detail as { post: HivePost; analysis: CharityAnalysis };
        if (!detail || !detail.post) return;
        const key = `${detail.post.author}/${detail.post.permlink}`;

        setAnalyses(prev => ({ ...prev, [key]: detail.analysis }));
        setPosts(prev => {
          // Move manual/last searched entry to the top. If already present, remove old occurrence first.
          const filtered = prev.filter(p => `${p.author}/${p.permlink}` !== key);
          const next = [detail.post, ...filtered].slice(0, maxShown);
          return next;
        });

        // Update persisted storage
        try {
          const raw = localStorage.getItem('currentCharityPostsV1');
          const list = raw ? JSON.parse(raw) as any[] : [];
          // Ensure newest-first with manual entry on top, and dedupe preferring newest
          const combined = [{ post: detail.post, analysis: detail.analysis }, ...(list || [])];
          const dedup = new Map<string, any>();
          for (const item of combined) {
            const k = `${item.post.author}/${item.post.permlink}`;
            if (!dedup.has(k)) dedup.set(k, item);
          }
          const persisted = Array.from(dedup.values()).slice(0, maxShown);
          localStorage.setItem('currentCharityPostsV1', JSON.stringify(persisted));
        } catch (e) {
          console.warn('Failed to update currentCharityPostsV1 after new analysis', e);
        }
      } catch (e) {
        console.warn('Invalid charity:new-analysis event', e);
      }
    };

    window.addEventListener('charity:new-analysis', handler as EventListener);
    return () => window.removeEventListener('charity:new-analysis', handler as EventListener);
  }, [user?.username]);

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

  // Only add new posts that are not already present in state/localStorage
  // We'll merge new ones in front of existing posts, preserving newest-first order
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

      // Persist and limit to maxShown, newest first. Keep newest items when deduping.
      const existingRaw = localStorage.getItem('currentCharityPostsV1');
      const existingList: { post: HivePost; analysis: CharityAnalysis }[] = existingRaw ? JSON.parse(existingRaw) : [];
      const newEntries = results.map(r => ({ post: r.post, analysis: r.res }));
      const combined = [...newEntries, ...existingList]; // newest-first
      const dedupMap = new Map<string, { post: HivePost; analysis: CharityAnalysis }>();
      for (const item of combined) {
        const key = `${item.post.author}/${item.post.permlink}`;
        if (!dedupMap.has(key)) {
          dedupMap.set(key, item);
        }
      }
      const persisted = Array.from(dedupMap.values()).slice(0, maxShown);
      localStorage.setItem('currentCharityPostsV1', JSON.stringify(persisted));

      setAnalyses(finalAnalyses);
      // Merge into current posts state: add new entries that don't already exist, newest-first
      setPosts(prevPosts => {
        const existingKeys = new Set(prevPosts.map(p => `${p.author}/${p.permlink}`));
        const toAdd = persisted.map(p => p.post).filter(p => !existingKeys.has(`${p.author}/${p.permlink}`));
        const merged = [...toAdd, ...prevPosts].slice(0, maxShown);
        return merged;
      });

      // Check vote status for new posts
      if (user?.username) {
        checkVoteStatus(persisted.map(p => p.post), user.username);
      }

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
                      <CardHeader className="p-0 pb-2 flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl line-clamp-2">
                            <a 
                              href={`https://peakd.com/@${post.author}/${post.permlink}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-hive transition-colors"
                            >
                              {post.title}
                            </a>
                          </CardTitle>
                          <CardDescription className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" /> 
                              <a 
                                href={`https://peakd.com/@${post.author}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-hive transition-colors"
                              >
                                @{post.author}
                              </a>
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" /> 
                              {formatDistanceToNow(new Date(post.created), { addSuffix: true, locale: de })}
                            </span>
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 py-4">
                        <p className="text-gray-600 line-clamp-3 mb-4">{post.body}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags && post.tags.slice(0, 5).map(tag => (
                            <Badge key={tag} variant="secondary" className="flex items-center">
                              <Tag className="h-3 w-3 mr-1" /> 
                              {tag}
                            </Badge>
                          ))}
                          {post.community && (
                            <Badge variant="outline" className="border-hive text-hive">
                              {post.community_title || post.community}
                            </Badge>
                          )}
                        </div>
                        {/* !CHARY + Favorit checkboxes (appear under tags) */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={!!charyMap[postId]}
                              onCheckedChange={(val) => handleToggleChary(post, !!val)}
                            />
                            <span className="text-sm text-gray-700">!CHARY</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={!!favoriteMap[postId]}
                              onCheckedChange={(val) => handleToggleFavorite(post, !!val)}
                            />
                            <span className="text-sm text-gray-700">Favorit</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-0 flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="font-semibold text-green-600">${(post.payout || 0).toFixed(2)}</span>
                        </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (!user || !user.loggedIn || !user.authType) {
                                  toast({ title: 'Bitte loggen Sie sich ein, um zu voten.' });
                                  return;
                                }
                                if (user.authType !== 'keychain' && user.authType !== 'hivesigner') {
                                  toast({ title: 'Bitte nutzen Sie Keychain oder HiveSigner zum Voten.' });
                                  return;
                                }
                                setVoteOpen((prev) => ({ ...prev, [postId]: true }));
                                if (voteValue[postId] == null) setVoteValue((prev) => ({ ...prev, [postId]: 100 }));
                              }}
                              disabled={voting[postId] || !user?.loggedIn || !user?.authType}
                              aria-label="Upvote"
                              title="Upvote"
                            >
                              <ThumbsUp 
                                className={`h-4 w-4 ${voting[postId] ? 'animate-pulse' : ''}`} 
                                fill={hasVoted[postId] ? '#3b82f6' : 'none'}
                                stroke={hasVoted[postId] ? '#3b82f6' : 'currentColor'}
                              />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => window.open(`https://peakd.com/@${post.author}/${post.permlink}`, '_blank')}
                              className="text-gray-600"
                              title="Ansehen"
                              aria-label="Ansehen"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={async () => {
                                try {
                                  if (!post) return;
                                  // Setze den Analysezustand auf null um zu zeigen, dass die Analyse läuft
                                  setAnalyses(prev => ({
                                    ...prev,
                                    [`${post.author}/${post.permlink}`]: null
                                  }));
                                  const res = await analyzeCharityPost(post);
                                  setAnalyses(prev => ({
                                    ...prev,
                                    [`${post.author}/${post.permlink}`]: res
                                  }));
                                  toast({ 
                                    title: "Analyse abgeschlossen",
                                    description: `Chary-Score: ${res.charyScore}/10`
                                  });
                                } catch (error) {
                                  console.error('Analyse fehlgeschlagen:', error);
                                  toast({ 
                                    title: "Analyse fehlgeschlagen",
                                    description: String(error),
                                    variant: "destructive"
                                  });
                                  // Setze den Analysezustand zurück
                                  // Setze den Analysezustand auf ein leeres Objekt im Fehlerfall
                                  const emptyAnalysis: CharityAnalysis = {
                                    charyScore: 0,
                                    summary: "Analyse fehlgeschlagen"
                                  };
                                  setAnalyses(prev => ({
                                    ...prev,
                                    [`${post.author}/${post.permlink}`]: emptyAnalysis
                                  }));
                                }
                              }}
                              disabled={analyses[postId] === null}
                              title="KI-Analyse"
                              aria-label="KI-Analyse"
                            >
                              <Brain className={`h-4 w-4 ${analyses[postId] === null ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const prefill = analysis
                                  ? `Chary-Score: ${analysis.charyScore}/10\n\nKI-Antwort:\n${analysis.summary}\n\n`
                                  : '';
                                setReplyOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
                                if (!replyText[postId]) setReplyText((prev) => ({ ...prev, [postId]: prefill }));
                              }}
                            >
                              Antworten
                            </Button>
                          </div>
                      </CardFooter>
                    </div>
                  </div>
                </Card>
                <CharityAnalysisDisplay 
                  analysis={analysis} 
                  loading={analysis === null}
                  openaiResponse={analysis?.openaiResponse}
                />
                {replyOpen[postId] && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Antwort verfassen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={replyText[postId] || ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [postId]: e.target.value }))}
                        rows={8}
                        placeholder="Ihre Antwort..."
                      />
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyOpen((prev) => ({ ...prev, [postId]: false }))}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        size="sm"
                        disabled={sending[postId] || !user?.loggedIn}
                        onClick={() => {
                          if (!user || !user.loggedIn) {
                            alert('Bitte loggen Sie sich ein, um zu antworten.');
                            return;
                          }
                          const body = replyText[postId] || '';
                          if (body.trim().length === 0) {
                            alert('Antwort darf nicht leer sein.');
                            return;
                          }
                          setSending((prev) => ({ ...prev, [postId]: true }));
                          if (!user.authType || (user.authType !== 'keychain' && user.authType !== 'hivesigner')) {
                            toast({ title: 'Bitte nutzen Sie Keychain oder HiveSigner zum Kommentieren.' });
                            return;
                          }
                          postComment(
                            { ...user, authType: user.authType as 'keychain' | 'hivesigner' },
                            post.author,
                            post.permlink,
                            body,
                            (success, message) => {
                              setSending((prev) => ({ ...prev, [postId]: false }));
                              toast({ title: message });
                              if (success) {
                                setReplyOpen((prev) => ({ ...prev, [postId]: false }));
                              }
                            }
                          );
                        }}
                      >
                        {sending[postId] ? 'Senden...' : 'Senden'}
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                <Dialog open={!!voteOpen[postId]} onOpenChange={(open) => setVoteOpen((prev) => ({ ...prev, [postId]: open }))}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upvote vergeben</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span>Stärke</span>
                        <span className="font-semibold">{voteValue[postId] ?? 100}%</span>
                      </div>
                      <Slider
                        value={[voteValue[postId] ?? 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(val) => setVoteValue((prev) => ({ ...prev, [postId]: val[0] }))}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setVoteOpen((prev) => ({ ...prev, [postId]: false }))}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        disabled={voting[postId] || !user?.loggedIn}
                        onClick={() => {
                          if (!user || !user.loggedIn) {
                            toast({ title: 'Bitte loggen Sie sich ein, um zu voten.' });
                            return;
                          }
                          const weight = voteValue[postId] ?? 100;
                          setVoting((prev) => ({ ...prev, [postId]: true }));
                          if (!user.authType || (user.authType !== 'keychain' && user.authType !== 'hivesigner')) {
                            toast({ title: 'Bitte nutzen Sie Keychain oder HiveSigner zum Voten.' });
                            return;
                          }
                          votePost(
                            { ...user, authType: user.authType as 'keychain' | 'hivesigner' },
                            post.author,
                            post.permlink,
                            weight,
                            (success, message) => {
                              setVoting((prev) => ({ ...prev, [postId]: false }));
                              toast({ title: message });
                              if (success) {
                                setVoteOpen((prev) => ({ ...prev, [postId]: false }));
                                setHasVoted((prev) => ({ ...prev, [postId]: true }));
                              }
                            }
                          );
                        }}
                      >
                        {voting[postId] ? 'Sende...' : 'Upvote senden'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewPostsScanner;
