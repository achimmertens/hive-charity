
import { useEffect, useState } from "react";

export function useCharyInComments(
  analyses: Array<{ article_url: string; author_name: string; }>
) {
  const [charyMap, setCharyMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchCharyComment(author: string, permlink: string): Promise<boolean> {
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
        
        // If there's a CORS error or any other issue, we just return false
        if (!res.ok) {
          console.warn(`Failed to fetch chary comments for ${author}/${permlink}: ${res.status}`);
          return false;
        }
        
        const raw = await res.json();
        if (!raw.result || !raw.result.replies) return false;
        return raw.result.replies.some(
          (reply: any) =>
            typeof reply.body === "string" &&
            reply.body.toLowerCase().includes("!chary")
        );
      } catch (error) {
        console.warn(`Error fetching chary comments: ${error}`);
        return false;
      }
    }

    const fetchAll = async () => {
      const map: Record<string, boolean> = {};
      for (const a of analyses) {
        const urlMatch = a.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
        if (!urlMatch) continue;
        const [, author, permlink] = urlMatch;
        const key = `${author}/${permlink}`;
        if (!(key in map)) {
          try {
            map[key] = await fetchCharyComment(author, permlink);
          } catch (error) {
            console.error(`Failed to check chary comment for ${key}:`, error);
            map[key] = false; // Default to false on error
          }
        }
      }
      setCharyMap(map);
    };
    if (analyses.length > 0) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyses]);

  return charyMap;
}
