# AI Agent Component Specification

## Overview

The AI Agent component allows users to create and manage Claude Code instances directly within the Excalidraw canvas. Each agent appears as an embeddable element containing a live terminal running Claude Code.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│ Excalidraw Canvas                                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AIAgentNode (Embeddable Element)                     │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Header: Agent Name                         🟢  │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │                                                │  │  │
│  │  │  <iframe src="http://localhost:7681">         │  │  │
│  │  │    ┌──────────────────────────────────────┐   │  │  │
│  │  │    │ ttyd Web Terminal                    │   │  │  │
│  │  │    │  ┌────────────────────────────────┐  │   │  │  │
│  │  │    │  │ tmux session: excalidraw-xxx   │  │   │  │  │
│  │  │    │  │                                 │  │   │  │  │
│  │  │    │  │ $ claude                        │  │   │  │  │
│  │  │    │  │ > How can I help?              │  │   │  │  │
│  │  │    │  │                                 │  │   │  │  │
│  │  │    │  └────────────────────────────────┘  │   │  │  │
│  │  │    └──────────────────────────────────────┘   │  │  │
│  │  │  </iframe>                                     │  │  │
│  │  │                                                │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backend Stack

1. **Vite Plugin** (`agent-server.ts`)
   - Middleware that handles `/api` routes
   - Manages agent registry (persisted to `~/.claude/excalidraw-agents.json`)
   - Spawns and tracks ttyd processes

2. **ttyd** (Terminal Web Server)
   - Exposes terminal over HTTP/WebSocket
   - Each agent gets its own port (7681, 7682, 7683, ...)
   - Runs: `ttyd -p {port} tmux new-session -A -s {sessionName} -c {workingDir} claude`

3. **tmux** (Terminal Multiplexer)
   - Persistent terminal sessions
   - Session naming: `excalidraw-{agentId-prefix}`
   - Allows reconnection if browser tab closes

4. **claude** (Claude Code CLI)
   - The actual AI coding assistant
   - Runs in the tmux session
   - Working directory set per agent

### Frontend Stack

1. **AIAgentDialog** (`AIAgentDialog.tsx`)
   - Modal for creating new agents
   - Inputs: Agent Name, Working Directory
   - Calls `POST /api/agents` to create agent

2. **AIAgentComponents** (`AIAgentComponents.tsx`)
   - Integration layer between Excalidraw and agent components
   - Creates embeddable elements with agent metadata
   - Manages dialog visibility

3. **AIAgentNode** (`AIAgentNode.tsx`)
   - Renders inside embeddable element
   - Displays agent name and status indicator
   - Embeds terminal iframe
   - Polls status every 3 seconds

4. **actionCreateAIAgent** (`actionCreateAIAgent.tsx`)
   - Toolbar action to trigger agent creation
   - Registered in Excalidraw's action system

## Data Flow

### Creating an Agent

```
User clicks toolbar button
         ↓
actionCreateAIAgent triggers
         ↓
AppState.openDialog = "createAIAgent"
         ↓
AIAgentComponents shows AIAgentDialog
         ↓
User enters name + working directory
         ↓
POST /api/agents { name, workingDir }
         ↓
Server creates agent record:
  {
    id: "uuid",
    name: "Agent Name",
    sessionName: "excalidraw-{uuid-prefix}",
    workingDir: "/path",
    createdAt: "ISO-timestamp"
  }
         ↓
Agent saved to ~/.claude/excalidraw-agents.json
         ↓
Server returns agent JSON
         ↓
AIAgentComponents creates embeddable element:
  {
    type: "embeddable",
    x: 100, y: 100,
    width: 220, height: 90,
    link: "http://localhost:3001/api/agents/{id}/view",
    customData: {
      nodeType: "ai-agent",
      agentId: "{id}",
      name: "Agent Name"
    }
  }
         ↓
Excalidraw renders embeddable element
         ↓
Custom renderEmbeddable returns <AIAgentNode>
```

### Rendering an Agent

```
AIAgentNode component mounts
         ↓
Fetches GET /api/agents/{id}/port
         ↓
Server checks if ttyd exists for this session
  ├─ YES → Return existing port
  └─ NO  → Spawn ttyd process
              ↓
         ttyd -p {port} tmux new-session -A -s {sessionName} -c {workingDir} claude
              ↓
         Store in ttydProcesses map
              ↓
         Return port number
         ↓
Component receives { port: 7681 }
         ↓
Component renders iframe:
  <iframe src="http://localhost:7681" />
         ↓
Browser loads ttyd web interface
         ↓
ttyd connects to/creates tmux session
         ↓
tmux runs: claude
         ↓
User sees Claude Code in terminal!
```

### Status Polling

```
Every 3 seconds:
  GET /api/agents/{id}/status
         ↓
  Server checks: tmux list-sessions | grep {sessionName}
         ↓
  Returns: { status: "running" | "terminated", sessionName }
         ↓
  Component updates indicator: 🟢 (running) or 🔴 (terminated)
```

## API Endpoints

### GET /api/health
Returns health status of the API server.

**Response:**
```json
{ "status": "ok" }
```

### GET /api/config
Returns server configuration.

**Response:**
```json
{ "homeDir": "/home/username" }
```

### GET /api/agents
Lists all registered agents.

**Response:**
```json
{
  "uuid-1": {
    "id": "uuid-1",
    "name": "Agent Name",
    "sessionName": "excalidraw-uuid-pre",
    "workingDir": "/path",
    "createdAt": "2026-04-26T10:00:00.000Z"
  },
  "uuid-2": { ... }
}
```

### POST /api/agents
Creates a new agent.

**Request:**
```json
{
  "name": "My Agent",
  "workingDir": "/home/user/project"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Agent",
  "sessionName": "excalidraw-550e8400",
  "workingDir": "/home/user/project",
  "createdAt": "2026-04-26T10:00:00.000Z"
}
```

**Validation:**
- `name` is required (trimmed, non-empty)
- `workingDir` defaults to `$HOME` if not provided

### GET /api/agents/{id}/status
Returns the current status of an agent's tmux session.

**Response:**
```json
{
  "status": "running",
  "sessionName": "excalidraw-550e8400"
}
```

**Status Values:**
- `"running"` - tmux session is active
- `"terminated"` - tmux session does not exist

### GET /api/agents/{id}/port
Returns the ttyd port for an agent. Spawns ttyd if not already running.

**Response:**
```json
{ "port": 7681 }
```

**Behavior:**
1. Check if ttyd already running for this session → return existing port
2. If not, spawn new ttyd process on next available port
3. Store in ttydProcesses map
4. Return port number

### GET /api/agents/{id}/view
Returns HTML page with terminal iframe (legacy endpoint, not used by AIAgentNode).

**Response:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Agent Name</title>
  <style>...</style>
</head>
<body>
  <iframe src="http://localhost:7681"></iframe>
</body>
</html>
```

### POST /api/agents/{id}/open
Opens the agent's terminal in external Kitty terminal (deprecated).

**Response:**
```json
{
  "ok": true,
  "message": "Opening kitty terminal..."
}
```

**Behavior:**
- Spawns: `kitty tmux attach-session -t {sessionName}`
- Process is detached

## Agent Registry

### Location
`~/.claude/excalidraw-agents.json`

### Format
```json
{
  "agent-id-1": {
    "id": "agent-id-1",
    "name": "Agent Name",
    "sessionName": "excalidraw-agent-id",
    "workingDir": "/path/to/project",
    "createdAt": "2026-04-26T10:00:00.000Z"
  },
  "agent-id-2": { ... }
}
```

### Persistence
- Written on agent creation
- Read on server startup and API calls
- Survives server restarts
- Manual cleanup possible

## Process Management

### ttyd Process Tracking

**In-Memory Map:**
```typescript
ttydProcesses: Map<agentId, { port: number, proc: ChildProcess }>
```

**Port Allocation:**
- Starts at 7681
- Increments for each new agent
- Port conflicts avoided by checking existing processes

**Process Detection:**
```bash
ps aux | grep "ttyd.*{sessionName}" | grep -v grep
```

If found, extract port from command line: `-p {port}`

### tmux Session Management

**Session Naming:**
- Format: `excalidraw-{first-8-chars-of-uuid}`
- Example: `excalidraw-550e8400`

**Session Command:**
```bash
tmux new-session -A -s excalidraw-550e8400 -c /home/user/project claude
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

## Component Lifecycle

### AIAgentNode Lifecycle

1. **Mount**
   - Fetch `/api/agents/{id}/port`
   - Show "Loading terminal..." until port received
   - Fetch `/api/agents/{id}/status` (initial)
   - Start 3-second polling interval

2. **Render States**
   - **No agentId:** "Invalid Agent"
   - **Port not fetched:** "Loading terminal..."
   - **Port received:** Render header + iframe

3. **Unmount**
   - Clear status polling interval
   - ttyd process continues running
   - Iframe disconnects but tmux session persists

### ttyd Process Lifecycle

1. **Spawn**
   - Triggered by first `/port` request for an agent
   - Process detached and unref'd
   - Runs until manually killed or server shutdown

2. **Reuse**
   - Subsequent requests for same agent return existing port
   - Detected via `ps` grep for session name

3. **Cleanup**
   - No automatic cleanup (manual `pkill ttyd`)
   - Could accumulate processes over time
   - Future enhancement: Track last access time, cleanup idle agents

## Visual Design

### AIAgentNode Appearance

**Dimensions:**
- Default: 220px × 90px (can be resized in Excalidraw)

**Layout:**
```
┌────────────────────────────────────┐
│ Agent Name                     🟢  │ ← Header (28px)
├────────────────────────────────────┤
│                                    │
│     Terminal iframe                │
│     (ttyd web interface)           │
│                                    │
└────────────────────────────────────┘
```

**Header:**
- Background: `#2d2d30`
- Text color: `#cccccc`
- Font size: `12px`
- Padding: `4px 8px`
- Border bottom: `1px solid #3e3e42`

**Status Indicators:**
- 🟢 Green circle - tmux session running
- 🔴 Red circle - tmux session terminated

**Iframe:**
- Background: `#000`
- No border
- Fill remaining space (flex: 1)
- Allow: clipboard-read, clipboard-write

## Configuration

### Environment Variables

**__HOME_DIR__** (compile-time)
- Injected by Vite build
- Used as default working directory
- Defined in `vite.config.mts` and `vitest.config.mts`

### Port Configuration

**Starting Port:** 7681
- Defined in `agent-server.ts`: `let nextTtydPort = 7681`
- Each new agent increments port
- No upper limit (potential issue if many agents)

### Registry Path

**Location:** `~/.claude/excalidraw-agents.json`
- Defined in `agent-server.ts`: `const REGISTRY_FILE = path.join(process.env.HOME || "/home", ".claude", "excalidraw-agents.json")`
- Directory created if missing

## Security Considerations

### Local Development Only
- All endpoints exposed without authentication
- ttyd terminals have full shell access
- Only safe for local development use
- **DO NOT expose to network**

### CORS
- No CORS restrictions (Vite default)
- API and frontend on same origin

### iframe Permissions
- `allow="clipboard-read; clipboard-write"`
- No other restrictions
- Terminal has full capabilities

## Known Limitations

1. **No Agent Deletion**
   - Agents can only be created, not deleted via UI
   - Manual registry editing required
   - ttyd processes not automatically cleaned up

2. **Port Exhaustion**
   - Port counter only increments, never decrements
   - Long-running dev server could exhaust ports
   - Restart server to reset port counter

3. **No Concurrency Control**
   - Multiple users creating agents simultaneously could conflict
   - Registry file writes not atomic
   - In-memory map not synchronized

4. **Process Orphaning**
   - ttyd processes persist after server restart
   - Manual cleanup required (`pkill ttyd`)
   - Could accumulate over time

5. **No Error Recovery**
   - If ttyd fails to start, no retry logic
   - Component shows "Loading terminal..." indefinitely
   - User must refresh page

6. **Session Name Collisions**
   - UUID prefix (8 chars) could theoretically collide
   - No collision detection
   - Low probability in practice

## Future Enhancements

### Proposed Features

1. **Agent Deletion**
   - Add DELETE endpoint
   - Kill ttyd process
   - Remove from registry
   - Update Excalidraw element

2. **Process Cleanup**
   - Track last access time
   - Auto-kill idle ttyd processes
   - Cleanup on server shutdown

3. **Port Management**
   - Detect available ports dynamically
   - Reuse ports from terminated agents
   - Configurable port range

4. **Error Handling**
   - Retry ttyd spawn on failure
   - Show error messages in component
   - Fallback to external terminal

5. **Session Reconnection**
   - Detect existing tmux session
   - Reconnect instead of creating new
   - Preserve history across refreshes

6. **Multi-User Support**
   - Per-user registry files
   - Authentication/authorization
   - Port namespace per user

7. **Cloud Deployment**
   - Proxy ttyd through secure WebSocket
   - Authentication layer
   - Resource limits per agent

## Testing

### Test Coverage

**Unit Tests:**
- `agent-server.test.ts` - 43 tests (API logic, validation)
- `AIAgentDialog.test.tsx` - 14 tests (UI, form validation)
- `AIAgentNode.test.tsx` - 13 tests (rendering, lifecycle)
- `AIAgentComponents.test.tsx` - 11 tests (integration)
- `actionCreateAIAgent.test.tsx` - 12 tests (action logic)

**Integration Tests:**
- `ai-agent-integration.test.tsx` - Embeddable rendering
- `ai-agent-overlay.test.tsx` - Position synchronization

**Total:** 90+ tests

### Manual Testing Checklist

- [ ] Create agent with custom name
- [ ] Create agent with custom working directory
- [ ] Verify Claude Code starts in terminal
- [ ] Verify status indicator updates (🟢/🔴)
- [ ] Resize embeddable element
- [ ] Multiple agents on same canvas
- [ ] Refresh page, verify agents reconnect
- [ ] Terminal input/output works
- [ ] Claude Code commands execute
- [ ] Clipboard paste works in terminal

## Troubleshooting

### Terminal shows shell instead of Claude Code
**Cause:** ttyd spawned before fix was applied
**Solution:** `pkill ttyd` and refresh page

### "Loading terminal..." never resolves
**Cause:** ttyd failed to start or port conflict
**Solution:** 
1. Check browser console for errors
2. Check server logs for ttyd errors
3. Verify ttyd is installed: `which ttyd`
4. Check port availability: `lsof -ti:7681`

### JSON parse error in console
**Cause:** API path routing issue (fixed)
**Solution:** Ensure `agentIdMatch` regex includes `/agents/`

### Agent not found (404)
**Cause:** Agent ID doesn't exist in registry
**Solution:** Check `~/.claude/excalidraw-agents.json`

### Multiple ttyd processes for same agent
**Cause:** Dev server restarted, in-memory map cleared
**Solution:** Improved with `findPortForSession()` detection

## Development

### Adding a New Endpoint

1. Add route handler in `agent-server.ts`:
```typescript
if (pathWithoutBase === "/agents/custom" && req.method === "GET") {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ custom: "data" }));
  return;
}
```

2. Update client to call endpoint
3. Add tests in `agent-server.test.ts`
4. Update this specification

### Modifying Terminal Command

Current command: `claude`

To change (e.g., run custom script):
```typescript
// In ensureTtyd()
spawn("ttyd", [
  "-p", String(port),
  "tmux", "new-session", "-A",
  "-s", agent.sessionName,
  "-c", agent.workingDir,
  "bash", "-c", "source ~/.bashrc && custom-command"  // ← Change here
])
```

### Debugging

**Enable ttyd logs:**
```bash
ttyd -d 9 -p 7681 tmux new-session -A -s test claude
```

**Check tmux session:**
```bash
tmux list-sessions
tmux attach -t excalidraw-550e8400
```

**Inspect agent registry:**
```bash
cat ~/.claude/excalidraw-agents.json | jq
```

**Monitor ttyd processes:**
```bash
watch -n 1 'ps aux | grep ttyd | grep -v grep'
```

## References

- **ttyd:** https://github.com/tsl0922/ttyd
- **tmux:** https://github.com/tmux/tmux
- **Excalidraw Embeddables:** https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration#embed
- **Vite Server API:** https://vitejs.dev/guide/api-plugin.html#configureserver
