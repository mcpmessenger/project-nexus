# Project Nexus: Development Instructions and Bug Fix Documentation

**Author**: Manus AI
**Date**: Jan 03, 2026
**Status**: ⚠️ **PROPOSED SOLUTION** - This document describes a proposed fix that has NOT yet been implemented.

## I. Introduction

This document provides a summary of the critical bug that needs to be addressed in the Project Nexus repository and outlines the necessary development instructions for setting up and running the project. The primary bug is a persistent "Transport not available" error (HTTP 503) that occurs when attempting to call Model Context Protocol (MCP) tools, particularly after a Next.js development server restart.

**Current Status**: The bug is documented in `BUG_REPORT_TRANSPORT_NOT_AVAILABLE.md` and is **PERSISTENT**. The solution described below is a **PROPOSED IMPLEMENTATION** (Solution 3: Lazy Re-provisioning) that has not yet been implemented.

## II. Proposed Bug Fix: Transport Auto-Recovery Implementation

The root cause of the issue is a **state synchronization mismatch** between the database, which correctly records MCP server instances as `"running"`, and the in-memory runtime, which loses the active transport connections upon a server restart (Scenario A: Dev Server Restart) or process crash (Scenario B: Process Crash).

To resolve this, a **Lazy Re-provisioning** or **Transport Auto-Recovery** mechanism has been proposed. This solution would ensure that if an MCP call is made to an instance marked as `"running"` in the database but the in-memory transport is missing, the system would automatically attempt to re-start the instance using its stored configuration.

### A. Proposed Changes

The fix would involve modifications to the following core files (NOT YET IMPLEMENTED):

| File | Change Description |
| :--- | :--- |
| `lib/mcp/runtime.ts` | Added `getTransportWithRecovery` method. This method first checks the in-memory map. If the transport is missing but the database status is `"running"`, it uses the stored instance configuration (including server details and environment variables) to re-call `startInstance()`, effectively re-provisioning the transport and re-populating the in-memory map. |
| `app/api/mcp/call/route.ts` | Updated the MCP call API endpoint to use the new `mcpRuntime.getTransportWithRecovery` instead of the original `mcpRuntime.getTransport`. This ensures that every MCP tool call benefits from the auto-recovery logic. |
| `components/tool-browser.tsx` | Added a check to skip invalid instances in `fetchInstances()` to prevent the console log error `[ToolBrowser] Processed instances map: (2) [{-}, {-}]` which was a symptom of data structure issues when processing the raw API response. |

### B. Expected Behavior After Implementation

The proposed solution would address the core problem by making the runtime state resilient to transient failures like development server restarts. When a call is made, the system would:
1. Checks for an active transport in memory.
2. If missing, queries the database for the instance status.
3. If the database status is `"running"`, it automatically re-provisions the instance, re-establishing the transport connection.
4. The MCP call then proceeds successfully.
5. If re-provisioning fails, the database status is updated to `"stopped"`, preventing future failed attempts.

## III. Development Setup Instructions

To set up and run Project Nexus locally, follow these steps.

### A. Prerequisites

The project is a Next.js application using TypeScript and Supabase for the backend.

*   **Node.js**: Version 18 or higher.
*   **pnpm**: The package manager used for this project.
*   **Supabase Account**: Required for database, authentication, and storage.

### B. Project Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/mcpmessenger/project-nexus.git
    cd project-nexus
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables**
    Create a file named `.env.local` in the root directory and populate it with your Supabase credentials.

    | Variable | Description | Source |
    | :--- | :--- | :--- |
    | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. | Supabase Dashboard > Settings > API |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase public anon key. | Supabase Dashboard > Settings > API |
    | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (required for server-side operations bypassing RLS). | Supabase Dashboard > Settings > API |
    | `NEXT_PUBLIC_BASE_URL` | The local URL where the app runs (e.g., `http://localhost:3000`). | Local Setup |

4.  **Run Database Migrations**
    The project uses a set of SQL scripts for database schema and initial data. You must run these scripts in your Supabase SQL Editor.

    *   Navigate to your Supabase Dashboard > SQL Editor.
    *   Execute the scripts found in the `scripts/` directory in sequential order (e.g., `001_enable_pgvector.sql`, `002_create_mcp_tables.sql`, etc.).
    *   Alternatively, you can use the `scripts/COMPLETE_SETUP.sql` file for a full setup.

5.  **Start the Development Server**
    ```bash
    pnpm dev
    ```
    The application will start at the address specified in `NEXT_PUBLIC_BASE_URL` (default: `http://localhost:3000`).

### C. Testing After Implementation

Once the fix is implemented, the following test procedure can be used:

1.  **Provision a Server**: Navigate to the tool browser and provision any available MCP server.
2.  **Verify Status**: The server should show as `"running"`.
3.  **Restart Dev Server**: Stop the `pnpm dev` process and restart it. This simulates the state loss.
4.  **Execute Tool**: Attempt to execute a tool from the provisioned server.
5.  **Expected Result**: The tool execution should succeed. The console logs should show a message indicating that the transport was missing and the system performed an auto-recovery, followed by the successful MCP call.

## IV. Implementation Notes

**Current Implementation Status**: ❌ **NOT IMPLEMENTED**

The Transport Auto-Recovery mechanism described above has not yet been implemented. The bug remains persistent. 

**Alternative Approaches**: 
- A simpler approach (Solution 4 from the bug report) would be to add process verification before transport lookup, which would detect the issue and provide clear error messages without attempting automatic recovery.
- Full auto-recovery is complex because it requires reconstructing the full server configuration (command, args, environment variables, OAuth tokens) from the database.

**Related Documentation**: See `BUG_REPORT_TRANSPORT_NOT_AVAILABLE.md` for detailed analysis, evidence, and multiple proposed solutions.

## V. Conclusion

Once implemented, the Transport Auto-Recovery mechanism would significantly improve the resilience and reliability of the MCP server runtime, resolving the critical "Transport not available" bug. The provided development instructions ensure a smooth setup process for all developers contributing to Project Nexus.

---
**References**
[1] Project Nexus Repository: https://github.com/mcpmessenger/project-nexus
[2] Supabase Documentation: https://supabase.com/docs
