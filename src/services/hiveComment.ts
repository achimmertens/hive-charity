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
  user: HiveUser,
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
  if (user.authType === "keychain" && typeof window !== "undefined" && window.hive_keychain) {
    window.hive_keychain.requestPost(
      user.username,
      "",
      body,
      parentPermlink,
      parentAuthor,
      permlink,
      jsonMetadata,
      (response: any) => {
        if (response?.success) {
          onResult(true, "Antwort wurde gepostet.");
        } else {
          onResult(false, response?.message || "Fehler beim Posten der Antwort.");
        }
      }
    );
    return;
  }

  // If logged in with HiveSigner
  if (user.authType === "hivesigner") {
    const url = `https://hivesigner.com/sign/comment?parent_author=${encodeURIComponent(
      parentAuthor
    )}&parent_permlink=${encodeURIComponent(parentPermlink)}&author=${encodeURIComponent(
      user.username
    )}&permlink=${encodeURIComponent(permlink)}&title=&body=${encodeURIComponent(
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

// Extend global Window type for Keychain API
declare global {
  interface Window {
    hive_keychain: {
      requestPost: (
        username: string,
        title: string,
        body: string,
        parentPermlink: string,
        parentAuthor: string,
        permlink: string,
        jsonMetadata: string,
        callback: (response: any) => void
      ) => void;
    };
  }
}
