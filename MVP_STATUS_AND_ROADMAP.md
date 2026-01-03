# Project Nexus - Current State & MVP Roadmap

**Last Updated:** January 2025

## 📊 Current State Assessment

### ✅ What's Working

1. **Database & Schema**
   - ✅ Supabase database configured
   - ✅ All tables created (mcp_servers, mcp_tools, sandbox_executions, oauth_accounts, etc.)
   - ✅ Row Level Security (RLS) policies in place
   - ✅ Vector search function for semantic search
   - ✅ Logo URLs column added to mcp_servers

2. **Frontend UI**
   - ✅ Modern, responsive interface built with Next.js + Tailwind
   - ✅ Tool browser with search functionality
   - ✅ Code wizard form generator
   - ✅ Terminal/code editor view
   - ✅ Server logo display component
   - ✅ Execution history panel (with collapse/minimize controls)
   - ✅ Real-time updates via Supabase subscriptions

3. **Backend API**
   - ✅ `/api/servers` - List MCP servers
   - ✅ `/api/tools` - List MCP tools
   - ✅ `/api/search` - Semantic search for tools
   - ✅ `/api/sandbox/execute` - Execute Python code
   - ✅ `/api/mcp/call` - Call MCP tools
   - ✅ `/api/mcp/provision` - Provision MCP server instances
   - ✅ `/api/oauth/*` - Google OAuth flow

4. **Python Sandbox**
   - ✅ Python code execution via subprocess
   - ✅ Nexus SDK integration (MCP and Google SDK)
   - ✅ Environment variable passing (NEXUS_API_URL, NEXUS_SERVER_INSTANCE_ID)
   - ✅ Output capture (stdout, stderr, return_value)
   - ✅ Error handling and JSON serialization

5. **Code Generation**
   - ✅ Code wizard generates Python code with `mcp.call()`
   - ✅ Form fields generated from JSON schema
   - ✅ Tool input validation

### ⚠️ What's Partially Working

1. **MCP Tool Execution**
   - ⚠️ Code generation works but requires server_instance_id
   - ⚠️ MCP servers need to be provisioned before tool calls work
   - ⚠️ JSON serialization errors fixed but needs testing
   - ⚠️ Server instance lookup needs account_id (currently optional)

2. **Server Logos**
   - ⚠️ Logo files exist locally
   - ⚠️ Database has logo_url column
   - ⚠️ Seeding script created but needs verification on production
   - ⚠️ Logo display component works but needs deployed files

3. **OAuth/Google Workspace**
   - ⚠️ OAuth flow implemented but needs Google Cloud setup
   - ⚠️ Token encryption works
   - ⚠️ Multi-account support ready but not tested end-to-end

### ❌ What's Not Working / Missing

1. **Actual Tool Execution**
   - ❌ MCP servers not provisioned/started
   - ❌ No server_instance_id available in sandbox context
   - ❌ Tool calls fail because no active server instances
   - ❌ Code shows "simulated" because real execution path isn't complete

2. **API Keys & Configuration**
   - ❌ Brave Search API key not configured
   - ❌ Google Maps API key not configured (for maps-grounding-lite)
   - ❌ Other MCP servers may need API keys
   - ❌ No UI for API key management

3. **Server Provisioning Flow**
   - ❌ No UI for provisioning servers
   - ❌ No server instance status monitoring UI
   - ❌ No way to start/stop servers from UI
   - ❌ Account linking required but no clear flow

4. **Error Handling**
   - ❌ Generic error messages
   - ❌ No clear error messages when servers aren't provisioned
   - ❌ No validation feedback for missing API keys

---

## 🔑 API Keys & Authentication Requirements

### Required API Keys by Server

1. **brave-search**
   - **API Key Required:** ✅ Yes
   - **Where to get:** https://brave.com/search/api/
   - **How to configure:** Set `BRAVE_API_KEY` environment variable
   - **Status:** ❌ Not configured

2. **maps-grounding-lite**
   - **API Key Required:** ✅ Yes (Google Maps API)
   - **Where to get:** https://console.cloud.google.com/apis/credentials
   - **How to configure:** Set `GOOGLE_MAPS_API_KEY` environment variable
   - **Status:** ❌ Not configured

3. **puppeteer**
   - **API Key Required:** ❌ No
   - **Status:** ✅ Ready (no API key needed)

4. **filesystem**
   - **API Key Required:** ❌ No
   - **Status:** ✅ Ready (no API key needed)

5. **postgres**
   - **API Key Required:** ❌ No (uses database connection)
   - **Status:** ⚠️ Needs database connection string

6. **langchain-mcp**
   - **API Key Required:** ⚠️ Depends on tools used
   - **Status:** ⚠️ Unknown

7. **google-workspace-mcp**
   - **API Key Required:** ❌ No (uses OAuth tokens)
   - **Status:** ⚠️ Needs OAuth setup

### Why "Simulated"?

The code you see shows "# Simulated tool execution" because:

1. **Example Code:** The editor shows example/demo code, not actual generated code
2. **Real Code Exists:** The code wizard DOES generate real code with `mcp.call()`
3. **Missing Pieces:** Even with real code, tools won't work until:
   - MCP server is provisioned (server instance created and started)
   - Server instance ID is passed to sandbox
   - API keys are configured (for servers that need them)
   - Server is actually running and connected

---

## 🎯 MVP Roadmap: Path to Working System

### Phase 1: Fix Current Issues (Priority: HIGH) 🔴

#### 1.1 Fix Tool Execution Flow
**Goal:** Make tool calls actually work

**Tasks:**
- [ ] Fix server_instance_id lookup - ensure it's passed to sandbox
- [ ] Add error handling when server_instance_id is missing
- [ ] Create UI feedback when servers aren't provisioned
- [ ] Test end-to-end tool execution with a simple server (filesystem or puppeteer)

**Estimated Time:** 2-3 hours

#### 1.2 Add API Key Configuration
**Goal:** Allow users to configure API keys

**Tasks:**
- [ ] Create API key management UI (Settings page)
- [ ] Store API keys securely (encrypted in database or environment variables)
- [ ] Pass API keys to MCP servers via environment variables
- [ ] Add validation for required API keys

**Estimated Time:** 3-4 hours

#### 1.3 Server Provisioning UI
**Goal:** Make it easy to provision and start servers

**Tasks:**
- [ ] Create "Servers" page/tab in UI
- [ ] Show server status (available, provisioned, running, stopped)
- [ ] Add "Provision" button for each server
- [ ] Add "Start/Stop" controls for provisioned servers
- [ ] Show server instance status (running, stopped, error)
- [ ] Handle account linking for OAuth-based servers

**Estimated Time:** 4-5 hours

### Phase 2: Essential Features (Priority: MEDIUM) 🟡

#### 2.1 Improve Error Messages
**Goal:** Better user experience when things fail

**Tasks:**
- [ ] Add specific error messages for missing API keys
- [ ] Add error messages for unprovisioned servers
- [ ] Add error messages for stopped servers
- [ ] Show helpful troubleshooting hints

**Estimated Time:** 2 hours

#### 2.2 Complete Logo Deployment
**Goal:** All server logos visible

**Tasks:**
- [ ] Verify logo files are deployed to production
- [ ] Fix any missing logo URLs in database
- [ ] Test logo display on deployed site

**Estimated Time:** 1 hour

#### 2.3 OAuth Flow Completion
**Goal:** Google Workspace servers work

**Tasks:**
- [ ] Complete Google OAuth setup
- [ ] Test account linking
- [ ] Test token refresh
- [ ] Test Google Workspace tool calls

**Estimated Time:** 3-4 hours

### Phase 3: Polish & UX (Priority: LOW) 🟢

#### 3.1 Better Code Examples
**Goal:** Remove "simulated" examples, show real working code

**Tasks:**
- [ ] Update example code in editor
- [ ] Add working code templates
- [ ] Add code snippets for common patterns

**Estimated Time:** 1-2 hours

#### 3.2 Enhanced Execution View
**Goal:** Better visualization of tool execution

**Tasks:**
- [ ] Show tool execution progress
- [ ] Display tool input/output more clearly
- [ ] Add execution timeline
- [ ] Better error display

**Estimated Time:** 2-3 hours

#### 3.3 Documentation
**Goal:** Help users understand the system

**Tasks:**
- [ ] Add tooltips and help text
- [ ] Create user guide
- [ ] Add inline documentation
- [ ] Video tutorials

**Estimated Time:** 4-5 hours

---

## 🚀 Quick Wins (Can Do Now)

### 1. Remove "Simulated" Example Code
**Time:** 15 minutes
- Update code editor placeholder/default text
- Remove "# Simulated tool execution" comment

### 2. Add API Key Check Error
**Time:** 30 minutes
- Add validation in tool execution
- Show clear error: "API key required for [server]. Configure it in Settings."

### 3. Add Server Status Indicator
**Time:** 1 hour
- Show server status in tool browser
- Add badge: "Available", "Provisioned", "Running"

### 4. Fix Logo Display
**Time:** 30 minutes
- Verify database has logo URLs
- Push logo files to production
- Test logo display

---

## 📋 Immediate Action Items

### For Working MVP:

1. **Fix Server Instance ID Passing** (CRITICAL)
   - Ensure `server_instance_id` is passed from frontend to sandbox
   - Ensure sandbox can initialize MCP SDK with server_instance_id
   - Test with a simple server (filesystem)

2. **Add Server Provisioning UI** (CRITICAL)
   - Create simple UI to provision a server
   - Test end-to-end: provision → start → execute tool

3. **Add API Key Configuration** (IMPORTANT)
   - At minimum, document how to set environment variables
   - Better: Add Settings UI for API keys

4. **Test One Complete Flow** (VALIDATION)
   - Choose simplest server (filesystem or puppeteer)
   - Provision it
   - Execute a tool
   - Verify results

---

## 🔧 Technical Debt & Issues

### Known Issues:
1. JSON serialization errors (mostly fixed but needs testing)
2. Server instance lookup doesn't handle account_id properly
3. No clear error messages for missing pieces
4. Logo files may not be deployed to production

### Architecture Improvements Needed:
1. Better separation of concerns for server provisioning
2. Centralized configuration management
3. Better error handling and recovery
4. Logging and monitoring

---

## 📝 Success Criteria for MVP

A working MVP should allow a user to:

1. ✅ Browse available tools
2. ✅ Select a tool (e.g., filesystem read_file)
3. ✅ Use code wizard to generate code
4. ✅ Execute the code successfully
5. ✅ See tool results in the UI
6. ✅ View execution history

**Current Status:** ❌ Steps 4-5 don't work yet (tool execution fails)

---

## 🎯 Recommended Next Steps (Priority Order)

1. **Week 1: Core Functionality**
   - Fix server_instance_id passing
   - Create minimal server provisioning UI
   - Test one complete tool execution flow

2. **Week 2: Essential Features**
   - Add API key configuration
   - Complete OAuth flow for Google servers
   - Improve error handling

3. **Week 3: Polish**
   - Fix remaining UI issues
   - Deploy logos
   - Documentation

---

## 💡 Key Insights

1. **The "simulated" code is just example text** - Real code generation works but can't execute because servers aren't provisioned

2. **API keys are needed** but not all servers require them:
   - Brave Search: ✅ Needs API key
   - Google Maps: ✅ Needs API key  
   - Filesystem: ❌ No API key
   - Puppeteer: ❌ No API key
   - Google Workspace: ❌ Uses OAuth (no API key)

3. **The biggest blocker:** Server provisioning and instance management needs a UI

4. **Quick path to MVP:** Focus on filesystem or puppeteer server first (no API keys needed), get that working end-to-end, then add others

---

## 📞 Questions to Answer

1. Do you want to focus on a specific server first (recommend: filesystem or puppeteer)?
2. Should API keys be stored in database or environment variables?
3. Do you want a full server management UI or just "provision and go"?
4. What's the priority: Getting something working quickly or building a complete system?

---

*This document should be updated as progress is made and priorities shift.*
