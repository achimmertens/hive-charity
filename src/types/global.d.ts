declare global {
  interface Window {
    hive_keychain: undefined | {
      requestSignBuffer(username: string, message: string, keyType: string, callback: (response: any) => void): void;
      requestHandshake(callback: () => void): void;
      getAccounts(): string[];
      requestVote(username: string, permlink: string, author: string, weight: number, callback: (response: any) => void): void;
      requestBroadcast(username: string, operations: any[], key: string, callback: (response: any) => void): void;
      requestPost(username: string, permlink: string, body: string, parentPermlink: string, parentAuthor: string, title: string, jsonMetadata: string, callback: (response: any) => void): void;
    };
  }
}

interface CharityAnalysis {
  isCharity: boolean;
  explanation: string;
  confidence: number;
}

// Default Export, um TypeScript-Fehler zu vermeiden
export default {};
