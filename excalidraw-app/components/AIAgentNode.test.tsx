import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AIAgentNode from "./AIAgentNode";

// Mock fetch globally
global.fetch = vi.fn();

describe("AIAgentNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
    
    // Default mock for port and status endpoints
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        return {
          ok: true,
          json: async () => ({ status: "terminated" }),
        };
      }
      return { ok: false };
    });
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it("should render agent name after loading", async () => {
    const element = {
      customData: {
        agentId: "test-123",
        name: "Test Agent",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Agent/)).toBeDefined();
    });
  });

  it("should display terminated status by default", async () => {
    const element = {
      customData: {
        agentId: "test-123",
        name: "Test Agent",
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
        agentId: "test-456",
        name: "Running Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        return {
          ok: true,
          json: async () => ({ status: "running", sessionName: "excalidraw-test" }),
        };
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🟢/)).toBeDefined();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/agents/test-456/status");
    expect(global.fetch).toHaveBeenCalledWith("/api/agents/test-456/port");
  });

  it("should poll status every 3 seconds", async () => {
    const element = {
      customData: {
        agentId: "test-789",
        name: "Polling Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        return {
          ok: true,
          json: async () => ({
            status: "running",
            sessionName: "excalidraw-poll",
          }),
        };
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      const statusCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
        call[0].includes("/status")
      );
      expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      const statusCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
        call[0].includes("/status")
      );
      expect(statusCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should handle status fetch errors gracefully", async () => {
    const element = {
      customData: {
        agentId: "test-error",
        name: "Error Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        throw new Error("Network error");
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    // Should still render loading state without crashing
    await waitFor(() => {
      expect(screen.getByText(/Error Agent/)).toBeDefined();
    });
  });

  it("should show invalid agent message if agentId is missing", () => {
    const element = {
      customData: {
        name: "No ID Agent",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    expect(screen.getByText(/Invalid Agent/)).toBeDefined();
  });

  it("should show loading state before port is fetched", () => {
    const element = {
      customData: {
        agentId: "test-loading",
        name: "Loading Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<AIAgentNode element={element} />);

    expect(screen.getByText(/Loading terminal/)).toBeDefined();
  });

  it("should use default name if not provided", async () => {
    const element = {
      customData: {
        agentId: "test-default",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/Agent/)).toBeDefined();
    });
  });

  it("should cleanup interval on unmount", async () => {
    const element = {
      customData: {
        agentId: "test-cleanup",
        name: "Cleanup Agent",
        nodeType: "ai-agent",
      },
    };

    const { unmount } = render(<AIAgentNode element={element} />);

    await waitFor(() => {
      const statusCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
        call[0].includes("/status")
      );
      expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    });

    const callCountBeforeUnmount = (global.fetch as any).mock.calls.length;

    unmount();

    vi.advanceTimersByTime(3000);

    // Should not call fetch after unmount
    expect((global.fetch as any).mock.calls.length).toBe(callCountBeforeUnmount);
  });

  it("should update status from running to terminated", async () => {
    const element = {
      customData: {
        agentId: "test-status-change",
        name: "Status Change Agent",
        nodeType: "ai-agent",
      },
    };

    let callCount = 0;
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            status: callCount === 1 ? "running" : "terminated",
          }),
        };
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      expect(screen.getByText(/🟢/)).toBeDefined();
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.getByText(/🔴/)).toBeDefined();
    });
  });

  it("should handle non-ok response from status API", async () => {
    const element = {
      customData: {
        agentId: "test-not-ok",
        name: "Not OK Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        return {
          ok: true,
          json: async () => ({ port: 7681 }),
        };
      }
      if (url.includes("/status")) {
        return { ok: false };
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    // Should not throw and should maintain default state
    await waitFor(() => {
      expect(screen.getByText(/🔴/)).toBeDefined();
    });
  });

  it("should render iframe with correct ttyd port", async () => {
    const element = {
      customData: {
        agentId: "test-iframe",
        name: "Iframe Test",
        nodeType: "ai-agent",
      },
    };

    render(<AIAgentNode element={element} />);

    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeDefined();
      expect(iframe?.src).toContain('localhost:7681');
    });
  });

  it("should handle port fetch errors", async () => {
    const element = {
      customData: {
        agentId: "test-port-error",
        name: "Port Error Agent",
        nodeType: "ai-agent",
      },
    };

    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/port")) {
        throw new Error("Failed to get port");
      }
      if (url.includes("/status")) {
        return {
          ok: true,
          json: async () => ({ status: "terminated" }),
        };
      }
      return { ok: false };
    });

    render(<AIAgentNode element={element} />);

    // Should show loading state indefinitely
    await waitFor(() => {
      expect(screen.getByText(/Loading terminal/)).toBeDefined();
    });
  });
});
