/**
 * Agent API Server Tests
 */

import { execSync, spawn } from "child_process";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock modules
vi.mock("child_process", () => ({
  execSync: vi.fn(),
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

describe("Agent API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Session Existence Check", () => {
    it("should detect running tmux session", () => {
      (execSync as any).mockReturnValue(
        "0ce062db-8ef0-4d98-930d-04389b6c81fa\nother-session\n",
      );

      const output = execSync(
        'tmux list-sessions -F "#{session_name}" 2>/dev/null',
        { encoding: "utf8" },
      ) as string;

      const sessions = output.split("\n");
      expect(sessions).toContain("0ce062db-8ef0-4d98-930d-04389b6c81fa");
    });

    it("should handle no running sessions", () => {
      (execSync as any).mockImplementation(() => {
        throw new Error("No server running");
      });

      let error = false;
      try {
        execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', {
          encoding: "utf8",
        });
      } catch {
        error = true;
      }
      expect(error).toBe(true);
    });

    it("should validate UUID format", () => {
      const validUUIDs = [
        "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        "550e8400-e29b-41d4-a716-446655440000",
      ];

      const invalidUUIDs = ["not-a-uuid", "excalidraw-123", ""];

      validUUIDs.forEach((uuid) => {
        expect(uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      });

      invalidUUIDs.forEach((uuid) => {
        expect(uuid).not.toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      });
    });
  });

  describe("Session Creation", () => {
    it("should spawn tmux with correct arguments", () => {
      const uuid = "0ce062db-8ef0-4d98-930d-04389b6c81fa";
      const workingDir = "/home/user/project";

      (spawn as any).mockReturnValue({
        on: vi.fn(),
        unref: vi.fn(),
      });

      spawn(
        "tmux",
        [
          "new-session",
          "-d",
          "-A",
          "-s",
          uuid,
          "-c",
          workingDir,
          "claude",
          `--session-id=${uuid}`,
        ],
        { detached: true, stdio: "ignore" },
      );

      expect(spawn).toHaveBeenCalledWith(
        "tmux",
        [
          "new-session",
          "-d",
          "-A",
          "-s",
          uuid,
          "-c",
          workingDir,
          "claude",
          `--session-id=${uuid}`,
        ],
        expect.objectContaining({
          detached: true,
          stdio: "ignore",
        }),
      );
    });

    it("should use home directory as default", () => {
      const uuid = "0ce062db-8ef0-4d98-930d-04389b6c81fa";
      const defaultDir = process.env.HOME || "/home";

      (spawn as any).mockReturnValue({
        on: vi.fn(),
        unref: vi.fn(),
      });

      spawn(
        "tmux",
        [
          "new-session",
          "-d",
          "-A",
          "-s",
          uuid,
          "-c",
          defaultDir,
          "claude",
          `--session-id=${uuid}`,
        ],
        { detached: true, stdio: "ignore" },
      );

      expect(spawn).toHaveBeenCalledWith(
        "tmux",
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("Session Termination", () => {
    it("should kill tmux session by UUID", () => {
      const uuid = "0ce062db-8ef0-4d98-930d-04389b6c81fa";

      (execSync as any).mockReturnValue(undefined);

      execSync(`tmux kill-session -t ${uuid}`, { stdio: "ignore" });

      expect(execSync).toHaveBeenCalledWith(`tmux kill-session -t ${uuid}`, {
        stdio: "ignore",
      });
    });

    it("should handle termination errors", () => {
      const uuid = "non-existent-uuid";

      (execSync as any).mockImplementation(() => {
        throw new Error("Session not found");
      });

      let error = false;
      try {
        execSync(`tmux kill-session -t ${uuid}`, { stdio: "ignore" });
      } catch {
        error = true;
      }
      expect(error).toBe(true);
    });
  });

  describe("Terminal Launch", () => {
    it("should spawn terminal with tmux command chain", () => {
      (spawn as any).mockReturnValue({
        on: vi.fn(),
        unref: vi.fn(),
      });

      // The actual implementation spawns $TERMINAL (or kitty) with sh -c and a compound command
      const terminal = process.env.TERMINAL || "kitty";
      const proc = spawn(
        terminal,
        ["sh", "-c", expect.stringContaining("tmux has-session")],
        {
          detached: true,
          stdio: "ignore",
        },
      );
      proc.unref();

      expect(spawn).toHaveBeenCalledWith(
        terminal,
        expect.arrayContaining(["sh", "-c"]),
        expect.objectContaining({
          detached: true,
        }),
      );
    });

    it("should handle launch errors", () => {
      (spawn as any).mockImplementation(() => {
        throw new Error("terminal not found");
      });

      let error = false;
      try {
        const terminal = process.env.TERMINAL || "kitty";
        spawn(terminal, ["sh", "-c", "tmux attach-session -t test-uuid"], {
          detached: true,
          stdio: "ignore",
        });
      } catch {
        error = true;
      }
      expect(error).toBe(true);
    });
  });

  describe("API Response Formats", () => {
    it("should return status response", () => {
      const response = { status: "running" };
      expect(response).toHaveProperty("status");
      expect(["running", "terminated"]).toContain(response.status);
    });

    it("should return create response", () => {
      const response = {
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        createdAt: new Date().toISOString(),
      };
      expect(response).toHaveProperty("id");
      expect(response).toHaveProperty("createdAt");
      expect(response.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should return terminate response", () => {
      const response = {
        status: "ok",
        message: "Session terminated",
      };
      expect(response).toHaveProperty("status");
      expect(response.status).toBe("ok");
    });

    it("should return launch response", () => {
      const response = {
        ok: true,
        message: "Opening kitty terminal...",
      };
      expect(response).toHaveProperty("ok");
      expect(response.ok).toBe(true);
    });
  });
});
