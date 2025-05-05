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
  image_url?: string;
  author_reputation?: number; // Added author_reputation property
}

// Extract image URL from post JSON metadata or content
const extractImageUrl = (post: any): string | undefined => {
  try {
    // Try to get image from json_metadata first
    if (post.json_metadata) {
      const metadata = JSON.parse(post.json_metadata);
      
      // Check for image in metadata.image array
      if (metadata.image && metadata.image.length > 0) {
        return metadata.image[0];
      }
      
      // Check for cover_image in metadata
      if (metadata.cover_image) {
        return metadata.cover_image;
      }
    }
    
    // If no image found in metadata, try to extract from body using regex
    const imgRegex = /https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp)/i;
    const match = post.body.match(imgRegex);
    if (match) {
      return match[0];
    }
    
    // No image found
    return undefined;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return undefined;
  }
};

// Convert raw reputation value to human-readable number
const formatReputation = (rawReputation: number): number => {
  if (!rawReputation) return 0;
  
  // Divide the raw reputation score by 10^12 as mentioned
  return Math.round(rawReputation / 1000000000000);
};

// Fetch posts with charity tag or from charity community
export const fetchCharityPosts = async (): Promise<HivePost[]> => {
  try {
    // Query for posts with #charity tag - increased limit to 30
    const tagQuery = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_discussions_by_created',
      params: [{ tag: 'charity', limit: 30 }],
      id: 1
    };

    // Query for posts from hive-149312 community - increased limit to 30
    const communityQuery = {
      jsonrpc: '2.0',
      method: 'bridge.get_ranked_posts',
      params: { tag: 'hive-149312', sort: 'created', limit: 30 },
      id: 2
    };

    // Special search query to find more charity-related posts
    const searchQuery = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_discussions_by_created',
      params: [{ tag: 'charity', limit: 20 }],
      id: 3
    };

    // Execute all queries in parallel
    const [tagResponse, communityResponse, searchResponse] = await Promise.all([
      fetch('/api/hive', {
        method: 'POST',
        body: JSON.stringify(tagQuery),
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch('/api/hive', {
        method: 'POST',
        body: JSON.stringify(communityQuery),
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch('/api/hive', {
        method: 'POST',
        body: JSON.stringify(searchQuery),
        headers: { 'Content-Type': 'application/json' }
      })
    ]);

    const tagData = await tagResponse.json();
    const communityData = await communityResponse.json();
    const searchData = await searchResponse.json();

    console.log("Posts found with charity tag:", tagData.result ? tagData.result.length : 0);
    console.log("Posts found in charity community:", communityData.result ? communityData.result.length : 0);
    console.log("Posts found in extended search:", searchData.result ? searchData.result.length : 0);

    // Process tag posts
    const tagPosts = tagData.result ? tagData.result.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      body: post.body.slice(0, 200) + '...',
      category: post.category,
      tags: post.json_metadata ? JSON.parse(post.json_metadata).tags || [] : [],
      payout: parseFloat(post.pending_payout_value.split(' ')[0]),
      upvoted: false,
      image_url: extractImageUrl(post),
      author_reputation: formatReputation(post.author_reputation)
    })) : [];

    // Process community posts
    const communityPosts = communityData.result ? communityData.result.map((post: any) => ({
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
      upvoted: false,
      image_url: extractImageUrl(post),
      author_reputation: formatReputation(post.author_reputation)
    })) : [];

    // Process search posts
    const searchPosts = searchData.result ? searchData.result.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      body: post.body.slice(0, 200) + '...',
      category: post.category,
      tags: post.json_metadata ? JSON.parse(post.json_metadata).tags || [] : [],
      payout: parseFloat(post.pending_payout_value.split(' ')[0]),
      upvoted: false,
      image_url: extractImageUrl(post),
      author_reputation: formatReputation(post.author_reputation)
    })) : [];

    // Combine and deduplicate posts
    const allPosts = [...tagPosts, ...communityPosts, ...searchPosts];
    const uniquePosts = allPosts.filter((post, index, self) =>
      index === self.findIndex((p) => p.author === post.author && p.permlink === post.permlink)
    );

    console.log("Total unique posts found:", uniquePosts.length);

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

// Import the HiveUser type
import { HiveUser } from './hiveAuth';
