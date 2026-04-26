import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

import AIAgentNode from "./AIAgentNode";

// Mock fetch globally
global.fetch = vi.fn();

describe("AIAgentNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();

    // Default mock for status endpoint
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "terminated" }),
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it("should render agent name and details", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Test Agent",
        workingDir: "/home/user/project",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeDefined();
      expect(screen.getByText("/home/user/project")).toBeDefined();
      expect(
        screen.getByText(/0ce062db-8ef0-4d98-930d-04389b6c81fa/),
      ).toBeDefined();
    });
  });

  it("should display terminated status by default", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Test Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🔴/)).toBeDefined();
    });
  });

  it("should fetch and display running status", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Running Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "running" }),
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🟢/)).toBeDefined();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/claude/0ce062db-8ef0-4d98-930d-04389b6c81fa",
    );
  });

  it("should poll status every 3 seconds", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Polling Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "running" }),
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it("should show terminate button when running", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Running Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "running" }),
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      const terminateButton = screen.getByTitle("Terminate session");
      expect(terminateButton).toBeDefined();
    });
  });

  it("should not show terminate button when terminated", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Terminated Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🔴/)).toBeDefined();
    });

    const terminateButton = screen.queryByTitle("Terminate session");
    expect(terminateButton).toBeNull();
  });

  it("should terminate session when terminate button clicked", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Running Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    let callCount = 0;
    (global.fetch as any).mockImplementation(
      async (url: string, options?: any) => {
        if (options?.method === "DELETE") {
          return {
            ok: true,
            json: async () => ({ status: "ok", message: "Session terminated" }),
          };
        }
        // First call returns running, subsequent calls return terminated
        callCount++;
        return {
          ok: true,
          json: async () => ({
            status: callCount === 1 ? "running" : "terminated",
          }),
        };
      },
    );

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🟢/)).toBeDefined();
    });

    const terminateButton = screen.getByTitle("Terminate session");
    fireEvent.click(terminateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/claude/0ce062db-8ef0-4d98-930d-04389b6c81fa",
        { method: "DELETE" },
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/🔴/)).toBeDefined();
    });
  });

  it("should launch kitty terminal when button clicked", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Test Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/launch")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            message: "Opening kitty terminal...",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ status: "terminated" }),
      };
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeDefined();
    });

    const launchButton = screen.getByText("Open");
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/claude/0ce062db-8ef0-4d98-930d-04389b6c81fa/launch",
      );
    });
  });

  it("should show invalid agent if agentId missing", () => {
    const element = {
      customData: {
        name: "No ID Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    expect(screen.getByText("Invalid Agent")).toBeDefined();
  });

  it("should cleanup interval on unmount", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Cleanup Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    const { unmount } = render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const callCountBeforeUnmount = (global.fetch as any).mock.calls.length;

    unmount();

    vi.advanceTimersByTime(3000);

    // Should not call fetch after unmount
    expect((global.fetch as any).mock.calls.length).toBe(
      callCountBeforeUnmount,
    );
  });

  it("should handle status fetch errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Error Agent",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText("Error Agent")).toBeDefined();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should use default name if not provided", async () => {
    const element = {
      customData: {
        agentId: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        workingDir: "/home/user",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText("Agent")).toBeDefined();
    });
  });
});
