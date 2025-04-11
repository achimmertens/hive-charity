
export interface HiveUser {
  username: string;
  loggedIn: boolean;
}

// Check if Hive Keychain is available in the browser
export const isHiveKeychainAvailable = (): boolean => {
  try {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return false;
    
    // Check if hive_keychain is defined on the window object
    return window.hive_keychain !== undefined;
  } catch (e) {
    console.error("Error checking Hive Keychain availability:", e);
    return false;
  }
};

// Check if HiveAuth is available
export const isHiveAuthAvailable = (): boolean => {
  try {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return false;
    
    // Check if hiveAuth is defined on the window object
    return window.hiveAuth !== undefined;
  } catch (e) {
    console.error("Error checking HiveAuth availability:", e);
    return false;
  }
};

// Login with Hive Keychain
export const loginWithKeychain = (callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Attempting to login with Hive Keychain");
  console.log("Keychain available:", isHiveKeychainAvailable());
  
  if (!isHiveKeychainAvailable()) {
    setTimeout(() => {
      // Try again after a delay to ensure extension is loaded
      if (isHiveKeychainAvailable()) {
        console.log("Keychain detected after delay");
        performKeychainLogin(callback);
      } else {
        console.log("Keychain still not detected after delay");
        callback(null, "Hive Keychain is not installed or not detected");
      }
    }, 1000);
    return;
  }
  
  performKeychainLogin(callback);
};

const performKeychainLogin = (callback: (user: HiveUser | null, error?: string) => void): void => {
  const now = Date.now();
  const message = `Login to Hive Welcome App: ${now}`;
  
  console.log("Requesting keychain sign buffer");
  
  window.hive_keychain.requestSignBuffer(
    "", // We don't know the username yet, so leave it empty
    message,
    "Posting", // Use the posting key for authentication
    (response: any) => {
      console.log("Keychain response:", response);
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
  console.log("Attempting to login with HiveAuth");
  console.log("HiveAuth available:", isHiveAuthAvailable());
  
  if (!isHiveAuthAvailable()) {
    setTimeout(() => {
      // Try again after a delay to ensure extension is loaded
      if (isHiveAuthAvailable()) {
        console.log("HiveAuth detected after delay");
        performHiveAuthLogin(callback);
      } else {
        console.log("HiveAuth still not detected after delay");
        callback(null, "HiveAuth is not available or not detected");
      }
    }, 1000);
    return;
  }
  
  performHiveAuthLogin(callback);
};

const performHiveAuthLogin = (callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Performing HiveAuth login");
  
  // This is a simplified version, actual implementation would require proper HiveAuth integration
  window.hiveAuth.login((error: any, username: string) => {
    console.log("HiveAuth response:", { error, username });
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
