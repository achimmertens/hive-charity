
import React, { useState, useEffect } from 'react';
import HiveLogin from '@/components/HiveLogin';
import HiveWelcome from '@/components/HiveWelcome';
import { HiveUser, processHiveSignerCallback } from '@/services/hiveAuth';
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<HiveUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Check if user was previously logged in or process HiveSigner callback
  useEffect(() => {
    const checkLogin = async () => {
      setLoading(true);
      
      // First, check if this is a HiveSigner callback
      const hivesignerUser = await processHiveSignerCallback();
      
      if (hivesignerUser) {
        // User authenticated via HiveSigner
        console.log("User authenticated via HiveSigner:", hivesignerUser);
        setUser(hivesignerUser);
        localStorage.setItem('hiveUser', JSON.stringify(hivesignerUser));
        toast({
          title: "Login erfolgreich",
          description: `Willkommen, @${hivesignerUser.username}!`,
        });
        setLoading(false);
        return;
      }
      
      // If not a HiveSigner callback, check localStorage
      const savedUser = localStorage.getItem('hiveUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('hiveUser');
        }
      }
      
      setLoading(false);
    };
    
    checkLogin();
  }, [toast]);
  
  const handleLogin = (loggedInUser: HiveUser) => {
    setUser(loggedInUser);
    localStorage.setItem('hiveUser', JSON.stringify(loggedInUser));
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hiveUser');
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hive mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-100">
      <header className="py-6 bg-white shadow-sm">
        <div className="container">
          <div className="flex justify-center">
            <h1 className="text-3xl font-bold text-hive">Hive Charity Explorer</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container py-12">
        <div className="w-full">
          {user && user.loggedIn ? (
            <HiveWelcome user={user} onLogout={handleLogout} />
          ) : (
            <>
              <div className="text-center mb-8 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sie sind noch nicht bei Hive eingeloggt</h2>
                <p className="text-gray-600">Bitte loggen Sie sich mit Ihrem Hive-Account ein, um Charity-Beiträge zu sehen und upzuvoten.</p>
              </div>
              <div className="max-w-md mx-auto">
                <HiveLogin onLogin={handleLogin} />
              </div>
            </>
          )}
        </div>
      </main>
      
      <footer className="py-6 bg-gray-50 border-t border-gray-200">
        <div className="container">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Hive Charity Explorer. Powered by the <a href="https://hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">Hive</a> blockchain.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
