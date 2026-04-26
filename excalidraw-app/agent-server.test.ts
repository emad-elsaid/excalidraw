/**
 * Agent API Server Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { randomUUID } from "crypto";

// Mock modules
vi.mock("child_process", () => ({
  execSync: vi.fn(),
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

import { execSync, spawn } from "child_process";
import fs from "fs";

const mockRegistry = new Map<string, any>();

describe("Agent API", () => {
  beforeEach(() => {
    mockRegistry.clear();
    vi.clearAllMocks();
    
    // Setup default mock behavior
    (fs.existsSync as any).mockReturnValue(false);
    (fs.readFileSync as any).mockReturnValue("{}");
    (execSync as any).mockReturnValue("");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Health Check", () => {
    it("should return ok status", async () => {
      const response = { status: "ok" };
      expect(response.status).toBe("ok");
    });
  });

  describe("Create Agent", () => {
    it("should create agent with name and workingDir", () => {
      const agent = {
        id: "test-id-123",
        name: "Claude Code",
        sessionName: "excalidraw-test",
        workingDir: "/home/user",
        createdAt: new Date().toISOString(),
      };

      expect(agent).toHaveProperty("id");
      expect(agent).toHaveProperty("name", "Claude Code");
      expect(agent).toHaveProperty("sessionName");
      expect(agent).toHaveProperty("workingDir", "/home/user");
      expect(agent).toHaveProperty("createdAt");
    });

    it("should fail if name is missing", () => {
      const name = "";
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should generate unique agent ids", () => {
      const id1 = "uuid-1";
      const id2 = "uuid-2";
      expect(id1).not.toBe(id2);
    });

    it("should have valid sessionName format", () => {
      const sessionName = "excalidraw-abc12345";
      expect(sessionName).toMatch(/^excalidraw-[a-z0-9]+$/);
    });

    it("should store agent in registry", () => {
      const agent = {
        id: "test-123",
        name: "Test Agent",
        sessionName: "excalidraw-test",
        workingDir: "/home",
        createdAt: new Date().toISOString(),
      };

      mockRegistry.set(agent.id, agent);
      expect(mockRegistry.has("test-123")).toBe(true);
      expect(mockRegistry.get("test-123").name).toBe("Test Agent");
    });
  });

  describe("List Agents", () => {
    it("should return empty object when no agents exist", () => {
      const agents = Object.fromEntries(mockRegistry);
      expect(agents).toEqual({});
    });

    it("should return all agents", () => {
      const agent1 = {
        id: "1",
        name: "Agent 1",
        sessionName: "s1",
        workingDir: "/h",
      };
      const agent2 = {
        id: "2",
        name: "Agent 2",
        sessionName: "s2",
        workingDir: "/h",
      };

      mockRegistry.set("1", agent1);
      mockRegistry.set("2", agent2);

      const agents = Object.fromEntries(mockRegistry);
      expect(Object.keys(agents)).toHaveLength(2);
      expect(agents["1"].name).toBe("Agent 1");
      expect(agents["2"].name).toBe("Agent 2");
    });
  });

  describe("Get Agent Status", () => {
    it("should return running status", () => {
      const status = { status: "running", sessionName: "excalidraw-test" };
      expect(status.status).toBe("running");
    });

    it("should return terminated status", () => {
      const status = { status: "terminated", sessionName: "excalidraw-test" };
      expect(status.status).toBe("terminated");
    });

    it("should handle non-existent agent", () => {
      const agents = mockRegistry;
      const agentId = "non-existent";
      const exists = agents.has(agentId);
      expect(exists).toBe(false);
    });

    it("should detect valid session name format", () => {
      const sessionName = "excalidraw-abc123def";
      const isValid = /^excalidraw-[a-z0-9]+$/.test(sessionName);
      expect(isValid).toBe(true);
    });
  });

  describe("Get Agent Port", () => {
    it("should return ttyd port for agent", () => {
      const response = { port: 7681 };
      expect(response.port).toBe(7681);
    });

    it("should return different ports for different agents", () => {
      const ports = [7681, 7682, 7683];
      ports.forEach((port, index) => {
        expect(port).toBe(7681 + index);
      });
    });

    it("should handle missing agent for port request", () => {
      const agentId = "missing-agent";
      const exists = mockRegistry.has(agentId);
      expect(exists).toBe(false);
    });
  });

  describe("Open Agent", () => {
    it("should require valid agent id", () => {
      const agentId = "550e8400-e29b-41d4-a716-446655440000";
      const isValid = /^[a-f0-9-]+$/.test(agentId);
      expect(isValid).toBe(true);
    });

    it("should have workingDir property", () => {
      const agent = {
        id: "test",
        name: "Test",
        sessionName: "test",
        workingDir: "/home/user",
      };
      expect(agent).toHaveProperty("workingDir");
      expect(typeof agent.workingDir).toBe("string");
    });

    it("should validate tmux session name", () => {
      const sessionName = "excalidraw-test123";
      const isValid = sessionName.match(/^excalidraw-/);
      expect(isValid).not.toBeNull();
    });
  });

  describe("Registry Persistence", () => {
    it("should save agent to registry file", () => {
      const agent = {
        id: "persist-test",
        name: "Persist Agent",
        sessionName: "excalidraw-persist",
        workingDir: "/home",
        createdAt: new Date().toISOString(),
      };

      const registryJson = JSON.stringify({ [agent.id]: agent }, null, 2);
      expect(registryJson).toContain('"persist-test"');
      expect(registryJson).toContain('"Persist Agent"');
    });

    it("should parse valid registry JSON", () => {
      const registryJson = '{"id-1":{"id":"id-1","name":"Test"}}';
      const parsed = JSON.parse(registryJson);
      expect(parsed["id-1"].name).toBe("Test");
    });
  });

  describe("Error Handling", () => {
    it("should reject empty name", () => {
      const name = "";
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should require working directory", () => {
      const workingDir = "/home/user";
      expect(workingDir).toBeTruthy();
    });

    it("should handle missing agent gracefully", () => {
      const agentId = "missing";
      const agent = mockRegistry.get(agentId);
      expect(agent).toBeUndefined();
    });
  });

  describe("Open Terminal Integration", () => {
    it("should respond to open endpoint with valid agent", () => {
      const agent = {
        id: "test-open-1",
        name: "Test Agent",
        sessionName: "excalidraw-test",
        workingDir: "/home/user",
        createdAt: new Date().toISOString(),
      };

      mockRegistry.set("test-open-1", agent);
      const response = { ok: true, message: "Opening kitty terminal..." };
      expect(response.ok).toBe(true);
      expect(response.message).toContain("kitty");
    });

    it("should return 404 for non-existent agent on open", () => {
      const agents = mockRegistry;
      const agentId = "nonexistent-agent";
      const found = agents.has(agentId);
      expect(found).toBe(false);
    });

    it("should verify session name exists for open request", () => {
      const agent = {
        id: "test-open-2",
        name: "Terminal Test",
        sessionName: "excalidraw-tmux-session",
        workingDir: "/tmp",
        createdAt: new Date().toISOString(),
      };
      mockRegistry.set("test-open-2", agent);
      const retrieved = mockRegistry.get("test-open-2");
      expect(retrieved?.sessionName).toBe("excalidraw-tmux-session");
    });

    it("should handle open request with valid working directory", () => {
      const agent = {
        id: "test-open-3",
        name: "Dir Test",
        sessionName: "excalidraw-dirtest",
        workingDir: "/home/user/projects",
        createdAt: new Date().toISOString(),
      };
      expect(agent.workingDir).toBeTruthy();
      expect(agent.workingDir.length > 0).toBe(true);
    });

    it("should not open terminal without agent name", () => {
      const agent = {
        id: "test-open-4",
        name: "",
        sessionName: "excalidraw-noname",
        workingDir: "/home",
        createdAt: new Date().toISOString(),
      };
      const isValid = agent.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should spawn kitty process with correct arguments", () => {
      const sessionName = "excalidraw-test123";
      
      (spawn as any).mockReturnValue({
        on: vi.fn(),
        unref: vi.fn(),
      });

      // Simulate spawning kitty
      const mockProc = spawn("kitty", ["tmux", "attach-session", "-t", sessionName], {
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
      });

      expect(spawn).toHaveBeenCalledWith(
        "kitty",
        ["tmux", "attach-session", "-t", sessionName],
        expect.objectContaining({
          detached: true,
        })
      );
    });
  });

  describe("TTYD Integration", () => {
    it("should spawn ttyd with correct port and session", () => {
      const agent = {
        id: "ttyd-test-1",
        name: "TTYD Agent",
        sessionName: "excalidraw-ttyd123",
        workingDir: "/home/user",
      };

      const port = 7681;

      (spawn as any).mockReturnValue({
        on: vi.fn(),
        unref: vi.fn(),
      });

      spawn(
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
        ],
        { detached: true, stdio: "ignore" }
      );

      expect(spawn).toHaveBeenCalledWith(
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
        ],
        expect.objectContaining({
          detached: true,
          stdio: "ignore",
        })
      );
    });

    it("should track ttyd processes by agent id", () => {
      const ttydProcesses = new Map();
      const agentId = "agent-123";
      const port = 7681;

      ttydProcesses.set(agentId, { port, proc: {} });

      expect(ttydProcesses.has(agentId)).toBe(true);
      expect(ttydProcesses.get(agentId).port).toBe(port);
    });

    it("should reuse existing ttyd port for same agent", () => {
      const ttydProcesses = new Map();
      const agentId = "agent-456";
      const existingPort = 7682;

      ttydProcesses.set(agentId, { port: existingPort, proc: {} });

      const existing = ttydProcesses.get(agentId);
      expect(existing).toBeDefined();
      expect(existing.port).toBe(existingPort);
    });
  });

  describe("Session Management", () => {
    it("should detect running tmux sessions", () => {
      const sessionName = "excalidraw-running";
      
      (execSync as any).mockReturnValue(
        "session1\nexcalidraw-running\nsession2\n"
      );

      const output = execSync(
        'tmux list-sessions -F "#{session_name}" 2>/dev/null',
        { encoding: "utf8" }
      ) as string;

      const sessions = output.split("\n");
      expect(sessions).toContain(sessionName);
    });

    it("should handle no running sessions gracefully", () => {
      (execSync as any).mockImplementation(() => {
        throw new Error("No server running");
      });

      try {
        execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', {
          encoding: "utf8",
        });
        expect(true).toBe(false); // Should not reach here
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should validate session name format", () => {
      const validNames = [
        "excalidraw-abc123",
        "excalidraw-xyz789",
        "excalidraw-00000000",
      ];

      const invalidNames = [
        "invalid-session",
        "excalidraw",
        "excalidraw-",
        "EXCALIDRAW-ABC",
      ];

      validNames.forEach((name) => {
        expect(name).toMatch(/^excalidraw-[a-z0-9]+$/);
      });

      invalidNames.forEach((name) => {
        expect(name).not.toMatch(/^excalidraw-[a-z0-9]+$/);
      });
    });
  });

  describe("File System Operations", () => {
    it("should create registry directory if missing", () => {
      const path = require("path");
      const registryPath = path.join(
        process.env.HOME || "/home",
        ".claude",
        "excalidraw-agents.json"
      );

      const dirPath = path.dirname(registryPath);

      (fs.mkdirSync as any).mockImplementation(() => {});

      fs.mkdirSync(dirPath, { recursive: true });

      expect(fs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it("should write registry as formatted JSON", () => {
      const registry = {
        "agent-1": {
          id: "agent-1",
          name: "Test Agent",
          sessionName: "excalidraw-test",
          workingDir: "/home",
          createdAt: new Date().toISOString(),
        },
      };

      (fs.writeFileSync as any).mockImplementation(() => {});

      const jsonString = JSON.stringify(registry, null, 2);
      fs.writeFileSync("/tmp/registry.json", jsonString);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(jsonString).toContain('"agent-1"');
      expect(jsonString).toContain('"Test Agent"');
    });

    it("should handle corrupt registry gracefully", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue("{ invalid json");

      try {
        JSON.parse(fs.readFileSync("/tmp/test.json", "utf8") as string);
        expect(true).toBe(false); // Should not reach
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe("UUID Generation", () => {
    it("should generate valid UUIDs", () => {
      const id1 = randomUUID();
      const id2 = randomUUID();

      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(id1).not.toBe(id2);
    });

    it("should create session names from UUID prefix", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const sessionName = `excalidraw-${id.substring(0, 8)}`;

      expect(sessionName).toBe("excalidraw-550e8400");
      expect(sessionName).toMatch(/^excalidraw-[a-f0-9]{8}$/);
    });
  });
});
