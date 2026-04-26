import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AIAgentDialog from "./AIAgentDialog";

// Mock fetch globally
global.fetch = vi.fn();

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
      "Working Directory"
    ) as HTMLInputElement;
    fireEvent.change(dirInput, { target: { value: "/custom/path" } });

    expect(dirInput.value).toBe("/custom/path");
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
      "Working Directory"
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
    const mockAgent = {
      id: "test-123",
      name: "Test Agent",
      sessionName: "excalidraw-test",
      workingDir: "/home/user",
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAgent,
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    const dirInput = screen.getByLabelText(
      "Working Directory"
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Test Agent" } });
    fireEvent.change(dirInput, { target: { value: "/home/user" } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith(mockAgent);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/agents",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Agent",
          workingDir: "/home/user",
        }),
      })
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
    (global.fetch as any).mockRejectedValueOnce(
      new Error("Network error")
    );

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
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)
        )
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

  it("should trim whitespace from inputs", async () => {
    const mockAgent = {
      id: "test-456",
      name: "Trimmed Agent",
      sessionName: "excalidraw-trim",
      workingDir: "/home/trim",
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAgent,
    });

    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "  Trimmed Agent  " } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it("should display correct placeholder text", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByPlaceholderText(
      "e.g., Claude Code"
    ) as HTMLInputElement;
    const dirInput = screen.getByPlaceholderText(
      "/path/to/project"
    ) as HTMLInputElement;

    expect(nameInput).toBeDefined();
    expect(dirInput).toBeDefined();
  });

  it("should have proper ARIA labels for accessibility", () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText("Agent Name")).toBeDefined();
    expect(screen.getByLabelText("Working Directory")).toBeDefined();
  });

  it("should clear error when user starts typing after error", async () => {
    render(<AIAgentDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText("Agent Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });

    const createButton = screen.getByText("Create Node");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Agent name is required")).toBeDefined();
    });

    fireEvent.change(nameInput, { target: { value: "New Agent" } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.queryByText("Agent name is required")).toBeNull();
    });
  });
});
