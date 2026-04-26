import React, { useEffect, useState } from "react";

const API_BASE = "/api";

interface AIAgentNodeProps {
  element: any;
}

const AIAgentNode: React.FC<AIAgentNodeProps> = ({ element }) => {
  const [status, setStatus] = useState<"running" | "terminated">("terminated");
  const agentId = element.customData?.agentId;
  const agentName = element.customData?.name || "Agent";
  const workingDir = element.customData?.workingDir || "~";

  useEffect(() => {
    if (!agentId) {
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/claude/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to fetch agent status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [agentId]);

  const handleTerminate = async () => {
    if (!agentId) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/claude/${agentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatus("terminated");
      }
    } catch (err) {
      console.error("Failed to terminate agent:", err);
    }
  };

  const handleLaunch = async () => {
    if (!agentId) {
      return;
    }
    try {
      await fetch(`${API_BASE}/claude/${agentId}/launch`);
    } catch (err) {
      console.error("Failed to launch terminal:", err);
    }
  };

  if (!agentId) {
    return (
      <div
        style={{
          padding: "8px",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: "12px",
        }}
      >
        Invalid Agent
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
        color: "#cccccc",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      {/* Header with name and status */}
      <div
        style={{
          padding: "6px 8px",
          backgroundColor: "#2d2d30",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #3e3e42",
        }}
      >
        <span style={{ fontWeight: 500 }}>{agentName}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{status === "running" ? "🟢" : "🔴"}</span>
          {status === "running" && (
            <button
              onClick={handleTerminate}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "16px",
                padding: 0,
                lineHeight: 1,
              }}
              title="Terminate session"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Body with details */}
      <div
        style={{
          padding: "8px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div>
          <span style={{ color: "#888" }}>Directory:</span>{" "}
          <span style={{ color: "#e5e7eb" }}>{workingDir}</span>
        </div>
        <div>
          <span style={{ color: "#888" }}>UUID:</span>{" "}
          <span style={{ color: "#e5e7eb", fontSize: "10px" }}>{agentId}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <button
            onClick={handleLaunch}
            style={{
              padding: "4px 8px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "system-ui",
            }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgentNode;
