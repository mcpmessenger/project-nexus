# Bug Report: Persistent "Transport not available" Error (HTTP 503)

## Issue Summary
After provisioning MCP server instances, users are experiencing persistent "Transport not available" errors (HTTP 503) when attempting to execute code that calls MCP tools. The error indicates a state synchronization problem between the database (which shows instances as "running") and the in-memory runtime (which doesn't have the transport connections).

## Severity
**High** - Blocks core functionality: users cannot execute code that uses MCP tools, even after provisioning servers.

## Current Status
**PERSISTENT** - Error continues to occur despite multiple attempts to provision servers.

## Symptoms

### Primary Error
```
MCPCallError: Failed to call MCP tool: Transport not available
HTTP Error 503: Service Unavailable
```

### Error Location
- **API Endpoint**: `POST /api/mcp/call`
- **File**: `app/api/mcp/call/route.ts:102-103`
- **Code Path**: 
  ```typescript
  const transport = mcpRuntime.getTransport(instance.user_id, instance.server_id, instance.account_id)
  if (!transport || !transport.isConnected()) {
    return NextResponse.json({ error: "Transport not available" }, { status: 503 })
  }
  ```

### Observable Symptoms
1. **Execution History**: All 14 execution attempts failed (0 succeeded)
2. **Average Execution Time**: ~349ms (fails quickly, indicating immediate transport check failure)
3. **Console Logs**: `[ToolBrowser] Processed instances map: (2) [{-}, {-}]` shows empty instance objects
4. **Database State**: Instance records exist with `status = "running"` in `mcp_server_instances` table
5. **Runtime State**: No transport connections exist in `mcpRuntime.instances` Map

## Expected Behavior
1. User provisions a server instance via "Provision server" button
2. Server process starts successfully
3. Transport connection is established and stored in `mcpRuntime.instances`
4. Database status updates to "running"
5. Code execution succeeds when calling MCP tools
6. Transport remains available until explicitly stopped

## Actual Behavior
1. User provisions a server instance ✅ (button works, API returns success)
2. Database status updates to "running" ✅ (verified in database)
3. **Transport connection is NOT established or is lost immediately** ❌
4. Code execution fails with "Transport not available" ❌
5. Error persists even after re-provisioning ❌

## Root Cause Analysis

### Core Problem
**State Synchronization Mismatch**: The database persistence layer (`mcp_server_instances` table) and the in-memory runtime layer (`MCPServerRuntime.instances` Map) are not synchronized.

### Technical Details

#### Architecture Context
- **Database Layer**: Supabase `mcp_server_instances` table stores instance metadata and status
- **Runtime Layer**: `MCPServerRuntime` class (singleton) maintains in-memory `Map<string, MCPTransport>` of active transports
- **Transport**: `StdioTransport` or `HttpTransport` wrapping child processes or HTTP connections

#### Transport Lifecycle
1. **Creation**: `mcpRuntime.startInstance()` creates transport and stores in `this.instances` Map
2. **Key Format**: `${userId}:${serverId}:${accountId ?? 'null'}`
3. **Lookup**: `mcpRuntime.getTransport()` retrieves from Map using same key format
4. **Deletion**: Transport removed from Map when:
   - `stopInstance()` is called
   - Process crashes/exits
   - Next.js dev server restarts (in-memory state lost)

#### Failure Scenarios

**Scenario A: Dev Server Restart (Most Likely)**
- User provisions server → Transport created in memory
- Next.js dev server auto-restarts (Fast Refresh, code changes, etc.)
- In-memory `MCPServerRuntime` instance recreated → `instances` Map is empty
- Database still shows `status = "running"`
- Subsequent MCP calls fail: database says "running" but transport doesn't exist

**Scenario B: Process Crash**
- Server process starts successfully
- Process crashes before transport can be used
- Transport removed from Map (via process exit handler)
- Database status not updated (no health check)
- Database shows "running" but transport is gone

**Scenario C: Provision Failure (Silent)**
- Provision API returns success
- But `startInstance()` fails or transport creation fails
- Database updated to "running" but transport never added to Map
- State inconsistency from the start

**Scenario D: Multiple Instances / Key Mismatch**
- Instance created with different `account_id` (null vs actual ID)
- Lookup uses different key than storage key
- Transport exists but can't be found

## What Has Been Tried

### 1. UI Synchronization Fixes ✅
- **Issue**: Stop button UI not updating after server stop
- **Fix Applied**: 
  - Optimistic UI updates in `components/tool-browser.tsx`
  - Supabase Realtime subscriptions for instance status changes
  - Improved `fetchInstances()` logic to handle status transitions
- **Result**: UI updates correctly now, but underlying transport issue persists

### 2. Service Role Client for Database Updates ✅
- **Issue**: RLS policies blocking server-side status updates
- **Fix Applied**: `createServiceRoleClient()` used in `updateInstanceStatus()`
- **Result**: Database updates work correctly, but doesn't solve transport persistence

### 3. Enhanced Process Termination ✅
- **Issue**: Processes not stopping cleanly
- **Fix Applied**: 
  - Improved `StdioTransport.close()` with SIGTERM/SIGKILL handling
  - Direct PID kill in DELETE endpoint (`taskkill` on Windows, `kill -9` on Unix)
- **Result**: Processes stop correctly, but doesn't prevent transport loss

### 4. Realtime Subscriptions ✅
- **Issue**: UI not syncing with database changes
- **Fix Applied**: Supabase Realtime subscription in `ToolBrowser` component
- **Result**: UI stays in sync, but transport availability issue remains

### 5. Instance Status Verification ✅
- **Verification**: Database queries confirm instances exist with `status = "running"`
- **Result**: Database state is correct, problem is in runtime layer

### 6. Manual Provision Attempts ❌
- **Action**: Multiple attempts to provision servers via UI
- **Result**: Error persists, suggesting transport is not being created or is immediately lost

## Evidence

### Console Logs
```
[ToolBrowser] Processed instances map: (2) [{-}, {-}]
```
- Empty instance objects suggest instances exist in database but data isn't being properly loaded/displayed

### Error Stack Trace
```
urllib.error.HTTPError: HTTP Error 503: Service Unavailable
File "scripts/nexus_sdk/mcp.py", line 116, in call
```
- Python SDK receives 503 from `/api/mcp/call` endpoint
- Confirms transport lookup fails on server-side

### Execution Statistics
- **Total Executions**: 14
- **Successful**: 0
- **Failed**: 14
- **Average Time**: 349ms (quick failure, immediate transport check)

## Proposed Solutions

### Solution 1: Health Check & Auto-Recovery (Recommended)
**Description**: Implement periodic health checks that detect when database says "running" but transport is missing, then automatically re-provision or update status.

**Implementation**:
- Add health check endpoint that compares database state vs runtime state
- Background job (or on-demand) to reconcile mismatches
- Either: re-provision instance, or update database status to "stopped"

**Pros**: 
- Handles all failure scenarios automatically
- Self-healing system

**Cons**:
- Adds complexity
- Requires background job infrastructure

### Solution 2: Persistent Transport Registry
**Description**: Store transport metadata in database (process ID, start time) and verify process exists before returning transport.

**Implementation**:
- Store `process_id` in database (already exists)
- Before returning transport, verify process is still running (`process.kill(0)` or platform-specific check)
- If process dead but database says "running", update status and return error

**Pros**:
- More robust than in-memory only
- Can detect process crashes

**Cons**:
- Doesn't solve dev server restart issue
- Process verification adds latency

### Solution 3: Lazy Re-provisioning
**Description**: When transport is missing but database says "running", automatically attempt to re-start the instance.

**Implementation**:
- In `getTransport()`, if transport missing but database status is "running", attempt `startInstance()` again
- Use stored configuration from database to re-create transport

**Pros**:
- Seamless recovery
- No user action required

**Cons**:
- Re-provisioning may fail (same underlying issue)
- Could mask root cause

### Solution 4: Status Verification Before Transport Lookup
**Description**: Add explicit status verification in `/api/mcp/call` that checks if process is actually running.

**Implementation**:
- Query `process_id` from database
- Check if process exists using platform-specific method
- If process doesn't exist, update database status and return error
- Only then check transport

**Pros**:
- Catches process crashes immediately
- Updates database state accurately

**Cons**:
- Doesn't prevent the issue, only detects it
- Adds latency to every MCP call

### Solution 5: Development Mode: Auto-Provision on Startup (Quick Fix)
**Description**: In development mode, detect when dev server restarts and auto-provision all "running" instances.

**Implementation**:
- On Next.js server startup, query database for all "running" instances for current user
- Attempt to re-provision each one
- Log failures but don't block startup

**Pros**:
- Solves dev server restart scenario
- Quick to implement

**Cons**:
- Development-only solution
- Doesn't solve production issues

## Recommended Approach

**Combination of Solutions 2 + 4**:
1. **Process Verification**: Before returning transport, verify process exists (Solution 2)
2. **Status Reconciliation**: If process dead, update database status (Solution 4)
3. **User Feedback**: Provide clear error message: "Server instance stopped. Please re-provision."
4. **Future Enhancement**: Add Solution 1 (health check) for production robustness

## Next Steps

1. **Immediate**: Implement process verification in `getTransport()` or `/api/mcp/call`
2. **Short-term**: Add status reconciliation when process verification fails
3. **Medium-term**: Implement health check system for automatic recovery
4. **Long-term**: Consider persistent transport registry or process manager

## Files Involved

- `lib/mcp/runtime.ts` - `MCPServerRuntime` class, transport management
- `app/api/mcp/call/route.ts` - MCP call endpoint, transport lookup
- `app/api/mcp/provision/route.ts` - Provision endpoint, transport creation
- `lib/mcp/transport.ts` - `StdioTransport`, process management
- `components/tool-browser.tsx` - UI for provisioning, instance status display

## Environment

- **OS**: Windows 10.0.26100
- **Runtime**: Node.js (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Python**: Python 3.14 (via `py` command)
- **Development Mode**: Yes (Next.js dev server)

## Related Issues

- `BUG_REPORT_STOP_BUTTON_UI_UPDATE.md` - Related UI synchronization issue (RESOLVED)
- Previous bug: Service role key loading (RESOLVED)

## Additional Notes

- User reports error persists after multiple provision attempts
- Console shows empty instance map: `[{-}, {-}]` - needs investigation
- All 14 execution attempts failed, suggesting systematic issue
- Error occurs immediately (349ms avg), indicating transport check fails before any actual work
