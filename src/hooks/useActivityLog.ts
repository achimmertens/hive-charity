import { useState, useCallback } from "react";

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

let globalId = 0;

export function useActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);

  const addLog = useCallback((level: LogLevel, message: string) => {
    const entry: LogEntry = { id: ++globalId, timestamp: new Date(), level, message };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  }, []);

  const setSupabaseStatus = useCallback((ok: boolean) => {
    setSupabaseOk(ok);
  }, []);

  return { logs, addLog, supabaseOk, setSupabaseStatus };
}
