
import { HiveUser } from './hiveAuth';

export interface HivePost {
  author: string;
  permlink: string;
  title: string;
  created: string;
  body: string;
  category: string;
  tags: string[];
  community?: string;
  community_title?: string;
  payout: number;
  upvoted: boolean;
}

// Fetch posts with charity tag or from charity community
export const fetchCharityPosts = async (): Promise<HivePost[]> => {
  try {
    // Query for posts with #charity tag
    const tagQuery = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_discussions_by_created',
      params: [{ tag: 'charity', limit: 10 }],
      id: 1
    };

    // Query for posts from hive-149312 community
    const communityQuery = {
      jsonrpc: '2.0',
      method: 'bridge.get_ranked_posts',
      params: { tag: 'hive-149312', sort: 'created', limit: 10 },
      id: 2
    };

    // Execute both queries in parallel
    const [tagResponse, communityResponse] = await Promise.all([
      fetch('https://api.hive.blog', {
        method: 'POST',
        body: JSON.stringify(tagQuery),
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch('https://api.hive.blog', {
        method: 'POST',
        body: JSON.stringify(communityQuery),
        headers: { 'Content-Type': 'application/json' }
      })
    ]);

    const tagData = await tagResponse.json();
    const communityData = await communityResponse.json();

    // Process tag posts
    const tagPosts = tagData.result.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      body: post.body.slice(0, 200) + '...',
      category: post.category,
      tags: post.json_metadata ? JSON.parse(post.json_metadata).tags || [] : [],
      payout: parseFloat(post.pending_payout_value.split(' ')[0]),
      upvoted: false
    }));

    // Process community posts
    const communityPosts = communityData.result.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      body: post.body.slice(0, 200) + '...',
      category: post.category,
      tags: post.json_metadata ? JSON.parse(post.json_metadata).tags || [] : [],
      community: post.community,
      community_title: post.community_title,
      payout: parseFloat(post.pending_payout_value.split(' ')[0]),
      upvoted: false
    }));

    // Combine and deduplicate posts (in case a post is both tagged and in the community)
    const allPosts = [...tagPosts, ...communityPosts];
    const uniquePosts = allPosts.filter((post, index, self) =>
      index === self.findIndex((p) => p.author === post.author && p.permlink === post.permlink)
    );

    // Sort by created date (newest first)
    return uniquePosts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 10);
  } catch (error) {
    console.error('Error fetching charity posts:', error);
    return [];
  }
};

// Upvote a post
export const upvotePost = (
  user: HiveUser,
  author: string,
  permlink: string,
  weight: number,
  callback: (success: boolean, message: string) => void
): void => {
  if (!user || !user.loggedIn) {
    callback(false, 'Sie müssen eingeloggt sein, um abstimmen zu können');
    return;
  }

  if (typeof window.hive_keychain === 'undefined') {
    callback(false, 'Hive Keychain ist nicht verfügbar');
    return;
  }

  // Weight should be between 0-10000 (0-100%)
  const voteWeight = Math.floor(weight * 100);

  window.hive_keychain.requestVote(
    user.username,
    permlink,
    author,
    voteWeight,
    (response: any) => {
      console.log('Vote response:', response);
      if (response.success) {
        callback(true, 'Erfolgreich abgestimmt!');
      } else {
        callback(false, response.message || 'Fehler beim Abstimmen');
      }
    }
  );
};
