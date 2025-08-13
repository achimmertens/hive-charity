import { HiveUser } from './hiveAuth';

export const logoutFromHive = async (user: HiveUser): Promise<void> => {
  if (!user) return;

  // Clear HiveSigner token if that was the auth method
  if (user.authType === 'hivesigner' && user.accessToken) {
    try {
      await fetch('https://hivesigner.com/api/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: user.accessToken
        })
      });
    } catch (error) {
      console.error('Error revoking HiveSigner token:', error);
    }
  }

  // Clear any Keychain state if needed
  if (user.authType === 'keychain') {
    if (window.hive_keychain) {
      // No specific logout needed for Keychain
      console.log('Cleared Keychain state');
    }
  }

  // Clear HiveAuth state if needed
  if (user.authType === 'hiveauth') {
    if (window.hiveAuth) {
      try {
        window.hiveAuth.logout();
      } catch (error) {
        console.error('Error logging out from HiveAuth:', error);
      }
    }
  }

  // Local cleanup is handled by the main app (clearing localStorage etc.)
};
