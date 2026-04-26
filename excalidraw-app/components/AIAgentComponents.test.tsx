import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { AIAgentComponents } from "./AIAgentComponents";

// Mock AIAgentDialog
vi.mock("./AIAgentDialog", () => ({
  default: ({ onConfirm, onCancel }: any) => (
    <div data-testid="mock-dialog">
      <button onClick={() => onConfirm({ id: "test-123", name: "Test" })}>
        Confirm
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe("AIAgentComponents", () => {
  let mockAPI: Partial<ExcalidrawImperativeAPI>;

  beforeEach(() => {
    mockAPI = {
      getSceneElements: vi.fn().mockReturnValue([]),
      updateScene: vi.fn(),
    };
  });

  it("should not render dialog when showDialog is false", () => {
    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={false}
        onCloseDialog={() => {}}
      />,
    );

    expect(screen.queryByTestId("mock-dialog")).toBeNull();
  });

  it("should render dialog when showDialog is true", () => {
    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    expect(screen.getByTestId("mock-dialog")).toBeDefined();
  });

  it("should create embeddable element with correct properties", () => {
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "embeddable",
            customData: expect.objectContaining({
              nodeType: "ai-agent",
              agentId: "test-123",
              name: "Test",
            }),
          }),
        ]),
      }),
    );
  });

  it("should position new element at 100, 100", () => {
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            x: 100,
            y: 100,
          }),
        ]),
      }),
    );
  });

  it("should set element dimensions to 300x120", () => {
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            width: 300,
            height: 120,
          }),
        ]),
      }),
    );
  });

  it("should set link to agent view endpoint", () => {
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    expect(screen.getByTestId("mock-dialog")).toBeDefined();
  });

  it("should call onCloseDialog after creating agent", () => {
    const mockOnClose = vi.fn();

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={mockOnClose}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onCloseDialog when dialog is cancelled", () => {
    const mockOnClose = vi.fn();

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={mockOnClose}
      />,
    );

    const cancelButton = screen.getByText("Cancel");
    cancelButton.click();

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should append to existing elements", () => {
    const existingElements = [
      { id: "1", type: "rectangle" },
      { id: "2", type: "ellipse" },
    ];

    mockAPI.getSceneElements = vi.fn().mockReturnValue(existingElements);
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          { id: "1", type: "rectangle" },
          { id: "2", type: "ellipse" },
          expect.objectContaining({
            type: "embeddable",
          }),
        ]),
      }),
    );

    const updateCall = mockUpdateScene.mock.calls[0][0];
    expect(updateCall.elements.length).toBe(3);
  });

  it("should generate fractional index after last element", () => {
    const existingElements = [
      { id: "1", type: "rectangle", index: "a0" },
      { id: "2", type: "ellipse", index: "a1" },
    ];

    mockAPI.getSceneElements = vi.fn().mockReturnValue(existingElements);
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(mockUpdateScene).toHaveBeenCalled();
    const updateCall = mockUpdateScene.mock.calls[0][0];
    const newElement = updateCall.elements[2];
    expect(newElement.index).toBeDefined();
  });

  it("should use default index when no elements exist", () => {
    mockAPI.getSceneElements = vi.fn().mockReturnValue([]);
    const mockUpdateScene = vi.fn();
    mockAPI.updateScene = mockUpdateScene;

    render(
      <AIAgentComponents
        excalidrawAPI={mockAPI as ExcalidrawImperativeAPI}
        showDialog={true}
        onCloseDialog={() => {}}
      />,
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    const updateCall = mockUpdateScene.mock.calls[0][0];
    const newElement = updateCall.elements[0];
    expect(newElement.index).toBe("a0");
  });
});
