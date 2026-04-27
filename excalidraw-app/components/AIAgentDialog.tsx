import React, { useState } from "react";

declare const __HOME_DIR__: string;

const API_BASE = "/api";

interface AIAgentDialogProps {
  onConfirm: (agent: {
    id: string;
    workingDir: string;
    worktree: boolean;
    dangerouslySkipPermissions: boolean;
  }) => void;
  onCancel: () => void;
}

const AIAgentDialog: React.FC<AIAgentDialogProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [workingDir, setWorkingDir] = useState(__HOME_DIR__);
  const [worktree, setWorktree] = useState(false);
  const [dangerouslySkipPermissions, setDangerouslySkipPermissions] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
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
        body: JSON.stringify({ workingDir, worktree, dangerouslySkipPermissions }),
      });

      if (res.ok) {
        onConfirm({ id: uuid, workingDir, worktree, dangerouslySkipPermissions });
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
          backgroundColor: "#f4f3ee",
          borderRadius: "8px",
          padding: "0",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
          color: "#c15f3c",
          fontFamily: "system-ui",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            backgroundColor: "#c15f3c",
            padding: "16px 24px",
            color: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            Create AI Agent Node
          </h2>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="working-dir-input"
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "6px",
                color: "#b1ada1",
                fontWeight: 500,
              }}
            >
              Working Directory
            </label>
            <input
              id="working-dir-input"
              type="text"
              autoFocus
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="/path/to/project"
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#ffffff",
                border: "1px solid #b1ada1",
                borderRadius: "4px",
                color: "#c15f3c",
                fontFamily: "monospace",
                fontSize: "12px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "12px",
                color: "#b1ada1",
                cursor: "pointer",
                gap: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={worktree}
                onChange={(e) => setWorktree(e.target.checked)}
                style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#c15f3c" }}
              />
              <span>Use worktree (isolate session in git worktree)</span>
            </label>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "12px",
                color: "#b1ada1",
                cursor: "pointer",
                gap: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={dangerouslySkipPermissions}
                onChange={(e) => setDangerouslySkipPermissions(e.target.checked)}
                style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#c15f3c" }}
              />
              <span>Dangerously skip permissions</span>
            </label>
          </div>

          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "8px",
                backgroundColor: "#fff0ed",
                border: "1px solid #c15f3c",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#c15f3c",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ffffff",
                color: "#b1ada1",
                border: "1px solid #b1ada1",
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
                backgroundColor: "#c15f3c",
                color: "#ffffff",
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
    </div>
  );
};

export default AIAgentDialog;
