import * as fs from "fs";
import * as path from "path";
import { type Request } from "express";
import { type SessionUser } from "@shared/schema";

const LOG_FILE = path.join(process.cwd(), "logs.json");

interface LogEntry {
  timestamp: string;
  user: {
    id: string | "Anonymous";
    role: string | "Anonymous";
    email: string | "Anonymous";
  };
  action: string;
  status: "success" | "failure";
  details?: any;
  error?: string;
}

export function sysLog(req: Request, action: string, status: "success" | "failure", details?: any, error?: string) {
  const user = req.session?.user;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    user: {
      id: user?.id || "Anonymous",
      role: user?.role || "Anonymous",
      email: user?.email || "Anonymous",
    },
    action,
    status,
    details,
    error,
  };

  // Console log for immediate visibility
  console.log(`[SYS_LOG] ${entry.timestamp} | User: ${entry.user.email} | Action: ${entry.action} | Status: ${entry.status}${error ? ` | Error: ${error}` : ""}`);

  // Append to logs.json
  try {
    let logs: LogEntry[] = [];
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, "utf-8");
      if (data) {
        logs = JSON.parse(data);
      }
    }
    logs.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error("Failed to write to system log file:", err);
  }
}
