import { execSync, spawn } from "child_process";

import type { Plugin } from "vite";

const sessionExists = (uuid: string): boolean => {
  try {
    const output = execSync(
      'tmux list-sessions -F "#{session_name}" 2>/dev/null',
      { encoding: "utf8" },
    );
    return output.split("\n").includes(uuid);
  } catch {
    return false;
  }
};

const sessionWindowName = (uuid: string): string => {
  try {
    return execSync(`tmux display-message -p -t ${uuid} '#{pane_title}' 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
};

const startSession = (
  uuid: string,
  workingDir: string,
  worktree: boolean = false,
  dangerouslySkipPermissions: boolean = false,
) => {
  try {
    const args = [
      "new-session",
      "-d",
      "-A",
      "-s",
      uuid,
      "-c",
      workingDir,
      "claude",
      `--session-id=${uuid}`,
    ];

    if (worktree) {
      args.push("--worktree");
    }

    if (dangerouslySkipPermissions) {
      args.push("--dangerously-skip-permissions");
    }

    spawn("tmux", args, { detached: true, stdio: "ignore" });
  } catch (e) {
    console.error("Failed to start tmux session:", (e as any).message);
  }
};

const terminateSession = (uuid: string): boolean => {
  try {
    execSync(`tmux kill-session -t ${uuid}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const launchTerminal = (uuid: string): boolean => {
  try {
    // Always use --resume since the session was already created via POST
    // The tmux command handles both cases:
    // - If tmux session exists: just attach
    // - If tmux session doesn't exist: create it with claude --resume
    const terminal = process.env.TERMINAL || "kitty";

    const proc = spawn(terminal, ["tmux", "attach-session", "-t", uuid], {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });

    proc.on("error", (err) => {
      console.error(`[launchTerminal] Spawn error:`, err);
    });

    proc.unref();
    return true;
  } catch (e) {
    console.error(
      "[launchTerminal] Failed to launch terminal:",
      (e as any).message,
    );
    return false;
  }
};

export const agentApiPlugin = (): Plugin => {
  return {
    name: "agent-api",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        const pathWithoutBase = req.url || "";

        // GET /api/claude/{uuid}
        const getMatch = pathWithoutBase.match(/^\/claude\/([a-f0-9-]+)$/);
        if (getMatch && req.method === "GET") {
          const uuid = getMatch[1];
          const running = sessionExists(uuid);
          const name = running ? sessionWindowName(uuid) : "";

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ status: running ? "running" : "terminated", name }),
          );
          return;
        }

        // POST /api/claude/{uuid}
        const postMatch = pathWithoutBase.match(/^\/claude\/([a-f0-9-]+)$/);
        if (postMatch && req.method === "POST") {
          const uuid = postMatch[1];
          let body = "";

          req.on("data", (chunk) => {
            body += chunk.toString();
          });

          req.on("end", () => {
            try {
              const {
                workingDir = process.env.HOME || "/home",
                worktree = false,
                dangerouslySkipPermissions = false,
              } = JSON.parse(body);

              startSession(uuid, workingDir, worktree, dangerouslySkipPermissions);

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  id: uuid,
                  createdAt: new Date().toISOString(),
                }),
              );
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
          });
          return;
        }

        // DELETE /api/claude/{uuid}
        const deleteMatch = pathWithoutBase.match(/^\/claude\/([a-f0-9-]+)$/);
        if (deleteMatch && req.method === "DELETE") {
          const uuid = deleteMatch[1];
          const success = terminateSession(uuid);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: success ? "ok" : "error",
              message: success
                ? "Session terminated"
                : "Failed to terminate session",
            }),
          );
          return;
        }

        // GET /api/claude/{uuid}/launch
        const launchMatch = pathWithoutBase.match(
          /^\/claude\/([a-f0-9-]+)\/launch$/,
        );
        if (launchMatch && req.method === "GET") {
          const uuid = launchMatch[1];
          const success = launchTerminal(uuid);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: success,
              message: success
                ? "Opening terminal..."
                : "Failed to launch terminal",
            }),
          );
          return;
        }

        next();
      });
    },
  };
};
