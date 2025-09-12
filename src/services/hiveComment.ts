import { HiveUser, AuthType } from "./hiveAuth";

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

        window.hive_keychain.requestPost(
        user.username,
        permlink,
        body,
        parentPermlink,
        parentAuthor,
        "",
        jsonMetadata,
        (response: any) => {
          console.log("Keychain response:", response);
          if (response?.success) {
            onResult(true, "Antwort wurde erfolgreich gepostet!");
            // Kurze Pause für die UI-Aktualisierung
            setTimeout(() => {
              window.location.href = `https://peakd.com/@${parentAuthor}/${parentPermlink}#${permlink}`;
            }, 2000);
          } else {
            console.error("Keychain error:", response);
            onResult(false, response?.message || "Fehler beim Posten der Antwort.");
          }
        }
      );
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

