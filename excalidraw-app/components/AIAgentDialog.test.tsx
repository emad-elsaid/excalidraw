import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

import AIAgentDialog from "./AIAgentDialog";

// Mock fetch globally
global.fetch = vi.fn();

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => "0ce062db-8ef0-4d98-930d-04389b6c81fa");
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

describe("AIAgentDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should render dialog with default values", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    expect(screen.getByText("Create AI Agent Node")).toBeDefined();
    expect(screen.getByLabelText("Agent Name")).toBeDefined();
    expect(screen.getByLabelText("Working Directory")).toBeDefined();
    expect(
      screen.getByText("Use worktree (isolate session in git worktree)"),
    ).toBeDefined();
    expect(screen.getByText("Create Node")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("should update agent name on input change", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "My Custom Agent" } });

    expect(nameInput.value).toBe("My Custom Agent");
  });

  it("should update working directory on input change", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const dirInput = screen.getByLabelText(
      "Working Directory",
    ) as HTMLInputElement;
    fireEvent.change(dirInput, { target: { value: "/custom/path" } });

    expect(dirInput.value).toBe("/custom/path");
  });

  it("should toggle worktree checkbox", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("should show error when name is empty", async () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Agent name is required")).toBeDefined();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should show error when working directory is empty", async () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const dirInput = screen.getByLabelText(
      "Working Directory",
    ) as HTMLInputElement;
    fireEvent.change(dirInput, { target: { value: "" } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Working directory is required")).toBeDefined();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should call onCancel when cancel button is clicked", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should create agent and call onConfirm on success", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        createdAt: new Date().toISOString(),
      }),
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    const dirInput = screen.getByLabelText(
      "Working Directory",
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Test Agent" } });
    fireEvent.change(dirInput, { target: { value: "/home/user" } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Test Agent",
        workingDir: "/home/user",
        worktree: false,
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/claude/0ce062db-8ef0-4d98-930d-04389b6c81fa",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingDir: "/home/user", worktree: false }),
      }),
    );
  });

  it("should generate UUID using crypto.randomUUID", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        createdAt: new Date().toISOString(),
      }),
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockRandomUUID).toHaveBeenCalled();
    });
  });

  it("should create agent with worktree enabled", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        createdAt: new Date().toISOString(),
      }),
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    const dirInput = screen.getByLabelText(
      "Working Directory",
    ) as HTMLInputElement;
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Worktree Agent" } });
    fireEvent.change(dirInput, { target: { value: "/home/user/project" } });
    fireEvent.click(checkbox);

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        id: "0ce062db-8ef0-4d98-930d-04389b6c81fa",
        name: "Worktree Agent",
        workingDir: "/home/user/project",
        worktree: true,
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/claude/0ce062db-8ef0-4d98-930d-04389b6c81fa",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDir: "/home/user/project",
          worktree: true,
        }),
      }),
    );
  });

  it("should show error when API request fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create agent")).toBeDefined();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should show error when network error occurs", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeDefined();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should disable buttons while loading", async () => {
    (global.fetch as any).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ id: "test" }) }),
            100,
          ),
        ),
    );

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const createButton = screen.getByText("Create Node") as HTMLButtonElement;
    const cancelButton = screen.getByText("Cancel") as HTMLButtonElement;

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeDefined();
    });

    expect(createButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
  });

  it("should display correct placeholder text", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByPlaceholderText(
      "e.g., Claude Code",
    ) as HTMLInputElement;
    const dirInput = screen.getByPlaceholderText(
      "/path/to/project",
    ) as HTMLInputElement;

    expect(nameInput).toBeDefined();
    expect(dirInput).toBeDefined();
  });

  it("should have proper ARIA labels for accessibility", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText("Agent Name")).toBeDefined();
    expect(screen.getByLabelText("Working Directory")).toBeDefined();
  });
});
