import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/hooks/useActivityLog";
import { CheckCircle, Info, AlertTriangle, CircleAlert } from "lucide-react";

interface ActivityLogPanelProps {
  logs: LogEntry[];
  supabaseOk: boolean | null;
  aiStatus: { ok: boolean | null; model: string };
}

const levelIcon: Record<string, React.ReactNode> = {
  info: <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />,
  success: <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
  error: <CircleAlert className="w-3.5 h-3.5 text-destructive shrink-0" />,
};

const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ logs, supabaseOk, aiStatus }) => {
  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col h-full max-h-[80vh]">
      {/* Header with status indicators */}
      <div className="flex flex-col gap-1.5 px-4 py-3 border-b bg-muted/40 rounded-t-lg">
        <span className="font-semibold text-sm">Aktivitätslog</span>
        <div className="flex items-center gap-1.5 text-xs">
          {supabaseOk === null ? (
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse" />
          ) : supabaseOk ? (
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
          )}
          <span className="text-muted-foreground">
            Supabase {supabaseOk === null ? "prüfe…" : supabaseOk ? "verbunden" : "nicht erreichbar"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {aiStatus.ok === null ? (
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse" />
          ) : aiStatus.ok ? (
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
          )}
          <span className="text-muted-foreground">
            KI {aiStatus.model || "…"} {aiStatus.ok === null ? "prüfe…" : aiStatus.ok ? "verfügbar" : "nicht verfügbar"}
          </span>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-2 space-y-1.5">
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">Noch keine Aktivitäten.</p>
          )}
          {logs.map(entry => (
            <div key={entry.id} className="flex items-start gap-1.5 text-xs leading-snug">
              {levelIcon[entry.level] || levelIcon.info}
              <span className="text-muted-foreground whitespace-nowrap">
                {entry.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className={
                entry.level === "error" ? "text-destructive" :
                entry.level === "warn" ? "text-yellow-600" :
                entry.level === "success" ? "text-green-700" :
                "text-foreground"
              }>
                {entry.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ActivityLogPanel;
