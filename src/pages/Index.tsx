
import React, { useState, useEffect } from 'react';
import HiveLogin from '@/components/HiveLogin';
import HiveWelcome from '@/components/HiveWelcome';
import { HiveUser } from '@/services/hiveAuth';
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<HiveUser | null>(null);
  const { toast } = useToast();
  
  // Check if user was previously logged in (from localStorage)
  useEffect(() => {
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
  }, []);
  
  const handleLogin = (loggedInUser: HiveUser) => {
    setUser(loggedInUser);
    localStorage.setItem('hiveUser', JSON.stringify(loggedInUser));
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hiveUser');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-100">
      <header className="py-6 bg-white shadow-sm">
        <div className="container">
          <div className="flex justify-center">
            <h1 className="text-3xl font-bold text-hive">Hive Welcome Aboard</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {user && user.loggedIn ? (
            <HiveWelcome user={user} onLogout={handleLogout} />
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sie sind noch nicht bei Hive eingeloggt</h2>
                <p className="text-gray-600">Bitte loggen Sie sich mit Ihrem Hive-Account ein, um fortzufahren.</p>
              </div>
              <HiveLogin onLogin={handleLogin} />
            </>
          )}
        </div>
      </main>
      
      <footer className="py-6 bg-gray-50 border-t border-gray-200">
        <div className="container">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Hive Welcome Aboard. Powered by the <a href="https://hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">Hive</a> blockchain.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
