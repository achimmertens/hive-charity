interface KeychainResponse {
  success: boolean;
  message?: string;
  data?: {
    username: string;
    [key: string]: any;
  };
}

interface HiveKeychain {
  requestSignBuffer(username: string, message: string, keyType: string, callback: (response: KeychainResponse) => void): void;
  requestHandshake(callback: () => void): void;
  getAccounts(): string[];
  requestVote(username: string, permlink: string, author: string, weight: number, callback: (response: KeychainResponse) => void): void;
  requestBroadcast(username: string, operations: any[], key: string, callback: (response: KeychainResponse) => void): void;
  requestPost(username: string, permlink: string, body: string, parentPermlink: string, parentAuthor: string, title: string, jsonMetadata: string, callback: (response: KeychainResponse) => void): void;
}

interface Window {
  hive_keychain: HiveKeychain | undefined;
  hiveAuth: any;
}
