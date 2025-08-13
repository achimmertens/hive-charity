import { useState, useEffect } from "react";
import HiveLogin from '@/components/HiveLogin';
import HiveWelcome from '@/components/HiveWelcome';
import { HiveUser, processHiveSignerCallback } from '@/services/hiveAuth';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IndexProps {
  user: HiveUser | null;
  setUser: (user: HiveUser | null) => void;
}

const Index: React.FC<IndexProps> = ({ user, setUser }) => {
  // State for manual CharityCheck
  const [manualUrl, setManualUrl] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Helper: fetch Hive post by URL
  async function fetchHivePostByUrl(url: string) {
    // Example: https://peakd.com/@author/permlink
    const match = url.match(/@([^/]+)\/([^/?#]+)/);
    if (!match) return null;
    const author = match[1];
    const permlink = match[2];
    // Use Hive API
    const resp = await fetch("https://api.hive.blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "condenser_api.get_content",
        params: [author, permlink],
        id: 1
      })
    });
    const data = await resp.json();
    if (!data || !data.result || !data.result.author) return null;
    return data.result;
  }

  // CharityCheck handler
  const handleManualCharityCheck = async () => {
    if (!manualUrl.trim()) {
      toast({ title: "Bitte eine Hive-Post-URL eingeben." });
      return;
    }
    setManualLoading(true);
    try {
      const post = await fetchHivePostByUrl(manualUrl.trim());
      if (!post) {
        toast({ title: "Kein Hive-Post gefunden.", description: "Bitte überprüfe die URL." });
        setManualLoading(false);
        return;
      }
      // Prepare HivePost object for analyzeCharityPost
      const hivePost = {
        author: post.author,
        permlink: post.permlink,
        title: post.title,
        body: post.body,
        created: post.created,
        category: post.category,
        tags: post.json_metadata ? (JSON.parse(post.json_metadata).tags || []) : [],
        payout: parseFloat(post.pending_payout_value?.split(" ")[0] || "0"),
        upvoted: false,
        image_url: post.json_metadata ? (() => { try { const meta = JSON.parse(post.json_metadata); if (meta.image && meta.image.length > 0) return meta.image[0]; if (meta.cover_image) return meta.cover_image; return undefined; } catch { return undefined; } })() : undefined,
        author_reputation: post.author_reputation ? Math.round(post.author_reputation / 1000000000000) : 0,
      };
      // Import analyzeCharityPost dynamically
      const { analyzeCharityPost } = await import("@/utils/charityAnalysis");
      const result = await analyzeCharityPost(hivePost);
      toast({
        title: "CharityCheck abgeschlossen",
        description: `Score: ${result.charyScore}/10 - ${result.summary}`,
      });
    } catch (err) {
      toast({ title: "Fehler bei CharityCheck", description: String(err), variant: "destructive" });
    }
    setManualLoading(false);
  };
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Record login to Supabase
  const recordLogin = async (username: string) => {
    try {
      // First, check if the account exists
      const { data: existingAccount } = await supabase
        .from('Account')
        .select('*')
        .eq('loginname', username)
        .single();
      
      // If account doesn't exist, create it
      if (!existingAccount) {
        await supabase
          .from('Account')
          .insert({ loginname: username });
        
        console.log(`New account created for user: ${username}`);
      }
      
      // Record login in the LoginLog table - Fixed to use lowercase 'loginlog'
      await supabase
        .from('loginlog')
        .insert({ loginname: username });
      
      console.log(`Login recorded for user: ${username}`);
    } catch (error) {
      console.error('Error recording login:', error);
      // Don't block the user login process if recording fails
    }
  };
  
  // Check if user was previously logged in or process HiveSigner callback
  useEffect(() => {
    const checkLogin = async () => {
      setLoading(true);
      
      // First, check if this is a HiveSigner callback
      const hivesignerUser = await processHiveSignerCallback();
      
      if (hivesignerUser) {
        // User authenticated via HiveSigner
        console.log("User authenticated via HiveSigner:", hivesignerUser);
        
        // Record the login in Supabase
        await recordLogin(hivesignerUser.username);
        
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
      <main className="flex-1 container py-12">
        {/* CharityCheck Input */}
        <div className="w-full max-w-xl mx-auto mb-8 flex flex-col items-center gap-4">
          <div className="w-full flex gap-2">
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              placeholder="Hive-Post-URL eingeben (z.B. https://peakd.com/@autor/permlink)"
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              disabled={manualLoading}
            />
            <button
              className={`bg-hive text-white px-4 py-2 rounded font-bold ${manualLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleManualCharityCheck}
              disabled={manualLoading}
            >
              CharityCheck
            </button>
          </div>
          <div className="text-xs text-gray-500 w-full">Gib eine Hive-Post-URL ein und prüfe den Charity-Score des Autors. Das Ergebnis erscheint in der Historie.</div>
        </div>
        <div className="w-full">
          {user && user.loggedIn ? (
            <HiveWelcome user={user} />
          ) : (
            <>
              <div className="text-center mb-8 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sie sind noch nicht bei Hive eingeloggt</h2>
                <p className="text-gray-600">Bitte loggen Sie sich mit Ihrem Hive-Account ein, um Charity-Beiträge zu sehen und upzuvoten.</p>
                <p className="text-gray-600">Wenn Sie noch keinen Hive-Account haben, können Sie sich <a href="https://signup.hive.io" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline">hier registrieren</a>.</p>
                <p className="text-gray-600">Wie man einen Hive Account erstellt, habe ich hier <a href="https://peakd.com/hive-121566/@achimmertens/wie-man-einen-hive-account-erstellt" target="_blank" rel="noopener noreferrer" className="text-hive hover:underline"> beschrieben</a>. </p>
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
