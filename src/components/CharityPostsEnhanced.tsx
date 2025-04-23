import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Calendar, User, Tag, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchCharityPosts, upvotePost, HivePost } from '@/services/hivePost';
import { HiveUser } from '@/services/hiveAuth';
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { analyzeCharityPost, CharityAnalysis } from '@/utils/charityAnalysis';
import { CharityAnalysisDisplay } from './CharityAnalysis';
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface CharityPostsProps {
  user: HiveUser;
}

const fetchAnalyzedArticleUrls = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('charity_analysis_results')
      .select('article_url');
    if (error) {
      console.warn("Error fetching analysis history:", error);
      return [];
    }
    return (data ?? []).map((entry: any) => entry.article_url);
  } catch (err) {
    console.error("DB lookup error:", err);
    return [];
  }
};

const fetchCharyInComments = async (author: string, permlink: string): Promise<boolean> => {
  try {
    const request = {
      jsonrpc: "2.0",
      method: "bridge.get_discussion",
      params: { author, permlink },
      id: 123
    };
    const res = await fetch("https://api.hive.blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const raw = await res.json();
    if (!raw.result || !raw.result.replies) return false;

    return raw.result.replies.some(
      (reply: any) =>
        typeof reply.body === "string" &&
        reply.body.toLowerCase().includes("!chary")
    );
  } catch (e) {
    console.error("Failed checking !CHARY in comments for", author, permlink, e);
    return false;
  }
};

const CharityPostsEnhanced: React.FC<CharityPostsProps> = ({ user }) => {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, CharityAnalysis | null>>({});
  const [analyzingPosts, setAnalyzingPosts] = useState<boolean>(false);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [charyInComments, setCharyInComments] = useState<Record<string, boolean>>({});
  const [fetchingPosts, setFetchingPosts] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPosts = async () => {
      setFetchingPosts(true);
      setLoading(true);
      setError(null);
      try {
        const analyzedArticleUrls = await fetchAnalyzedArticleUrls();

        let charityPosts = await fetchCharityPosts();

        const additionalQuery = {
          jsonrpc: '2.0',
          method: 'condenser_api.get_discussions_by_created',
          params: [{ tag: 'help', limit: 20 }],
          id: 3
        };

        const resp = await fetch('https://api.hive.blog', {
          method: 'POST',
          body: JSON.stringify(additionalQuery),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await resp.json();
        let helpTagPosts: HivePost[] = [];
        if (data && data.result) {
          helpTagPosts = data.result.map((post: any) => ({
            author: post.author,
            permlink: post.permlink,
            title: post.title,
            created: post.created,
            body: post.body.slice(0, 200) + "...",
            category: post.category,
            tags: post.json_metadata ? JSON.parse(post.json_metadata).tags || [] : [],
            payout: parseFloat(post.pending_payout_value.split(" ")[0]),
            upvoted: false,
            image_url: post.json_metadata ? (() => {
              try {
                const meta = JSON.parse(post.json_metadata);
                if (meta.image && meta.image.length > 0) return meta.image[0];
                if (meta.cover_image) return meta.cover_image;
                return undefined;
              } catch { return undefined; }
            })() : undefined,
            author_reputation: post.author_reputation
              ? Math.round(post.author_reputation / 1000000000000)
              : 0,
          }));
        }

        const allPosts = [...charityPosts, ...helpTagPosts];
        const uniquePosts = allPosts.filter(
          (post, idx, arr) =>
            arr.findIndex(
              (p) => p.author === post.author && p.permlink === post.permlink
            ) === idx
        );

        const filteredPosts = uniquePosts.filter(
          (p) =>
            !analyzedArticleUrls.includes(
              `https://peakd.com/@${p.author}/${p.permlink}`
            )
        );
        setPosts(filteredPosts);

        const charyStatusMap: Record<string, boolean> = {};

        for (const post of filteredPosts) {
          const postId = `${post.author}/${post.permlink}`;
          if (charyInComments[postId] !== undefined) {
            charyStatusMap[postId] = charyInComments[postId];
          } else {
            charyStatusMap[postId] = await fetchCharyInComments(post.author, post.permlink);
          }
        }
        setCharyInComments(charyStatusMap);

      } catch (err) {
        console.error('Fehler beim Suchen nach Charity-Artikeln:', err);
        setError('Fehler beim Laden der Charity-Beiträge');
      } finally {
        setLoading(false);
        setFetchingPosts(false);
      }
    };

    loadPosts();
  }, []);

  const handleUpvote = (post: HivePost) => {
    const postId = `${post.author}/${post.permlink}`;
    setVotingInProgress(postId);

    upvotePost(user, post.author, post.permlink, 100, (success, message) => {
      setVotingInProgress(null);
      
      if (success) {
        setPosts(posts.map(p => 
          p.author === post.author && p.permlink === post.permlink
            ? { ...p, upvoted: true }
            : p
        ));
        
        toast({
          title: "Upvote erfolgreich",
          description: message,
        });
      } else {
        toast({
          title: "Upvote fehlgeschlagen",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const analyzePost = async (post: HivePost) => {
    const postId = `${post.author}/${post.permlink}`;
    setAnalyses(prev => ({ ...prev, [postId]: null }));
    
    try {
      console.log(`Starting analysis for post: ${postId}`);
      const analysis = await analyzeCharityPost(post);
      console.log(`Analysis complete for post ${postId}:`, analysis);
      
      setAnalyses(prev => ({ 
        ...prev, 
        [postId]: analysis 
      }));
      
      return true;
    } catch (error) {
      console.error(`Error analyzing post ${postId}:`, error);
      setAnalyses(prev => ({ 
        ...prev, 
        [postId]: {
          charyScore: 0,
          summary: 'Fehler bei der Analyse. Bitte versuchen Sie es später erneut.'
        }
      }));
      
      return false;
    }
  };

  const analyzeAllPosts = async () => {
    if (analyzingPosts) return;
    
    setAnalyzingPosts(true);
    setAnalysisProgress(0);
    
    const initialAnalyses: Record<string, CharityAnalysis | null> = {};
    posts.forEach(post => {
      const postId = `${post.author}/${post.permlink}`;
      initialAnalyses[postId] = null;
    });
    setAnalyses(initialAnalyses);
    
    const totalPosts = posts.length;
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const postId = `${post.author}/${post.permlink}`;
        setCurrentlyAnalyzing(postId);
        
        const success = await analyzePost(post);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        const progress = Math.round(((i + 1) / totalPosts) * 100);
        setAnalysisProgress(progress);
      }
      
      toast({
        title: "Analyse abgeschlossen",
        description: `${successCount} Artikel wurden erfolgreich analysiert. ${failCount} Fehler.`,
      });
    } catch (error) {
      console.error('Error during post analysis:', error);
      toast({
        title: "Analyse fehlgeschlagen",
        description: "Es gab ein Problem bei der Analyse der Beiträge.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingPosts(false);
      setCurrentlyAnalyzing(null);
      setAnalysisProgress(100);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hive"></div>
        <p className="mt-4 text-gray-600">Lade Charity-Beiträge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-500 mb-2">Fehler</h3>
            <p>{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-8">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Keine Beiträge gefunden</h3>
            <p>Aktuell wurden keine Charity-Beiträge gefunden. Bitte versuchen Sie es später noch einmal.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Aktuelle Charity-Beiträge</h2>
          <div className="flex gap-2">
            <Button
              onClick={fetchFilteredCharityPosts}
              disabled={fetchingPosts}
              className="bg-hive hover:bg-hive-dark"
            >
              {fetchingPosts ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Suche...
                </>
              ) : (
                'Weitere Artikel suchen'
              )}
            </Button>
            <Button 
              onClick={analyzeAllPosts} 
              disabled={analyzingPosts}
              className="bg-hive hover:bg-hive-dark"
            >
              {analyzingPosts ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analysiere...
                </>
              ) : (
                'Artikel auf Charity Scannen'
              )}
            </Button>
          </div>
        </div>
        
        {analyzingPosts && (
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span>Analyse läuft...</span>
              <span>{analysisProgress}%</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {posts.map((post) => {
          const postId = `${post.author}/${post.permlink}`;
          const isAnalyzing = currentlyAnalyzing === postId;
          const analysis = analyses[postId];
          const showChary = postId in charyInComments;
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
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={showChary && charyInComments[postId]} tabIndex={-1} readOnly id={`charycb_${postId}`} />
                        <label htmlFor={`charycb_${postId}`} className="text-xs select-none">!CHARY</label>
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
                    </CardContent>
                    <CardFooter className="p-0 flex justify-between items-center">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-semibold text-green-600">${post.payout.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://peakd.com/@${post.author}/${post.permlink}`, '_blank')}
                          className="text-gray-600 flex items-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" /> Ansehen
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpvote(post)}
                          disabled={post.upvoted || votingInProgress !== null}
                          className={post.upvoted ? "bg-green-500 hover:bg-green-600" : "bg-hive hover:bg-hive-dark"}
                        >
                          {votingInProgress === `${post.author}/${post.permlink}` ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Abstimmen...
                            </>
                          ) : post.upvoted ? (
                            <>
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Abgestimmt
                            </>
                          ) : (
                            <>
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Upvoten
                            </>
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </div>
                </div>
              </Card>
              <CharityAnalysisDisplay 
                analysis={analysis} 
                loading={analysis === null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharityPostsEnhanced;
