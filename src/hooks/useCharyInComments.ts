
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
        const raw = await res.json();
        if (!raw.result || !raw.result.replies) return false;
        return raw.result.replies.some(
          (reply: any) =>
            typeof reply.body === "string" &&
            reply.body.toLowerCase().includes("!chary")
        );
      } catch {
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
          map[key] = await fetchCharyComment(author, permlink);
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
