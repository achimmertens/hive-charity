
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ArrowUp } from "lucide-react";
import { HivePost, fetchCharityPosts, upvotePost } from '@/services/hivePost';
import { HiveUser } from '@/services/hiveAuth';

interface CharityPostsProps {
  user: HiveUser;
}

const CharityPosts: React.FC<CharityPostsProps> = ({ user }) => {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvoteWeights, setUpvoteWeights] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const charityPosts = await fetchCharityPosts();
        setPosts(charityPosts);
        
        // Initialize upvote weights to 100% (1.0) for all posts
        const initialWeights: Record<string, number> = {};
        charityPosts.forEach(post => {
          initialWeights[`${post.author}/${post.permlink}`] = 1.0;
        });
        setUpvoteWeights(initialWeights);
      } catch (error) {
        console.error('Error loading posts:', error);
        toast({
          title: "Fehler",
          description: "Beim Laden der Beiträge ist ein Fehler aufgetreten.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [toast]);

  const handleUpvote = (post: HivePost) => {
    const postKey = `${post.author}/${post.permlink}`;
    const weight = upvoteWeights[postKey];
    
    upvotePost(user, post.author, post.permlink, weight, (success, message) => {
      if (success) {
        // Update the post to show it's been upvoted
        setPosts(posts.map(p => 
          p.author === post.author && p.permlink === post.permlink 
            ? { ...p, upvoted: true } 
            : p
        ));
        
        toast({
          title: "Erfolgreich",
          description: message,
        });
      } else {
        toast({
          title: "Fehler",
          description: message,
          variant: "destructive"
        });
      }
    });
  };

  const handleSliderChange = (postKey: string, value: number[]) => {
    setUpvoteWeights({
      ...upvoteWeights,
      [postKey]: value[0]
    });
  };

  if (loading) {
    return (
      <div className="w-full text-center py-10">
        <p className="text-gray-600">Lade Charity-Beiträge...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full text-center py-10">
        <p className="text-gray-600">Keine Charity-Beiträge gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Neueste Charity-Beiträge</h2>
      
      {posts.map(post => {
        const postKey = `${post.author}/${post.permlink}`;
        const currentWeight = upvoteWeights[postKey] || 1.0;
        
        return (
          <Card key={postKey} className={post.upvoted ? "border-green-300" : ""}>
            <CardHeader>
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
              <CardDescription>
                Von <span className="font-medium">@{post.author}</span> am {new Date(post.created).toLocaleDateString('de-DE')}
                {post.community && (
                  <span> in <a href={`https://peakd.com/c/${post.community}`} target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">{post.community_title || post.community}</a></span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{post.body}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-600">Upvote-Stärke: {Math.floor(currentWeight * 100)}%</span>
                <div className="w-32">
                  <Slider
                    value={[currentWeight]}
                    min={0.01}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => handleSliderChange(postKey, value)}
                    disabled={post.upvoted || !user?.loggedIn}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleUpvote(post)}
                disabled={post.upvoted || !user?.loggedIn}
                className={`ml-auto ${post.upvoted ? 'bg-green-500 hover:bg-green-600' : 'bg-hive hover:bg-hive/90'}`}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                {post.upvoted ? 'Upvoted' : 'Upvote'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default CharityPosts;
