import { execSync, spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import type { Plugin } from "vite";

const REGISTRY_FILE = path.join(
  process.env.HOME || "/home",
  ".claude",
  "excalidraw-agents.json",
);

const getRegistry = () => {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Failed to read registry:", (e as any).message);
  }
  return {};
};

const saveRegistry = (registry: Record<string, any>) => {
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
};

const sessionExists = (sessionName: string): boolean => {
  try {
    const output = execSync(
      'tmux list-sessions -F "#{session_name}" 2>/dev/null',
      {
        encoding: "utf8",
      },
    );
    return output.split("\n").includes(sessionName);
  } catch {
    return false;
  }
};

const openKitty = (sessionName: string) => {
  try {
    const proc = spawn("kitty", ["tmux", "attach-session", "-t", sessionName], {
      detached: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    proc.on("error", (err) => {
      console.error(`Failed to spawn kitty: ${err.message}`);
    });
    return true;
  } catch (e) {
    console.error("Failed to open kitty:", (e as any).message);
    return false;
  }
};

// In-memory map of agentId -> { port, proc }
const ttydProcesses = new Map<string, { port: number; proc: any }>();
let nextTtydPort = 7681;

const findPortForSession = (sessionName: string): number | null => {
  try {
    // Check if ttyd is already running for this session
    const result = execSync(`ps aux | grep "ttyd.*${sessionName}" | grep -v grep`, {
      encoding: "utf8",
    });
    
    if (result) {
      // Extract port from the command line
      const match = result.match(/-p\s+(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  } catch {
    // No existing process found
  }
  return null;
};

const ensureTtyd = (agent: any): number => {
  const existing = ttydProcesses.get(agent.id);
  if (existing) {
    return existing.port;
  }

  // Check if ttyd is already running for this session
  const existingPort = findPortForSession(agent.sessionName);
  if (existingPort) {
    ttydProcesses.set(agent.id, { port: existingPort, proc: null });
    return existingPort;
  }

  const port = nextTtydPort++;
  // -A: attach if session exists, create new otherwise
  // Start Claude Code in the tmux session
  const proc = spawn(
    "ttyd",
    [
      "-p",
      String(port),
      "tmux",
      "new-session",
      "-A",
      "-s",
      agent.sessionName,
      "-c",
      agent.workingDir,
      "claude",
    ],
    { detached: true, stdio: "ignore" },
  );
  proc.unref();
  proc.on("error", (err: Error) => {
    console.error(`ttyd failed for agent ${agent.id}: ${err.message}`);
    ttydProcesses.delete(agent.id);
  });
  ttydProcesses.set(agent.id, { port, proc });
  // eslint-disable-next-line no-console
  console.log(`ttyd started for agent ${agent.id} on port ${port}`);
  return port;
};

export const agentApiPlugin = (): Plugin => {
  return {
    name: "agent-api",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        const pathWithoutBase = req.url || "";

        if (pathWithoutBase === "/health") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "ok" }));
          return;
        }

        if (pathWithoutBase === "/config" && req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ homeDir: process.env.HOME || "/home" }));
          return;
        }

        if (pathWithoutBase === "/agents" && req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(getRegistry()));
          return;
        }

        if (pathWithoutBase === "/agents" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { name, workingDir = process.env.HOME || "/home" } =
                JSON.parse(body);
              if (!name) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "name is required" }));
                return;
              }

              const registry = getRegistry();
              const id = randomUUID();
              const sessionName = `excalidraw-${id.substring(0, 8)}`;

              registry[id] = {
                id,
                name,
                sessionName,
                workingDir,
                createdAt: new Date().toISOString(),
              };

              saveRegistry(registry);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(registry[id]));
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
          });
          return;
        }

        const agentIdMatch = pathWithoutBase.match(/^\/agents\/([a-f0-9-]+)\/(.+)$/);
        if (agentIdMatch) {
          const [, id, action] = agentIdMatch;

          if (action === "view" && req.method === "GET") {
            const registry = getRegistry();
            const agent = registry[id];

            if (!agent) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "text/html");
              res.end("<h1>Agent not found</h1>");
              return;
            }

            const port = ensureTtyd(agent);

            res.setHeader("Content-Type", "text/html");
            res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${agent.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; flex-direction: column; height: 100vh; }
    iframe { flex: 1; border: none; width: 100%; }
  </style>
</head>
<body>
  <iframe src="http://localhost:${port}" allow="clipboard-read; clipboard-write"></iframe>
</body>
</html>`);
            return;
          }

          if (action === "status" && req.method === "GET") {
            const registry = getRegistry();
            const agent = registry[id];

            if (!agent) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Agent not found" }));
              return;
            }

            const running = sessionExists(agent.sessionName);
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                status: running ? "running" : "terminated",
                sessionName: agent.sessionName,
              }),
            );
            return;
          }

          if (action === "port" && req.method === "GET") {
            const registry = getRegistry();
            const agent = registry[id];

            if (!agent) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Agent not found" }));
              return;
            }

            const port = ensureTtyd(agent);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ port }));
            return;
          }

          if (action === "open" && req.method === "POST") {
            const registry = getRegistry();
            const agent = registry[id];

            if (!agent) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Agent not found" }));
              return;
            }

            setTimeout(() => {
              const opened = openKitty(agent.sessionName);
              // eslint-disable-next-line no-console
              console.log(`Kitty open result: ${opened}`);
            }, 100);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                message: "Opening kitty terminal...",
              }),
            );
            return;
          }
        }

        next();
      });
    },
  };
};
