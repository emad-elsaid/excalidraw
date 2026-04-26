import React, { useEffect, useState } from "react";

const API_BASE = "/api";

interface AIAgentNodeProps {
  element: any;
}

const AIAgentNode: React.FC<AIAgentNodeProps> = ({ element }) => {
  const [status, setStatus] = useState<"running" | "terminated">("terminated");
  const [ttydPort, setTtydPort] = useState<number | null>(null);
  const agentId = element.customData?.agentId;
  const agentName = element.customData?.name || "Agent";

  useEffect(() => {
    if (!agentId) {
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/agents/${agentId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to fetch agent status:", err);
      }
    };

    // Get ttyd port and ensure it's running
    const initTtyd = async () => {
      try {
        const res = await fetch(`${API_BASE}/agents/${agentId}/port`);
        if (res.ok) {
          const data = await res.json();
          setTtydPort(data.port);
        }
      } catch (err) {
        console.error("Failed to get ttyd port:", err);
      }
    };

    initTtyd();
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [agentId]);

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
        }}
      >
        Invalid Agent
      </div>
    );
  }

  if (!ttydPort) {
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
        }}
      >
        Loading terminal...
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
      }}
    >
      <div
        style={{
          padding: "4px 8px",
          backgroundColor: "#2d2d30",
          color: "#cccccc",
          fontSize: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #3e3e42",
        }}
      >
        <span>{agentName}</span>
        <span>{status === "running" ? "🟢" : "🔴"}</span>
      </div>
      <iframe
        src={`http://localhost:${ttydPort}`}
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          backgroundColor: "#000",
        }}
        allow="clipboard-read; clipboard-write"
        title={`Terminal: ${agentName}`}
      />
    </div>
  );
};

export default AIAgentNode;
