export interface HiveUser {
  username: string;
  loggedIn: boolean;
  authType?: 'keychain' | 'hiveauth' | 'hivesigner';
  accessToken?: string; // For HiveSigner
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
export const loginWithKeychain = (username: string, callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Attempting to login with Hive Keychain for user:", username);
  console.log("Keychain available:", isHiveKeychainAvailable());
  
  if (!username || username.trim() === '') {
    callback(null, "Bitte geben Sie einen Benutzernamen ein");
    return;
  }
  
  if (!isHiveKeychainAvailable()) {
    setTimeout(() => {
      // Try again after a delay to ensure extension is loaded
      if (isHiveKeychainAvailable()) {
        console.log("Keychain detected after delay");
        performKeychainLogin(username, callback);
      } else {
        console.log("Keychain still not detected after delay");
        callback(null, "Hive Keychain ist nicht installiert oder nicht erkannt");
      }
    }, 1000);
    return;
  }
  
  performKeychainLogin(username, callback);
};

const performKeychainLogin = (username: string, callback: (user: HiveUser | null, error?: string) => void): void => {
  const now = Date.now();
  const message = `Login to Hive Welcome App: ${now}`;
  
  console.log(`Requesting keychain sign buffer for user ${username}`);
  
  window.hive_keychain.requestSignBuffer(
    username,
    message,
    "Posting", // Use the posting key for authentication
    (response: any) => {
      console.log("Keychain response:", response);
      if (response.success) {
        callback({
          username: response.data.username || username,
          loggedIn: true,
          authType: 'keychain'
        });
      } else {
        callback(null, response.message || "Authentifizierung fehlgeschlagen");
      }
    }
  );
};

// Login with HiveAuth
export const loginWithHiveAuth = (username: string, callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Attempting to login with HiveAuth for user:", username);
  console.log("HiveAuth available:", isHiveAuthAvailable());
  
  if (!username || username.trim() === '') {
    callback(null, "Bitte geben Sie einen Benutzernamen ein");
    return;
  }
  
  if (!isHiveAuthAvailable()) {
    setTimeout(() => {
      // Try again after a delay to ensure extension is loaded
      if (isHiveAuthAvailable()) {
        console.log("HiveAuth detected after delay");
        performHiveAuthLogin(username, callback);
      } else {
        console.log("HiveAuth still not detected after delay");
        callback(null, "HiveAuth ist nicht verfügbar oder nicht erkannt");
      }
    }, 1000);
    return;
  }
  
  performHiveAuthLogin(username, callback);
};

const performHiveAuthLogin = (username: string, callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Performing HiveAuth login for user:", username);
  
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
        loggedIn: true,
        authType: 'hiveauth'
      });
    } else {
      callback(null, "Authentifizierung fehlgeschlagen");
    }
  });
};

// Login with HiveSigner
export const loginWithHiveSigner = (callback: (user: HiveUser | null, error?: string) => void): void => {
  console.log("Attempting to login with HiveSigner");

  const clientId = 'hive-charity-explorer'; // Your application name
  const redirectUri = window.location.origin; // Redirect back to your app
  const scope = 'posting'; // We need posting permission to vote

  // Save callback info to localStorage to retrieve after redirect
  localStorage.setItem('hivesigner_login_pending', 'true');
  
  // Redirect to HiveSigner authorization page
  window.location.href = `https://hivesigner.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
};

// Process HiveSigner callback after redirect
export const processHiveSignerCallback = (): Promise<HiveUser | null> => {
  console.log("Processing HiveSigner callback");
  
  // Check if we're expecting a HiveSigner callback
  if (localStorage.getItem('hivesigner_login_pending') !== 'true') {
    return Promise.resolve(null);
  }
  
  // Clean up the pending flag
  localStorage.removeItem('hivesigner_login_pending');
  
  // Parse the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) {
    console.log("No authorization code found in URL");
    return Promise.resolve(null);
  }
  
  // Clear the code from the URL without reloading the page
  window.history.replaceState({}, document.title, window.location.pathname);
  
  console.log("Authorization code found:", code);
  
  // Exchange the authorization code for an access token
  // Note: In a production app, this should be done in a backend service
  return fetch('https://hivesigner.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code,
      client_id: 'hive-charity-explorer',
      client_secret: '', // Usually empty for HiveSigner
      redirect_uri: window.location.origin,
      grant_type: 'authorization_code'
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log("Token response:", data);
    
    if (data.access_token && data.username) {
      // Successfully obtained access token
      return {
        username: data.username,
        loggedIn: true,
        authType: 'hivesigner',
        accessToken: data.access_token
      };
    } else {
      console.error("Failed to obtain access token:", data);
      return null;
    }
  })
  .catch(error => {
    console.error("Error exchanging code for token:", error);
    return null;
  });
};

// Add type definitions for the global window object
declare global {
  interface Window {
    hive_keychain: {
      requestSignBuffer: (username: string, message: string, method: string, callback: (response: any) => void) => void;
      requestHandshake: (callback: () => void) => void;
      getAccounts: () => string[];
      requestVote: (username: string, permlink: string, author: string, weight: number, callback: (response: any) => void) => void;
    };
    hiveAuth: any;
  }
}
