# Testing Process for Claude Code

## Problem Statement

Previously, I wrote code without a systematic testing approach, leading to:

- Runtime errors that static analysis missed (`process` undefined in browser)
- Type errors that TypeScript didn't catch properly
- Fractional index errors from improper element creation
- Only discovering issues when the user ran the code

## Solution: Three-Tier Testing Strategy

### Tier 1: Static Analysis (Automated)

**Run BEFORE writing code is "done"**

```bash
# TypeScript type checking
yarn test:typecheck

# ESLint linting
yarn fix  # or yarn lint

# These catch:
- Type mismatches
- Import errors
- Unused variables
- Format violations
```

**My responsibility:** Ensure no warnings or errors before handing off.

---

### Tier 2: Unit Tests (Isolated)

**Write tests for new features**

```bash
yarn test
```

Example areas to test:

- **Backend API**: Each endpoint with valid/invalid inputs
- **Component logic**: State changes, event handlers
- **Utilities**: Fractional index generation, session detection

For this project, tests should cover:

```typescript
// agent-server.test.ts
- POST /api/agents (create) → returns valid agent
- GET /api/agents/:id/status → returns correct status
- POST /api/agents/:id/open → creates session if missing
```

---

### Tier 3: Manual Testing (Integration)

**Test the actual feature in the browser**

Follow the checklist in `AI_AGENT_TESTING.md`:

1. **Happy path**: Create agent → place on canvas → open terminal
2. **Edge cases**: Terminated session → restart → open
3. **Error scenarios**: Invalid inputs, network errors
4. **Performance**: Respone times, no lag
5. **Console**: No errors, warnings, or unexpected logs

---

## My Testing Checklist (Before Declaring Code "Done")

- [ ] **TypeScript**: `yarn test:typecheck` passes (0 errors)
- [ ] **Linting**: `yarn fix` makes no changes (code already clean)
- [ ] **Unit tests**: Written for new functions, test key flows
- [ ] **Manual test - Happy path**:
  - Click button
  - Interact with feature
  - Verify expected behavior
- [ ] **Manual test - Edge cases**:
  - Try to break it
  - Test error conditions
  - Check console for errors
- [ ] **Browser console**: No errors, no warnings
- [ ] **Cross-browser**: Test in Chrome/Firefox if different engines matter
- [ ] **Code review**: Visually inspect for logic errors, security issues

---

## Specific to This Feature

Before you test, **I will have verified:**

1. ✅ TypeScript types are correct
2. ✅ ESLint passes (no warnings)
3. ✅ Browser/Node.js environment boundaries respected
4. ✅ Fractional indices properly generated (not just `null`)
5. ✅ Process globals checked before use
6. ✅ API response shapes are correct
7. ✅ Error cases handled

**Then you test:**

- Does the UI work as expected?
- Does clicking buttons do what they should?
- Do errors appear in console?
- Does it break under edge cases?

---

## For Future Features

When I implement a new feature, I will:

1. **Write tests first** (or alongside code)
2. **Run static analysis** before saying "done"
3. **Document the testing checklist** for manual verification
4. **Ask you to test** and report back
5. **Fix any issues** that manual testing reveals

This prevents the situation where I confidently hand you code that breaks at runtime.

---

## Questions I Should Ask

Before starting implementation:

- "Should I write unit tests for this?"
- "What are the edge cases we should test?"
- "What should this look like when complete?" (clarify requirements)
- "When you test, what would break the feature?"

---

## Current Status

The AI Agent feature needs:

```bash
# You test with this checklist:
1. yarn start
2. Follow AI_AGENT_TESTING.md
3. Report back: "These tests passed, these failed"
```

Once you verify all tests pass, the feature is complete.
