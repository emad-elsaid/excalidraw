# AI Agent Node Testing Checklist

## Manual Testing Process

Run this checklist BEFORE declaring the feature complete.

### Setup

```bash
yarn start
```

Open browser console (F12) and watch for errors.

---

## Test Cases

### 1. Create Agent Dialog

- [ ] Click "+ AI Agent" button (top-right)
- [ ] Dialog appears with form
- [ ] Default name: "Claude Code"
- [ ] Default working directory: "/home"
- [ ] Can edit both fields
- [ ] "Create Node" button is enabled
- [ ] "Cancel" button closes dialog without creating

**Expected:**

- No console errors
- Dialog is modal (background dimmed)
- Form validation works

---

### 2. Place Agent Node on Canvas

- [ ] After confirming dialog, cursor should change (indicate drawing mode)
- [ ] Click on canvas
- [ ] Rectangle appears at click location
- [ ] Toolbar changes back to selection mode

**Expected:**

- Node appears at correct position
- Node is selectable (blue outline on select)
- No fractional index errors
- No console errors

---

### 3. Agent Node Display

- [ ] Node shows agent name
- [ ] Status indicator shows (green dot for running, red for terminated)
- [ ] "Open Terminal" button is visible

**Expected:**

- Visual appearance matches design
- Text is readable
- Button is clickable

---

### 4. Status Polling

- [ ] Create agent node
- [ ] Wait 3 seconds
- [ ] Status should update (if session exists, dot should be green)

**Expected:**

- Status dot changes color appropriately
- No console errors about failed fetches
- Updates happen automatically

---

### 5. Open Terminal

- [ ] Create agent node
- [ ] Click "Open Terminal" button
- [ ] Kitty terminal window should appear
- [ ] Kitty attaches to tmux session (name shown in title/prompt)

**Expected:**

- Kitty opens within 1 second
- Tmux session is accessible
- Can type commands in the session

---

### 6. Restore Terminated Session

- [ ] Create agent node
- [ ] Manually kill tmux session: `tmux kill-session -t <session-name>`
- [ ] Status should change to red in 3-6 seconds
- [ ] Click "Open Terminal"
- [ ] Kitty opens with new tmux session

**Expected:**

- Status updates to show terminated
- New session is created
- Kitty opens successfully

---

### 7. Multiple Agents

- [ ] Create 2+ agent nodes on canvas
- [ ] Each has unique ID
- [ ] Each can be opened independently
- [ ] Status updates independently

**Expected:**

- Each node tracks its own session
- No cross-contamination between agents

---

### 8. Persistence

- [ ] Create agent nodes
- [ ] Refresh page (F5)
- [ ] Nodes should still be on canvas
- [ ] Status should still work

**Expected:**

- Drawing persists
- API calls still work
- Sessions are tracked correctly

---

## Error Handling

- [ ] No console errors during any test
- [ ] No fractional index errors
- [ ] No "process is not defined" errors
- [ ] Network errors handled gracefully (show in dialog?)

---

## Performance

- [ ] Clicking "+ AI Agent" appears immediately
- [ ] Dialog opens in <500ms
- [ ] Node appears on canvas in <200ms
- [ ] Status updates within 3 seconds
- [ ] Terminal opens within 1 second

---

## Accessibility

- [ ] Tab navigation works
- [ ] Button focus is visible
- [ ] Text is readable at normal zoom
- [ ] Colors have sufficient contrast

---

## Sign-off

- [ ] All manual tests pass
- [ ] No console errors
- [ ] Feature works as designed
- [ ] Code is properly formatted (no ESLint warnings)

**Tested by:** **\*\***\_\_\_\_**\*\***  
**Date:** **\*\***\_\_\_\_**\*\***  
**Notes:**

```
[Add any issues found or edge cases discovered]
```
