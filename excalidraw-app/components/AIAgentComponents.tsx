import React from "react";
import { newEmbeddableElement } from "@excalidraw/element";
import { generateNKeysBetween } from "fractional-indexing";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import AIAgentDialog from "./AIAgentDialog";

interface AIAgentComponentsProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  showDialog: boolean;
  onCloseDialog: () => void;
}

export const AIAgentComponents = ({
  excalidrawAPI,
  showDialog,
  onCloseDialog,
}: AIAgentComponentsProps) => {
  const handleCreateAgent = (agent: {
    id: string;
    name: string;
    workingDir: string;
    worktree: boolean;
    dangerouslySkipPermissions: boolean;
  }) => {
    const elements = excalidrawAPI.getSceneElements();
    const lastElement = elements[elements.length - 1];

    const newIndex = (
      lastElement?.index != null
        ? generateNKeysBetween(lastElement.index, null, 1)[0]
        : "a0"
    ) as any;

    const newEl = newEmbeddableElement({
      type: "embeddable",
      x: 100,
      y: 100,
      width: 300,
      height: 120,
      index: newIndex,
      link: `${window.location.origin}/api/claude/${agent.id}/launch`,
      customData: {
        nodeType: "ai-agent",
        agentId: agent.id,
        name: agent.name,
        workingDir: agent.workingDir,
        worktree: agent.worktree,
        dangerouslySkipPermissions: agent.dangerouslySkipPermissions,
      },
    } as any);

    excalidrawAPI.updateScene({ elements: [...elements, newEl] });
  };

  if (!showDialog) {
    return null;
  }

  return (
    <AIAgentDialog
      onConfirm={(agent) => {
        handleCreateAgent(agent);
        onCloseDialog();
      }}
      onCancel={onCloseDialog}
    />
  );
};
