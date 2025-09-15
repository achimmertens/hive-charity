import { HiveUser } from "./hiveAuth";

// Utility to generate a unique permlink for a comment
function generateCommentPermlink(parentAuthor: string, parentPermlink: string) {
  const base = `re-${parentAuthor}-${parentPermlink}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 255);
  return `${base}-${Date.now()}`.slice(0, 255);
}

export function postComment(
  user: HiveUser & { authType: 'keychain' | 'hivesigner' },
  parentAuthor: string,
  parentPermlink: string,
  body: string,
  onResult: (success: boolean, message: string) => void
) {
  if (!user || !user.loggedIn) {
    onResult(false, "Bitte zuerst einloggen.");
    return;
  }

  const permlink = generateCommentPermlink(parentAuthor, parentPermlink);
  const jsonMetadata = JSON.stringify({ app: "hive-charity-explorer", tags: ["charity"] });

  // If logged in with Hive Keychain
  if (user.authType === "keychain") {
    if (typeof window === "undefined") {
      onResult(false, "Browser-Umgebung nicht verfügbar");
      return;
    }

    // Warte bis Keychain verfügbar ist
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
        console.log("Hive Keychain gefunden, starte Kommentar-Posting");
        console.log("Parameter:", {
          username: user.username,
          parentAuthor,
          parentPermlink,
          permlink,
          body: body.slice(0, 50) + "..." // Nur für Debug-Zwecke gekürzt
        });

        const keychain = window.hive_keychain!;
        const doPost = () => {
          try {
            const operations = [[
              "comment",
              {
                parent_author: parentAuthor,
                parent_permlink: parentPermlink,
                author: user.username,
                permlink,
                title: "",
                body,
                json_metadata: jsonMetadata
              }
            ]];

            console.log("Keychain requestBroadcast operations:", operations);
            let responded = false;
            const noCallbackTimer = setTimeout(() => {
              if (!responded) {
                console.warn("Keychain did not respond within 15s");
                onResult(false, "Keine Antwort von Hive Keychain. Bitte erneut versuchen.");
              }
            }, 15000);

            keychain.requestBroadcast(
              user.username,
              operations as any,
              "Posting",
              (broadcastResponse: any) => {
                responded = true;
                clearTimeout(noCallbackTimer);
                console.log("Keychain broadcast response:", broadcastResponse);
                if (broadcastResponse?.success) {
                  onResult(true, "Antwort wurde erfolgreich gepostet!");
                  setTimeout(() => {
                    window.location.href = `https://peakd.com/@${parentAuthor}/${parentPermlink}#${permlink}`;
                  }, 2000);
                } else {
                  console.warn("Broadcast failed, trying requestPost as fallback.", broadcastResponse);
                  try {
                    // Try legacy requestPost as a fallback (two possible signatures)
                    const tryLegacy = (cb: (r: any) => void) =>
                      keychain.requestPost(
                        user.username,
                        permlink,
                        body,
                        parentPermlink,
                        parentAuthor,
                        "",
                        jsonMetadata,
                        cb
                      );
                    tryLegacy((response: any) => {
                      console.log("Keychain requestPost fallback response:", response);
                      if (response?.success) {
                        onResult(true, "Antwort wurde erfolgreich gepostet!");
                        setTimeout(() => {
                          window.location.href = `https://peakd.com/@${parentAuthor}/${parentPermlink}#${permlink}`;
                        }, 2000);
                      } else {
                        console.error("Keychain requestPost fallback failed:", response);
                        onResult(false, response?.message || "Fehler beim Posten der Antwort.");
                      }
                    });
                  } catch (fallbackErr) {
                    console.error("Exception in requestPost fallback:", fallbackErr);
                    onResult(false, "Technischer Fehler beim Posten der Antwort.");
                  }
                }
              }
            );
          } catch (innerError) {
            console.error("Exception calling requestBroadcast:", innerError);
            onResult(false, "Technischer Fehler beim Posten der Antwort.");
          }
        };

        // Directly post without handshake to avoid request_id null issues seen in some environments
        doPost();
      } catch (error) {
        console.error("Exception in Keychain integration:", error);
        onResult(false, "Technischer Fehler beim Posten der Antwort.");
      }
    };

    // Start waiting for keychain
    waitForKeychain();
    return;
  }

  // If logged in with HiveSigner
  if (user.authType === "hivesigner") {
    const url = `https://hivesigner.com/sign/comment?parent_author=${encodeURIComponent(
      parentAuthor
    )}&parent_permlink=${encodeURIComponent(
      parentPermlink
    )}&author=${encodeURIComponent(
      user.username
    )}&permlink=${encodeURIComponent(
      permlink
    )}&title=&body=${encodeURIComponent(
      body
    )}&json_metadata=${encodeURIComponent(jsonMetadata)}`;
    // Open HiveSigner signing page in a new tab
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
      onResult(true, "Weiterleitung zu HiveSigner zum Signieren der Antwort.");
    }
    return;
  }

  // HiveAuth not supported yet
  onResult(false, "Antworten über HiveAuth wird noch nicht unterstützt.");
}


export function votePost(
  user: HiveUser & { authType: 'keychain' | 'hivesigner' },
  author: string,
  permlink: string,
  weightPercent: number,
  onResult: (success: boolean, message: string) => void
) {
  if (!user || !user.loggedIn) {
    onResult(false, "Bitte zuerst einloggen.");
    return;
  }

  const weight = Math.max(0, Math.min(100, Math.round(weightPercent))) * 100; // Hive weight: 0..10000

  if (user.authType === 'keychain') {
    if (typeof window === 'undefined' || !window.hive_keychain) {
      onResult(false, 'Hive Keychain nicht verfügbar.');
      return;
    }
    try {
      console.log('Keychain vote request:', { username: user.username, author, permlink, weight });
      window.hive_keychain.requestVote(
        user.username,
        permlink,
        author,
        weight,
        (response: any) => {
          console.log('Keychain vote response:', response);
          if (response?.success) {
            onResult(true, 'Upvote erfolgreich gesendet.');
          } else {
            onResult(false, response?.message || 'Fehler beim Senden des Upvotes.');
          }
        }
      );
    } catch (e) {
      console.error('Keychain vote exception:', e);
      onResult(false, 'Technischer Fehler beim Upvote.');
    }
    return;
  }

  if (user.authType === 'hivesigner') {
    const url = `https://hivesigner.com/sign/vote?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}&voter=${encodeURIComponent(user.username)}&weight=${weight}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      onResult(true, 'Weiterleitung zu HiveSigner zum Signieren des Upvotes.');
    }
    return;
  }

  onResult(false, 'Upvote über HiveAuth wird noch nicht unterstützt.');
}

