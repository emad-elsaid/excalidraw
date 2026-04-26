import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Excalidraw, useExcalidrawAPI } from "@excalidraw/excalidraw";
import { newEmbeddableElement } from "@excalidraw/element";
import { generateNKeysBetween } from "fractional-indexing";

vi.mock("child_process");
vi.mock("fs");

const TestComponent = () => {
  const excalidrawAPI = useExcalidrawAPI();
  const [renderCalled, setRenderCalled] = React.useState(false);
  const [agentData, setAgentData] = React.useState<any>(null);

  const handleCreateAgent = () => {
    if (!excalidrawAPI) {
      return;
    }

    const elements = excalidrawAPI.getSceneElements();
    const lastElement = elements[elements.length - 1];
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

    excalidrawAPI.updateScene({ elements: [...elements, newEl] });
  };

  return (
    <div>
      <button onClick={handleCreateAgent}>Create Agent</button>
      <Excalidraw
        renderEmbeddable={(element) => {
          const customData = (element as any).customData;
          if (customData?.nodeType === "ai-agent") {
            setRenderCalled(true);
            setAgentData(customData);
            return (
              <div data-testid="agent-node">
                {customData.name} - {customData.agentId}
              </div>
            );
          }
          return null;
        }}
        validateEmbeddable={() => true}
      />
      {renderCalled && (
        <div data-testid="render-status">Agent rendered: {agentData?.name}</div>
      )}
    </div>
  );
};

describe("AI Agent Integration", () => {
  it("should render embeddable element with customData", async () => {
    render(<TestComponent />);

    const button = screen.getByText("Create Agent");
    fireEvent.click(button);

    await waitFor(
      () => {
        const node = screen.queryByTestId("agent-node");
        expect(node).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("should render AIAgentNode when element has ai-agent customData", async () => {
    render(<TestComponent />);

    const button = screen.getByText("Create Agent");
    fireEvent.click(button);

    await waitFor(
      () => {
        const status = screen.queryByTestId("render-status");
        expect(status?.textContent).toContain("Agent rendered: Test Agent");
      },
      { timeout: 5000 },
    );
  });
});
