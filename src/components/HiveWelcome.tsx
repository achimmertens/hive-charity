
import React, { useEffect } from 'react';
import { HiveUser } from "@/services/hiveAuth";
import NewPostsScanner from './NewPostsScanner';
import ActivityLogPanel from './ActivityLogPanel';
import { useActivityLog } from '@/hooks/useActivityLog';
import { supabase } from '@/integrations/supabase/client';

interface HiveWelcomeProps {
  user: HiveUser;
}

const HiveWelcome: React.FC<HiveWelcomeProps> = ({ user }) => {
  const { logs, addLog, supabaseOk, setSupabaseStatus } = useActivityLog();

  // Check Supabase connectivity on mount
  useEffect(() => {
    const checkSupabase = async () => {
      addLog("info", "Prüfe Supabase-Verbindung…");
      try {
        const { error } = await supabase
          .from('charity_analysis_results')
          .select('id')
          .limit(1);
        if (error) {
          setSupabaseStatus(false);
          addLog("error", `Supabase nicht erreichbar: ${error.message}`);
        } else {
          setSupabaseStatus(true);
          addLog("success", "Supabase-Verbindung erfolgreich.");
        }
      } catch (e) {
        setSupabaseStatus(false);
        addLog("error", `Supabase-Verbindungsfehler: ${e}`);
      }
    };
    checkSupabase();
  }, [addLog, setSupabaseStatus]);

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold text-hive mb-4">
          Hive Charity Explorer
        </h1>
        <h2 className="text-xl text-muted-foreground">
          Finde charitative Beiträge und belohne sie durch Upvotes und Aufmerksamkeit
        </h2>
      </div>

      <div className="max-w-7xl mx-auto flex gap-4">
        {/* Main content – posts */}
        <div className="flex-1 min-w-0">
          <NewPostsScanner user={user} addLog={addLog} setSupabaseStatus={setSupabaseStatus} />
        </div>

        {/* Right sidebar – activity log */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-4">
            <ActivityLogPanel logs={logs} supabaseOk={supabaseOk} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiveWelcome;
