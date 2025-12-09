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

// Extract a displayable description for previews:
// 1. If json_metadata.description exists, use it.
// 2. Otherwise fall back to the start of the body.
// In both cases strip markdown/image tags and leading image URLs, then truncate.
const getPreviewText = (post: any, maxLen = 200): string => {
  try {
    // Try json_metadata.description first
    if (post.json_metadata) {
      const metadata = typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
      if (metadata && metadata.description && typeof metadata.description === 'string' && metadata.description.trim().length > 0) {
        return sanitizePreview(metadata.description, maxLen);
      }
    }

    // Fall back to body
    const body = post.body || '';
    return sanitizePreview(body, maxLen);
  } catch (e) {
    return sanitizePreview(post.body || '', maxLen);
  }
};

// Remove markdown image syntax, HTML <img> tags and standalone image URLs, then trim and truncate
const sanitizePreview = (text: string, maxLen: number) => {
  if (!text) return '';
  let t = text;

  // Remove markdown image ![alt](url)
  t = t.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');

  // Remove HTML img tags
  t = t.replace(/<img[^>]*>/gi, '');

  // Remove any remaining HTML tags (e.g. <div class="...">, </p>, etc.)
  t = t.replace(/<\/?[^>]+(>|$)/g, '');

  // Remove bare image URLs (lines that contain only an image URL)
  t = t.replace(/^\s*https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)\s*$/gim, '');

  // Remove inline image URLs
  t = t.replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi, '');

  // Remove markdown links that point to images or known image hosts, or whose link text indicates an image.
  t = t.replace(/\[([^\]]{0,100})\]\((https?:\/\/[^\)]+)\)/gi, (_m, text, url) => {
    const urlLower = (url || '').toLowerCase();
    const textLower = (text || '').toLowerCase();

    // If URL ends with an image extension -> remove entirely
    if (/\.(jpg|jpeg|png|gif|webp)(?:\?|$)/i.test(urlLower)) return '';

    // Known image hosts or paths
    if (/pixabay\.com|img\.leopedia|unsplash\.com|pexels\.com|cloudinary|cdn\.|i0\.wp\.com|illustrations|\/images\//i.test(urlLower)) return '';

    // If the link text is a short image-like token (img, imgsrc, image, pic, thumbnail), remove
    if (/\b(img|image|imgsrc|pic|picture|thumbnail|thumb|sprite)\b/i.test(textLower)) return '';

    // Otherwise keep the link text (replace the full markdown with the text)
    return text;
  });

  // Remove any remaining markdown links but keep their text
  t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove markdown headings/metadata lines at the start (like > or #) and excessive newlines
  t = t.replace(/^[>#\s\-_*]{0,3}/gm, '');

  // Replace multiple whitespace/newlines with single space
  t = t.replace(/\s+/g, ' ').trim();

  if (t.length > maxLen) {
    return t.slice(0, maxLen).trim() + '...';
  }

  return t;
};

// Convert raw reputation value to human-readable number
const formatReputation = (rawReputation: number): number => {
  if (!rawReputation) return 0;
  
  // Divide the raw reputation score by 10^12 as mentioned
  return Math.round(rawReputation / 1000000000000);
};

// Search criteria interface
export interface SearchCriteria {
  keywords: string[];
  customKeywords: string[];
  searchInTags: boolean;
  searchInBody: boolean;
  articleCount: number;
  communities: string[];
  maxAgeDays?: number;
}

// Fetch posts with charity tag or from charity community
export const fetchCharityPosts = async (): Promise<HivePost[]> => {
  try {
    // Execute all queries in parallel using resilient RPC (node fallback)
    const [tagData, communityData, searchData] = await Promise.all([
      rpc('condenser_api.get_discussions_by_created', [{ tag: 'charity', limit: 30 }]),
      rpc('bridge.get_ranked_posts', { tag: 'hive-149312', sort: 'created', limit: 30 }),
      rpc('condenser_api.get_discussions_by_created', [{ tag: 'charity', limit: 20 }])
    ]);

    console.log("Posts found with charity tag:", tagData.result ? tagData.result.length : 0);
    console.log("Posts found in charity community:", communityData.result ? communityData.result.length : 0);
    console.log("Posts found in extended search:", searchData.result ? searchData.result.length : 0);

    // Helper to safely extract tags from json_metadata
    const safeParseTags = (jsonMetadata: any): string[] => {
      try {
        if (!jsonMetadata) return [];
        const metadata = typeof jsonMetadata === 'string' ? JSON.parse(jsonMetadata) : jsonMetadata;
        return metadata.tags || [];
      } catch (e) {
        return [];
      }
    };

    // Process tag posts
    const tagPosts = tagData.result ? tagData.result.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
    body: getPreviewText(post, 200),
      category: post.category,
      tags: safeParseTags(post.json_metadata),
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
    body: getPreviewText(post, 200),
      category: post.category,
      tags: safeParseTags(post.json_metadata),
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
    body: getPreviewText(post, 200),
      category: post.category,
      tags: safeParseTags(post.json_metadata),
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

// Fetch posts based on custom search criteria
// This implementation uses the same fetch approach as the TesteHive button:
// POST to `VITE_HIVE_PROXY_URL` (if set) or to a public Hive node and parse the result tolerant.
export const fetchCharityPostsWithCriteria = async (criteria: SearchCriteria): Promise<HivePost[]> => {
  try {
    const allKeywords = [...criteria.keywords, ...criteria.customKeywords];
    let allPosts: any[] = [];

    // No helper: we'll call the same fetch code inline (same as TesteHive) for each query

    // Determine queries based on selected communities or default
    const maxLimit = 20;
    const requestLimit = Math.min(criteria.articleCount, maxLimit);

    if (criteria.communities && criteria.communities.length > 0) {
      for (const communityId of criteria.communities) {
        // Use the exact TesteHive fetch approach: condenser_api.get_discussions_by_created
        const rpc = (import.meta.env.VITE_HIVE_PROXY_URL as string) || 'https://api.hive.blog';
        const body = JSON.stringify({ jsonrpc: '2.0', method: 'condenser_api.get_discussions_by_created', params: [{ tag: communityId === 'trending' ? '' : communityId, limit: requestLimit }], id: 1 });
        try {
          const resp = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          const data = await resp.json();
          let items: any[] = [];
          if (Array.isArray(data?.result)) items = data.result;
          else if (Array.isArray(data?.result?.items)) items = data.result.items;
          else if (data?.result && typeof data.result === 'object') {
            items = Object.values(data.result).filter((v: any) => Array.isArray(v)).flat() as any[];
          }
          allPosts = [...allPosts, ...(items || [])];
        } catch (err) {
          console.error('fetchRpc failed for community', communityId, err);
        }
      }
    } else {
      // default created feed — use same TesteHive fetch
      const rpc = (import.meta.env.VITE_HIVE_PROXY_URL as string) || 'https://api.hive.blog';
      const body = JSON.stringify({ jsonrpc: '2.0', method: 'condenser_api.get_discussions_by_created', params: [{ tag: '', limit: requestLimit }], id: 1 });
      try {
        const resp = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        const data = await resp.json();
        let items: any[] = [];
        if (Array.isArray(data?.result)) items = data.result;
        else if (Array.isArray(data?.result?.items)) items = data.result.items;
        else if (data?.result && typeof data.result === 'object') {
          items = Object.values(data.result).filter((v: any) => Array.isArray(v)).flat() as any[];
        }
        allPosts = [...allPosts, ...(items || [])];
      } catch (err) {
        console.error('fetchRpc failed for default feed', err);
      }
    }

    // Now filter posts based on keywords/tags/body as before
    const filteredPosts = (allPosts || []).filter(post => {
      const title = post.title?.toLowerCase() || '';
      const body = post.body?.toLowerCase() || '';

      let tags: string[] = [];
      try {
        if (post.json_metadata) {
          const metadata = typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
          tags = metadata.tags || [];
        }
      } catch (e) { tags = []; }
      const tagsStr = tags.join(' ').toLowerCase();

      const matchesKeyword = allKeywords.length === 0 ? true : allKeywords.some(keyword => {
        const kw = keyword.toLowerCase();
        if (criteria.searchInTags && tagsStr.includes(kw)) return true;
        if (criteria.searchInBody && (title.includes(kw) || body.includes(kw))) return true;
        return false;
      });

      return matchesKeyword;
    });

    // Helper to safely extract tags
    const safeParseTags = (jsonMetadata: any): string[] => {
      try { if (!jsonMetadata) return []; const metadata = typeof jsonMetadata === 'string' ? JSON.parse(jsonMetadata) : jsonMetadata; return metadata.tags || []; } catch (e) { return []; }
    };

    const processedPosts = filteredPosts.map((post: any) => ({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      body: getPreviewText(post, 200),
      category: post.category,
      tags: safeParseTags(post.json_metadata),
      community: post.community,
      community_title: post.community_title,
      payout: parseFloat((post.pending_payout_value || '0.00 HIVE').split(' ')[0]),
      upvoted: false,
      image_url: extractImageUrl(post),
      author_reputation: formatReputation(post.author_reputation)
    }));

    // Apply time-based filtering
    let timeFiltered = processedPosts;
    if (typeof criteria.maxAgeDays === 'number' && criteria.maxAgeDays < 100) {
      const cutoffDays = criteria.maxAgeDays + 1;
      const cutoffTs = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
      timeFiltered = processedPosts.filter(p => {
        try { return new Date(p.created).getTime() > cutoffTs; } catch (e) { return false; }
      });
    }

    const uniquePosts = timeFiltered.filter((post, index, self) => index === self.findIndex((p) => p.author === post.author && p.permlink === post.permlink));

    return uniquePosts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, criteria.articleCount);
  } catch (error) {
    console.error('Error fetching posts with criteria:', error);
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
// Hive RPC helper with node fallback
import { rpc } from './hiveApi';
