
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

interface CharityPostsProps {
  user: HiveUser;
}

const CharityPostsEnhanced: React.FC<CharityPostsProps> = ({ user }) => {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const charityPosts = await fetchCharityPosts();
        setPosts(charityPosts);
      } catch (err) {
        console.error('Failed to fetch charity posts:', err);
        setError('Fehler beim Laden der Charity-Beiträge');
      } finally {
        setLoading(false);
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
        // Update the post to show as upvoted
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
      <h2 className="text-2xl font-bold mb-6 text-center">Aktuelle Charity-Beiträge</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {posts.map((post) => (
          <Card key={`${post.author}-${post.permlink}`} className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Image Column (if available) */}
              <div className={`${post.image_url ? 'block' : 'hidden'} md:col-span-1 h-48 md:h-full overflow-hidden bg-gray-100`}>
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide the image container if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400">Kein Bild verfügbar</span>
                  </div>
                )}
              </div>
              
              {/* Content Column */}
              <div className={`${post.image_url ? 'md:col-span-2' : 'md:col-span-3'} p-4`}>
                <CardHeader className="p-0 pb-2">
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
        ))}
      </div>
    </div>
  );
};

export default CharityPostsEnhanced;
