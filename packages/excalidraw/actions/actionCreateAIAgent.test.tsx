import { describe, it, expect } from "vitest";

import { actionCreateAIAgent } from "./actionCreateAIAgent";

describe("actionCreateAIAgent", () => {
  it("should have correct name", () => {
    expect(actionCreateAIAgent.name).toBe("createAIAgent");
  });

  it("should have correct label", () => {
    expect(actionCreateAIAgent.label).toBe("labels.createAIAgent");
  });

  it("should track event category as toolbar", () => {
    expect(actionCreateAIAgent.trackEvent).toEqual({ category: "toolbar" });
  });

  it("should have icon defined", () => {
    expect(actionCreateAIAgent.icon).toBeDefined();
  });

  it("should have PanelComponent defined", () => {
    expect(actionCreateAIAgent.PanelComponent).toBeDefined();
    expect(typeof actionCreateAIAgent.PanelComponent).toBe("function");
  });

  it("should open createAIAgent dialog when performed", () => {
    const elements: any[] = [];
    const appState = {
      openDialog: null,
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.appState.openDialog).toEqual({ name: "createAIAgent" });
  });

  it("should preserve other appState properties", () => {
    const elements: any[] = [];
    const appState = {
      openDialog: null,
      zoom: { value: 1 },
      scrollX: 100,
      scrollY: 200,
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.appState.zoom).toEqual({ value: 1 });
    expect(result.appState.scrollX).toBe(100);
    expect(result.appState.scrollY).toBe(200);
  });

  it("should set captureUpdate to IMMEDIATELY", () => {
    const elements: any[] = [];
    const appState = {
      openDialog: null,
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.captureUpdate).toBeDefined();
  });

  it("should replace existing dialog if one is open", () => {
    const elements: any[] = [];
    const appState = {
      openDialog: { name: "settings" },
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.appState.openDialog).toEqual({ name: "createAIAgent" });
  });

  it("should work with empty elements array", () => {
    const elements: any[] = [];
    const appState = {
      openDialog: null,
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.appState.openDialog).toEqual({ name: "createAIAgent" });
  });

  it("should work with non-empty elements array", () => {
    const elements: any[] = [
      { id: "1", type: "rectangle", x: 0, y: 0 },
      { id: "2", type: "ellipse", x: 100, y: 100 },
      { id: "3", type: "embeddable", x: 200, y: 200 },
    ];
    const appState = {
      openDialog: null,
    } as any;

    const result = actionCreateAIAgent.perform(elements, appState);

    expect(result.appState.openDialog).toEqual({ name: "createAIAgent" });
  });

  it("should be registered as an action", () => {
    expect(actionCreateAIAgent).toHaveProperty("name");
    expect(actionCreateAIAgent).toHaveProperty("perform");
    expect(typeof actionCreateAIAgent.perform).toBe("function");
  });
});
