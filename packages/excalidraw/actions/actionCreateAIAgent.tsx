import React from "react";

import { CaptureUpdateAction } from "@excalidraw/element";

import { ToolButton } from "../components/ToolButton";
import { ClaudeIcon } from "../components/icons";
import { t } from "../i18n";

import { register } from "./register";

export const actionCreateAIAgent = register({
  name: "createAIAgent",
  label: "labels.createAIAgent",
  icon: ClaudeIcon,
  trackEvent: { category: "toolbar" },
  perform: (_elements, appState) => {
    return {
      appState: {
        ...appState,
        openDialog: { name: "createAIAgent" },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={ClaudeIcon}
      title={t("labels.createAIAgent")}
      aria-label={t("labels.createAIAgent")}
      onClick={() => updateData(null)}
    />
  ),
});
