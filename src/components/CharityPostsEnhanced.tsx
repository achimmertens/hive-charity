
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, Tag, ExternalLink, AlertTriangle } from 'lucide-react';
import { HivePost } from '@/services/hivePost';
// ...existing code...
// ...existing code...
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { CharityAnalysis } from '@/utils/charityAnalysis';
import { CharityAnalysisDisplay } from './CharityAnalysis';
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { postComment } from "@/services/hiveComment";
import { HiveUser } from "@/services/hiveAuth";

interface CharityPostsProps {
  user: HiveUser;
  // ...existing code...
}


const CharityPostsEnhanced: React.FC<CharityPostsProps> = ({ user }) => {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, CharityAnalysis | null>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  // Historien-Logik: Zeige die letzten 10 gescannten Artikel aus der Datenbank
  useEffect(() => {
    setLoading(true);
    setError(null);
    supabase
      .from('charity_analysis_results')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          setError('Fehler beim Laden der letzten 10 Analysen.');
          setLoading(false);
          return;
        }
        const postsFromHistory = (data ?? []).map((a: any) => {
          let tags: string[] = [];
          try {
            if (a.tags) tags = a.tags;
            else if (a.openai_response && a.openai_response.match(/#\w+/g)) tags = a.openai_response.match(/#\w+/g) || [];
          } catch {}
          return {
            author: a.author_name,
            permlink: a.article_url.match(/@([^\/]+)\/([^\/\?]+)/)?.[2] ?? "",
            title: a.title || a.openai_response.split("\n")[0].slice(0, 80),
            created: a.created_at,
            body: a.body || a.openai_response || "",
            category: a.category || "",
            tags,
            payout: a.payout || 0,
            upvoted: false,
            image_url: a.image_url,
            author_reputation: a.author_reputation ?? 0,
            community: a.community || "",
            community_title: a.community_title || ""
          };
        });
        setPosts(postsFromHistory);
        // Update analyses state
        const newAnalyses: Record<string, CharityAnalysis | null> = {};
        (data ?? []).forEach((analysis: any) => {
          const postId = `${analysis.author_name}/${analysis.article_url.match(/@([^\/]+)\/([^\/\?]+)/)?.[2] ?? ""}`;
          newAnalyses[postId] = {
            charyScore: analysis.charity_score,
            summary: analysis.openai_response
          };
        });
        setAnalyses(newAnalyses);
        setLoading(false);
      });
  }, []);

  // ...existing code...

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
    <div className="grid grid-cols-1 gap-6">
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
                          toast('Bitte loggen Sie sich ein, um zu antworten.');
                          return;
                        }
                        const body = replyText[postId] || '';
                        if (body.trim().length === 0) {
                          toast('Antwort darf nicht leer sein.');
                          return;
                        }
                        setSending((prev) => ({ ...prev, [postId]: true }));
                        postComment(user, post.author, post.permlink, body, (success, message) => {
                          setSending((prev) => ({ ...prev, [postId]: false }));
                          toast(message);
                          if (success) {
                            setReplyOpen((prev) => ({ ...prev, [postId]: false }));
                          }
                        });
                      }}
                    >
                      {sending[postId] ? 'Senden...' : 'Senden'}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default CharityPostsEnhanced;
