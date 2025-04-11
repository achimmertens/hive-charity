
export interface HiveUser {
  username: string;
  loggedIn: boolean;
}

// Check if Hive Keychain is available in the browser
export const isHiveKeychainAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.hive_keychain !== undefined;
};

// Check if HiveAuth is available
export const isHiveAuthAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.hiveAuth !== undefined;
};

// Login with Hive Keychain
export const loginWithKeychain = (callback: (user: HiveUser | null, error?: string) => void): void => {
  if (!isHiveKeychainAvailable()) {
    callback(null, "Hive Keychain is not installed");
    return;
  }

  const now = Date.now();
  const message = `Login to Hive Welcome App: ${now}`;
  
  window.hive_keychain.requestSignBuffer(
    "", // We don't know the username yet, so leave it empty
    message,
    "Posting", // Use the posting key for authentication
    (response: any) => {
      if (response.success) {
        callback({
          username: response.data.username,
          loggedIn: true
        });
      } else {
        callback(null, response.message || "Authentication failed");
      }
    }
  );
};

// Login with HiveAuth
export const loginWithHiveAuth = (callback: (user: HiveUser | null, error?: string) => void): void => {
  if (!isHiveAuthAvailable()) {
    callback(null, "HiveAuth is not available");
    return;
  }

  // This is a simplified version, actual implementation would require proper HiveAuth integration
  window.hiveAuth.login((error: any, username: string) => {
    if (error) {
      callback(null, error.toString());
      return;
    }
    
    if (username) {
      callback({
        username,
        loggedIn: true
      });
    } else {
      callback(null, "Authentication failed");
    }
  });
};

// Add type definitions for the global window object
declare global {
  interface Window {
    hive_keychain: any;
    hiveAuth: any;
  }
}
