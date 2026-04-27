# AI Agent Component Specification

## Overview

The AI Agent component allows users to create and manage Claude Code instances directly within the Excalidraw canvas. Each agent appears as a status box containing agent name, working directory, status (running/terminated).

## Architecture

### Components

```
┌────────────────────────────────────────────────────────────────┐
│ Excalidraw Canvas                                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AIAgentNode (Embeddable Element)                         │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Claude icon] [loading spinner] Header: Agent Name │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │  Workdir: ~/path/to/director                       │  │  │
│  │  │  [Open] [Terminate]                                │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Color scheme
- #c15f3c
- #ffffff
- #f4f3ee
- #b1ada1



### Backend Stack

1. **Vite Plugin** (`agent-server.ts`)

   - Middleware that handles `/api` routes
   - `POST /api/claude/uuid` create a new claude code agent with `uuid` as the session uuid using `claude --session-id=<uuid>` where `uuid` is valid UUID inside tmux session with the same UUID.
   - `GET /api/claude/uuid` returns the status of the session (either running or terminated) using uuid of the tmux session ID
   - `DEL /api/claude/uuid` terminates a running claude session by uuid
   - `GET /api/claude/uuid/launch` runs kitty showing the tmux session that include the claude session with uuid.

2. **tmux** (Terminal Multiplexer)

   - Persistent terminal sessions
   - Session naming: `UUID`
   - tmux can create or attach to existing session using `tmux new -A -s <session_name>`

3. **claude** (Claude Code CLI)
   - The actual AI coding assistant
   - Runs in the tmux session using same `UUID` used for tmux session
   - Working directory set per agent

### Frontend Stack

1. **AIAgentDialog** (`AIAgentDialog.tsx`)

   - Modal for creating new agents
   - Inputs:
     - Agent Name using text input
     - Working directory: User choose using text input
     - Worktree (boolean): checkbox specifying if claude should use --worktree flag
     - dangerously skip permissions (boolean): checkbox specifying if claude should start with `--dangerously-skip-permissions` flag
   - Calls `POST /api/claude/uuid` to create agent

2. **AIAgentComponents** (`AIAgentComponents.tsx`)

   - Integration layer between Excalidraw and agent components
   - Creates embeddable elements with agent metadata
   - Manages dialog visibility

3. **AIAgentNode** (`AIAgentNode.tsx`)
   - Renders inside embeddable element
   - Displays status indicator, agent name, working directory, UUID of the session. button to terminate if it's running. button to open the kitty terminal calling `GET /api/claude/uuid/launch`
   - Polls status every 3 seconds

4. **actionCreateAIAgent** (`actionCreateAIAgent.tsx`)
   - Toolbar action to trigger agent creation
   - Registered in Excalidraw's action system

## Data Flow

### Creating an Agent

```
User clicks toolbar button showing Claude icon
         ↓
actionCreateAIAgent triggers
         ↓
AppState.openDialog = "createAIAgent"
         ↓
AIAgentComponents shows AIAgentDialog
         ↓
User enters name + working directory
         ↓
POST /api/claude/{newUUID}  { name, workingDir, worktree }
         ↓
Server creates agent record:
  {
    id: "uuid",
    name: "Agent Name",
    sessionName: "{uuid}",
    workingDir: "/path",
    worktree: true,
    createdAt: "ISO-timestamp"
  }
         ↓
Server returns agent JSON
         ↓
AIAgentComponents creates embeddable element:
    link: "http://localhost:3001/api/claude/{uuid}/launch"
         ↓
Excalidraw renders embeddable element
         ↓
Custom renderEmbeddable returns <AIAgentNode>
```

### Status Polling

```
Every 3 seconds:
  GET /api/claude/{uuid}
         ↓
  Server checks: tmux list-sessions | grep {uuid}
         ↓
  Returns: { status: "running" | "terminated" }
         ↓
  Component updates indicator: [loading spinner] (running) or 🔴 (terminated)
```

## API Endpoints

### POST /api/claude/{uuid}

Creates a new agent.

**Request:**

```json
{
  "uuid": "0ce062db-8ef0-4d98-930d-04389b6c81fa",
  "workingDir": "/home/user/project"
}
```

**Response:**

```json
{
  "id": "0ce062db-8ef0-4d98-930d-04389b6c81fa",
  "createdAt": "2026-04-26T10:00:00.000Z"
}
```

**Validation:**

- `uuid` is required (trimmed, non-empty)
- `workingDir` defaults to `$HOME\*\* if not provided

**Behavior:**

- Spawns: `tmux new -A -t {UUID} -c {workingDir} claude --session-id={UUID} --worktree`
- Process is detached

### GET /api/claude/{uuid}

Returns the current status of an agent's tmux session.

**Response:**

```json
{
  "status": "running"
}
```

**Status Values:**

- `"running"` - tmux session is active
- `"terminated"` - tmux session does not exist

### DELETE /api/claude/{uuid}

Terminates the tmux session named `uuid`

**Response:**

```json
{
  "status": "ok"
}
```

### Get /api/claude/{uuid}/launch

Opens the agent's terminal in external Kitty terminal that has tmux session with `uuid`

**Response:**

```json
{
  "ok": true,
  "message": "Opening kitty terminal..."
}
```

**Behavior:**

- Spawns: `kitty tmux new -A -t {UUID}`
- Process is detached

## Process Management

### tmux Session Management

**Session Naming:**

- Format: `{uuid}`

**Session Command:**

```bash
tmux new-session -A -s {UUID} -c /home/user/project claude --session-id={UUID} --worktree
```

**Flags:**

- `-A` - Attach if exists, create if not
- `-s` - Session name
- `-c` - Start directory
- Final arg: Command to run (`claude`)

**Session Persistence:**

- tmux sessions persist even if browser disconnects
- Can reconnect to existing session
- Session dies when Claude Code exits

## Visual Design

### AIAgentNode Appearance

**Layout:**

```
┌────────────────────────────────────────────┐
│ [claude icon] [loading spinner] Agent Name │
├────────────────────────────────────────────┤
│ Directory: ~/code/excalidraw/              │
| [Open] [Terminate]                         | ← Open is a button to open terminal with the tmux session
|                                            | ← Terminate a button to terminate the tmux session
└────────────────────────────────────────────┘
```

**Header:**

Use the color scheme

**Status Indicators:**

- Loading spinner - tmux session running
- 🔴 Red circle - tmux session terminated

## Configuration

### Environment Variables

\***\*HOME_DIR\*\*** (compile-time)

- Injected by Vite build
- Used as default working directory
- Defined in `vite.config.mts` and `vitest.config.mts`
