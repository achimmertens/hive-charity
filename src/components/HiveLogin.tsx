
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithKeychain, loginWithHiveAuth, isHiveKeychainAvailable, isHiveAuthAvailable, HiveUser } from "@/services/hiveAuth";
import { useToast } from "@/hooks/use-toast";

interface HiveLoginProps {
  onLogin: (user: HiveUser) => void;
}

const HiveLogin: React.FC<HiveLoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleKeychainLogin = () => {
    setIsLoading(true);
    loginWithKeychain((user, error) => {
      setIsLoading(false);
      if (user) {
        onLogin(user);
        toast({
          title: "Login successful",
          description: `Welcome, @${user.username}!`,
        });
      } else {
        toast({
          title: "Login failed",
          description: error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleHiveAuthLogin = () => {
    setIsLoading(true);
    loginWithHiveAuth((user, error) => {
      setIsLoading(false);
      if (user) {
        onLogin(user);
        toast({
          title: "Login successful",
          description: `Welcome, @${user.username}!`,
        });
      } else {
        toast({
          title: "Login failed",
          description: error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    });
  };
  
  const keychainAvailable = isHiveKeychainAvailable();
  const hiveAuthAvailable = isHiveAuthAvailable();
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Login with Hive</CardTitle>
        <CardDescription className="text-center">
          Use your Hive account to login
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleKeychainLogin}
            disabled={isLoading || !keychainAvailable}
            className="bg-hive hover:bg-hive-dark text-white"
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="animate-pulse mr-2">⚪</span>
                Logging in...
              </span>
            ) : (
              "Login with Hive Keychain"
            )}
          </Button>
          
          {!keychainAvailable && (
            <p className="text-xs text-gray-500 text-center">
              Hive Keychain extension is not detected. Please install it to use this option.
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleHiveAuthLogin}
            disabled={isLoading || !hiveAuthAvailable}
            variant="outline"
            className="border-hive text-hive hover:bg-hive hover:text-white"
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="animate-pulse mr-2">⚪</span>
                Logging in...
              </span>
            ) : (
              "Login with HiveAuth"
            )}
          </Button>
          
          {!hiveAuthAvailable && (
            <p className="text-xs text-gray-500 text-center">
              HiveAuth is not available. Please ensure you have the necessary setup.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-gray-500">
        <p>Don't have a Hive account? <a href="https://signup.hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">Create one here</a></p>
      </CardFooter>
    </Card>
  );
};

export default HiveLogin;
