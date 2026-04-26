import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Excalidraw, useExcalidrawAPI } from "@excalidraw/excalidraw";
import { newEmbeddableElement } from "@excalidraw/element";
import { generateNKeysBetween } from "fractional-indexing";

vi.mock("child_process");
vi.mock("fs");

const AIAgentOverlayTest = () => {
  const excalidrawAPI = useExcalidrawAPI();
  const [elements, setElements] = React.useState<readonly any[]>([]);

  const createAgent = () => {
    if (!excalidrawAPI) {
      return;
    }

    const sceneElements = excalidrawAPI.getSceneElements();
    const lastElement = sceneElements[sceneElements.length - 1];
    const newIndex = lastElement?.index
      ? generateNKeysBetween(lastElement.index, null, 1)[0]
      : "a0";

    const newEl = newEmbeddableElement({
      type: "embeddable",
      x: 100,
      y: 100,
      width: 220,
      height: 90,
      index: newIndex as any,
      link: "about:blank",
      customData: {
        nodeType: "ai-agent",
        agentId: "test-agent-123",
        name: "Test Agent",
      },
    } as any);

    setElements([...sceneElements, newEl]);
    excalidrawAPI.updateScene({ elements: [...sceneElements, newEl] });
  };

  const deleteElement = (elementId: string) => {
    if (!excalidrawAPI) {
      return;
    }
    const sceneElements = excalidrawAPI.getSceneElements();
    const filtered = sceneElements.filter((el) => el.id !== elementId);
    setElements(filtered);
    excalidrawAPI.updateScene({ elements: filtered });
  };

  const updateElementPosition = (elementId: string, x: number, y: number) => {
    if (!excalidrawAPI) {
      return;
    }
    const sceneElements = excalidrawAPI.getSceneElements();
    const updated = sceneElements.map((el) =>
      el.id === elementId ? { ...el, x, y } : el,
    );
    setElements(updated);
    excalidrawAPI.updateScene({ elements: updated });
  };

  const agentElements = elements.filter(
    (el) => el.type === "embeddable" && el.customData?.nodeType === "ai-agent",
  );

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <button onClick={createAgent} data-testid="create-agent">
        Create Agent
      </button>

      <Excalidraw
        onChange={(els) => {
          setElements(els);
        }}
        renderEmbeddable={() => null}
      />

      {excalidrawAPI &&
        agentElements.map((el) => {
          const appState = excalidrawAPI.getAppState();
          const zoom = appState.zoom.value;
          const offsetX = appState.scrollX;
          const offsetY = appState.scrollY;

          const viewportX = el.x * zoom + offsetX;
          const viewportY = el.y * zoom + offsetY;

          return (
            <div
              key={el.id}
              data-testid={`agent-overlay-${el.id}`}
              data-agent-id={el.id}
              data-x={el.x}
              data-y={el.y}
              style={{
                position: "absolute",
                left: `${viewportX}px`,
                top: `${viewportY}px`,
                width: `${el.width * zoom}px`,
                height: `${el.height * zoom}px`,
                pointerEvents: "auto",
                zIndex: 1000,
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                padding: "10px",
                boxSizing: "border-box",
              }}
            >
              <div>
                {el.customData.name} ({el.customData.agentId})
              </div>
              <button
                onClick={() => deleteElement(el.id)}
                data-testid={`delete-agent-${el.id}`}
              >
                Delete
              </button>
              <button
                onClick={() =>
                  updateElementPosition(el.id, el.x + 50, el.y + 50)
                }
                data-testid={`move-agent-${el.id}`}
              >
                Move
              </button>
            </div>
          );
        })}
    </div>
  );
};

describe("AI Agent Overlay", () => {
  it("should render agent overlay at correct position", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlay = screen.queryByText(/Test Agent/);
      expect(overlay).toBeTruthy();
    });
  });

  it("should update overlay position when element is moved", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlay = screen.queryByTestId(/agent-overlay-/);
      expect(overlay).toBeTruthy();
    });

    const overlays = screen.getAllByTestId(/agent-overlay-/);
    const agentId = overlays[0].getAttribute("data-agent-id");

    const moveBtn = screen.getByTestId(`move-agent-${agentId}`);
    fireEvent.click(moveBtn);

    await waitFor(() => {
      const updatedOverlay = screen.getByTestId(`agent-overlay-${agentId}`);
      const newX = updatedOverlay.getAttribute("data-x");
      const newY = updatedOverlay.getAttribute("data-y");

      expect(parseFloat(newX!)).toBe(150);
      expect(parseFloat(newY!)).toBe(150);
    });
  });

  it("should remove overlay when agent is deleted", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlay = screen.queryByText(/Test Agent/);
      expect(overlay).toBeTruthy();
    });

    const overlays = screen.getAllByTestId(/agent-overlay-/);
    const agentId = overlays[0].getAttribute("data-agent-id");

    const deleteBtn = screen.getByTestId(`delete-agent-${agentId}`);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      const overlay = screen.queryByTestId(`agent-overlay-${agentId}`);
      expect(overlay).toBeNull();
    });
  });

  it("should create multiple agents and manage them independently", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");

    fireEvent.click(createBtn);
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlays = screen.getAllByTestId(/agent-overlay-/);
      expect(overlays.length).toBe(2);
    });
  });

  it("should sync element position with overlay position", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlay = screen.queryByTestId(/agent-overlay-/);
      expect(overlay).toBeTruthy();
    });

    const overlays = screen.getAllByTestId(/agent-overlay-/);
    const agentId = overlays[0].getAttribute("data-agent-id");

    const moveBtn = screen.getByTestId(`move-agent-${agentId}`);

    fireEvent.click(moveBtn);
    fireEvent.click(moveBtn);

    await waitFor(() => {
      const updatedOverlay = screen.getByTestId(`agent-overlay-${agentId}`);
      const x = updatedOverlay.getAttribute("data-x");
      const y = updatedOverlay.getAttribute("data-y");

      expect(parseFloat(x!)).toBe(200);
      expect(parseFloat(y!)).toBe(200);
    });
  });

  it("should not leave orphaned overlays after deletion", async () => {
    render(<AIAgentOverlayTest />);

    const createBtn = screen.getByTestId("create-agent");
    fireEvent.click(createBtn);

    await waitFor(() => {
      const overlay = screen.queryByText(/Test Agent/);
      expect(overlay).toBeTruthy();
    });

    const overlays = screen.getAllByTestId(/agent-overlay-/);
    const agentId = overlays[0].getAttribute("data-agent-id");

    const deleteBtn = screen.getByTestId(`delete-agent-${agentId}`);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      const remainingOverlays = screen.queryAllByTestId(/agent-overlay-/);
      expect(remainingOverlays.length).toBe(0);
    });
  });
});
