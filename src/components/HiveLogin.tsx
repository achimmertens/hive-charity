
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithKeychain, loginWithHiveAuth, isHiveKeychainAvailable, isHiveAuthAvailable, HiveUser } from "@/services/hiveAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HiveLoginProps {
  onLogin: (user: HiveUser) => void;
}

const HiveLogin: React.FC<HiveLoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [keychainAvailable, setKeychainAvailable] = useState<boolean | null>(null);
  const [hiveAuthAvailable, setHiveAuthAvailable] = useState<boolean | null>(null);
  const [loginMethod, setLoginMethod] = useState<'keychain' | 'hiveauth' | null>(null);
  const { toast } = useToast();
  
  // Check availability after component mounts
  useEffect(() => {
    // Initial check
    checkAvailability();
    
    // Re-check after a delay to ensure extensions are loaded
    const timer = setTimeout(() => {
      checkAvailability();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const checkAvailability = () => {
    setKeychainAvailable(isHiveKeychainAvailable());
    setHiveAuthAvailable(isHiveAuthAvailable());
    console.log("Checking availability:", {
      keychain: isHiveKeychainAvailable(),
      hiveAuth: isHiveAuthAvailable()
    });
  };
  
  const handleKeychainLogin = () => {
    setIsLoading(true);
    setLoginMethod('keychain');
    loginWithKeychain((user, error) => {
      setIsLoading(false);
      setLoginMethod(null);
      if (user) {
        onLogin(user);
        toast({
          title: "Login erfolgreich",
          description: `Willkommen, @${user.username}!`,
        });
      } else {
        toast({
          title: "Login fehlgeschlagen",
          description: error || "Unbekannter Fehler aufgetreten",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleHiveAuthLogin = () => {
    setIsLoading(true);
    setLoginMethod('hiveauth');
    loginWithHiveAuth((user, error) => {
      setIsLoading(false);
      setLoginMethod(null);
      if (user) {
        onLogin(user);
        toast({
          title: "Login erfolgreich",
          description: `Willkommen, @${user.username}!`,
        });
      } else {
        toast({
          title: "Login fehlgeschlagen",
          description: error || "Unbekannter Fehler aufgetreten",
          variant: "destructive",
        });
      }
    });
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Login mit Hive</CardTitle>
        <CardDescription className="text-center">
          Verwenden Sie Ihren Hive-Account, um sich einzuloggen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keychainAvailable === false && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hive Keychain nicht erkannt</AlertTitle>
            <AlertDescription>
              Die Hive Keychain Erweiterung wurde nicht erkannt. Bitte installieren Sie sie oder aktualisieren Sie die Seite.
            </AlertDescription>
          </Alert>
        )}
        
        {keychainAvailable === true && (
          <Alert className="mb-4 border-green-500 text-green-700">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Hive Keychain erkannt</AlertTitle>
            <AlertDescription>
              Die Hive Keychain Erweiterung ist installiert und bereit.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleKeychainLogin}
            disabled={isLoading || keychainAvailable === false}
            className="bg-hive hover:bg-hive-dark text-white"
          >
            {isLoading && loginMethod === 'keychain' ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmeldung läuft...
              </span>
            ) : (
              "Mit Hive Keychain anmelden"
            )}
          </Button>
        </div>
        
        {hiveAuthAvailable === false && (
          <Alert variant="destructive" className="mb-4 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>HiveAuth nicht erkannt</AlertTitle>
            <AlertDescription>
              HiveAuth wurde nicht erkannt. Bitte stellen Sie sicher, dass Sie die notwendige Einrichtung haben.
            </AlertDescription>
          </Alert>
        )}
        
        {hiveAuthAvailable === true && (
          <Alert className="mb-4 mt-4 border-green-500 text-green-700">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>HiveAuth erkannt</AlertTitle>
            <AlertDescription>
              HiveAuth ist installiert und bereit.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleHiveAuthLogin}
            disabled={isLoading || hiveAuthAvailable === false}
            variant="outline"
            className="border-hive text-hive hover:bg-hive hover:text-white"
          >
            {isLoading && loginMethod === 'hiveauth' ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmeldung läuft...
              </span>
            ) : (
              "Mit HiveAuth anmelden"
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-gray-500">
        <p>Sie haben noch keinen Hive-Account? <a href="https://signup.hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">Erstellen Sie einen hier</a></p>
      </CardFooter>
    </Card>
  );
};

export default HiveLogin;
