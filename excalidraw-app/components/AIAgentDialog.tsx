import React, { useState } from "react";

declare const __HOME_DIR__: string;

const API_BASE = "/api";

interface AIAgentDialogProps {
  onConfirm: (agent: { id: string; name: string; workingDir: string }) => void;
  onCancel: () => void;
}

const AIAgentDialog: React.FC<AIAgentDialogProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState("Claude Code");
  const [workingDir, setWorkingDir] = useState(__HOME_DIR__);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }
    if (!workingDir.trim()) {
      setError("Working directory is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use browser's crypto.randomUUID()
      const uuid = crypto.randomUUID();
      const res = await fetch(`${API_BASE}/claude/${uuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingDir }),
      });

      if (res.ok) {
        onConfirm({ id: uuid, name, workingDir });
      } else {
        setError("Failed to create agent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          color: "#e5e7eb",
          fontFamily: "system-ui",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "18px" }}>
          Create AI Agent Node
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="agent-name-input"
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "6px",
              color: "#9ca3af",
              fontWeight: 500,
            }}
          >
            Agent Name
          </label>
          <input
            id="agent-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Claude Code"
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#374151",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              color: "#e5e7eb",
              fontFamily: "monospace",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="working-dir-input"
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "6px",
              color: "#9ca3af",
              fontWeight: 500,
            }}
          >
            Working Directory
          </label>
          <input
            id="working-dir-input"
            type="text"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            placeholder="/path/to/project"
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#374151",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              color: "#e5e7eb",
              fontFamily: "monospace",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "8px",
              backgroundColor: "#7f1d1d",
              border: "1px solid #dc2626",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4b5563",
              color: "#e5e7eb",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating..." : "Create Node"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgentDialog;
