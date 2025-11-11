import { HiveUser } from "./hiveAuth";

// Generate permlink for a post
function generatePostPermlink(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return `${base}-${Date.now()}`.slice(0, 255);
}

// Get current calendar week
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in one week
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
}

// Convert report data to Markdown format
export function generateReportMarkdown(heroes: any[]): string {
  const weekNumber = getWeekNumber();
  
  let markdown = `# Charity Heroes Report Week ${weekNumber}\n\n`;
  markdown += `Hello everyone,\n\n`;
  markdown += `Here are the\n\n`;
  markdown += `![grafik.png](https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/charitychecker/23wzWzqvLFLeh8FziFFqjgJkn7wkA2qrXdS5JJj9u69c5Fm5X4hVbeHf5KyKqSxrKQAeg.png)\n\n`;
  
  markdown += `# Charity Heroes Of Week ${weekNumber}:\n\n`;
  markdown += `| Nr. | Chary Score | Author | Reputation | url | image |\n`;
  markdown += `| --- | --- | --- | --- | --- | --- |\n`;
  
  heroes.forEach((hero, index) => {
    const imgMarkdown = hero.image_url 
      ? `![](${hero.image_url})`
      : '';
    markdown += `| ${index + 1}. | ${hero.charity_score} | [@${hero.author_name}](https://peakd.com/@${hero.author_name}) | ${hero.author_reputation?.toFixed(0) || 'N/A'} | [${hero.article_url}](${hero.article_url}) | ${imgMarkdown} |\n`;
  });
  
  markdown += `\n# What did they do?\n\n`;
  
  heroes.forEach((hero) => {
    const parsed = parseOpenAIResponse(hero.openai_response);
    markdown += `## [@${hero.author_name}](https://peakd.com/@${hero.author_name})\n\n`;
    markdown += `${parsed.reason || parsed.summary || 'Charitable activity detected.'}\n\n`;
  });
  
  markdown += `# Call to action\n\n`;
  markdown += `![grafik.png](https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/charitychecker/23t8D6MYgc4BA1aCyxvedcMEssMdDPd8ENNjgpJ7imYTNA3rcT5t9uW7e43iVHoz4Nj9J.png)\n\n`;
  
  markdown += `# What's about this report?\n\n`;
  markdown += `![grafik.png](https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/charitychecker/Eo2BSgYeC4RZVPxTbUwe7PLwA9TAYhDwgqTRvFucPpWbop9KqwSm9UMJSakh24ojRUd.png)\n\n`;
  
  markdown += `# Links to follow:\n\n`;
  markdown += `- [Achim Mertens](https://peakd.com/@achimmertens)\n\n`;
  markdown += `- [CharityChecker](https://peakd.com/@charitychecker)\n\n`;
  markdown += `- [About Charitychecker](https://peakd.com/hive-149312/@charitychecker/charitychecker-my-introducemyself-deutschenglish)\n\n`;
  markdown += `- [Hive Marketing](https://peakd.com/c/hive-154303/trending)\n\n`;
  markdown += `- [Advertisingbot2](https://peakd.com/@advertisingbot2)\n\n\n`;
  
  markdown += `Let's make the world a little bit better.\n\n`;
  markdown += `Regards,\n\n`;
  markdown += `CharityChecker (alias [@achimmertens](https://peakd.com/@achimmertens))`;
  
  return markdown;
}

// Parse OpenAI response to extract reason/summary
function parseOpenAIResponse(response: string | null): { reason?: string; summary?: string } {
  if (!response) return {};
  
  try {
    const parsed = JSON.parse(response);
    return {
      reason: parsed.reason || parsed.explanation,
      summary: parsed.summary || parsed.description
    };
  } catch {
    return { summary: response };
  }
}

// Post report to Hive blockchain
export function postReportToHive(
  user: HiveUser & { authType: 'keychain' | 'hivesigner' },
  heroes: any[],
  customBody: string | null,
  onResult: (success: boolean, message: string, url?: string) => void
) {
  if (!user || !user.loggedIn) {
    onResult(false, "Bitte zuerst einloggen.");
    return;
  }

  const weekNumber = getWeekNumber();
  const title = `Charity Heroes Report Week ${weekNumber}`;
  const permlink = generatePostPermlink(title);
  const body = customBody || generateReportMarkdown(heroes);
  
  const jsonMetadata = JSON.stringify({
    app: "hive-charity-explorer",
    tags: ["charity", "charitychecker", "report", "hive-149312"],
    description: "These daily routine heros deserve some attention.",
    format: "markdown"
  });

  // If logged in with Hive Keychain
  if (user.authType === "keychain") {
    if (typeof window === "undefined") {
      onResult(false, "Browser-Umgebung nicht verfügbar");
      return;
    }

    // Wait for Keychain to be available
    let retries = 0;
    const maxRetries = 5;
    const waitForKeychain = () => {
      if (retries >= maxRetries) {
        onResult(false, "Hive Keychain nicht gefunden. Bitte installieren Sie die Browser-Erweiterung.");
        return;
      }

      if (!window.hive_keychain) {
        retries++;
        console.log(`Waiting for Keychain (attempt ${retries})...`);
        setTimeout(waitForKeychain, 1000);
        return;
      }

      try {
        console.log("Hive Keychain gefunden, starte Report-Posting");
        
        const keychain = window.hive_keychain!;
        
        const operations = [[
          "comment",
          {
            parent_author: "",
            parent_permlink: "hive-149312", // Community tag
            author: user.username,
            permlink,
            title,
            body,
            json_metadata: jsonMetadata
          }
        ]];

        console.log("Keychain requestBroadcast operations:", operations);
        let responded = false;
        const noCallbackTimer = setTimeout(() => {
          if (!responded) {
            console.warn("Keychain did not respond within 30s");
            onResult(false, "Keine Antwort von Hive Keychain. Bitte erneut versuchen.");
          }
        }, 30000);

        keychain.requestBroadcast(
          user.username,
          operations as any,
          "Posting",
          (broadcastResponse: any) => {
            responded = true;
            clearTimeout(noCallbackTimer);
            console.log("Keychain broadcast response:", broadcastResponse);
            
            if (broadcastResponse?.success) {
              const postUrl = `https://peakd.com/hive-149312/@${user.username}/${permlink}`;
              onResult(true, "Report wurde erfolgreich auf Hive veröffentlicht!", postUrl);
            } else {
              const errorMsg = broadcastResponse?.message || "Unbekannter Fehler beim Posten";
              console.error("Broadcast failed:", broadcastResponse);
              onResult(false, `Fehler beim Posten: ${errorMsg}`);
            }
          }
        );
      } catch (error) {
        console.error("Error in postReportToHive:", error);
        onResult(false, `Fehler: ${error}`);
      }
    };

    waitForKeychain();
  } 
  // HiveSigner flow (if needed in future)
  else if (user.authType === "hivesigner") {
    onResult(false, "HiveSigner wird derzeit nicht unterstützt für Posts. Bitte verwenden Sie Hive Keychain.");
  }
}
