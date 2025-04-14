import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  loginWithKeychain, 
  loginWithHiveAuth, 
  loginWithHiveSigner,
  isHiveKeychainAvailable, 
  isHiveAuthAvailable, 
  HiveUser 
} from "@/services/hiveAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Loader2, KeyRound, Fingerprint, User, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";

interface HiveLoginProps {
  onLogin: (user: HiveUser) => void;
}

const formSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben").max(16, "Benutzername darf maximal 16 Zeichen haben")
});

type FormValues = z.infer<typeof formSchema>;

const HiveLogin: React.FC<HiveLoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [keychainAvailable, setKeychainAvailable] = useState<boolean | null>(null);
  const [hiveAuthAvailable, setHiveAuthAvailable] = useState<boolean | null>(null);
  const [loginMethod, setLoginMethod] = useState<'keychain' | 'hiveauth' | 'hivesigner' | null>(null);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });
  
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
  
  const handleKeychainLogin = (values: FormValues) => {
    setIsLoading(true);
    setLoginMethod('keychain');
    loginWithKeychain(values.username, (user, error) => {
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
  
  const handleHiveAuthLogin = (values: FormValues) => {
    setIsLoading(true);
    setLoginMethod('hiveauth');
    loginWithHiveAuth(values.username, (user, error) => {
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
  
  const handleHiveSignerLogin = () => {
    setIsLoading(true);
    setLoginMethod('hivesigner');
    loginWithHiveSigner((user, error) => {
      // This won't actually be called directly since HiveSigner redirects,
      // but we'll keep it for consistency
      if (error) {
        setIsLoading(false);
        setLoginMethod(null);
        toast({
          title: "Login fehlgeschlagen",
          description: error,
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
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hive Benutzername</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                        @
                      </span>
                      <Input 
                        placeholder="Benutzername eingeben" 
                        className="rounded-l-none" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Geben Sie Ihren Hive Benutzernamen ohne @ ein
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        
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
            onClick={() => {
              form.handleSubmit(handleKeychainLogin)();
            }}
            disabled={isLoading || keychainAvailable === false}
            className="bg-hive hover:bg-hive-dark text-white"
          >
            {isLoading && loginMethod === 'keychain' ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmeldung läuft...
              </span>
            ) : (
              <span className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4" />
                Mit Hive Keychain anmelden
              </span>
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
            onClick={() => {
              form.handleSubmit(handleHiveAuthLogin)();
            }}
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
              <span className="flex items-center">
                <Fingerprint className="mr-2 h-4 w-4" />
                Mit HiveAuth anmelden
              </span>
            )}
          </Button>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleHiveSignerLogin}
            disabled={isLoading}
            variant="secondary"
            className="border-blue-500 bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {isLoading && loginMethod === 'hivesigner' ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verbindung zu HiveSigner...
              </span>
            ) : (
              <span className="flex items-center">
                <ExternalLink className="mr-2 h-4 w-4" />
                Mit HiveSigner anmelden
              </span>
            )}
          </Button>
          <p className="text-xs text-center text-gray-500 mt-2">
            HiveSigner leitet Sie zu einer externen Seite weiter, um sich zu authentifizieren.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-gray-500">
        <p>Sie haben noch keinen Hive-Account? <a href="https://signup.hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">Erstellen Sie einen hier</a></p>
        <p className="text-gray-600">Wie man einen Hive Account erstellt, habe ich hier <a href="https://peakd.com/hive-121566/@achimmertens/wie-man-einen-hive-account-erstellt" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline"> beschrieben</a>. </p>

      </CardFooter>
    </Card>
  );
};

export default HiveLogin;
