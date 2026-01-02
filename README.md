# 🚀 Project Nexus

> **The Ultimate MCP Registry & Execution Engine** - Connect, discover, and execute Model Context Protocol tools with Google Workspace integration

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## ✨ What is Project Nexus?

Project Nexus is a **next-generation platform** that brings together:
- 🔍 **Semantic Search** - Find MCP tools using AI-powered vector search
- 🧪 **Code Sandbox** - Execute Python code with integrated MCP tool access
- ✨ **Code Wizard** - Form-based interface to generate Python code without writing it manually
- 🔗 **Google Workspace Integration** - Connect Gmail, Calendar, and Drive seamlessly
- 🔐 **OAuth 2.1** - Secure multi-account authentication with incremental scopes
- 🎯 **MCP Server Management** - Provision, monitor, and manage MCP servers dynamically

### 🎨 Features

- **Smart Tool Discovery** - Vector embeddings for semantic tool search
- **Code Wizard** - Visual form builder that generates Python code from tool schemas (no coding required!)
- **Python SDK** - Write code that interacts with Google Workspace via MCP
- **Multi-Account Support** - Link work and personal Google accounts
- **Incremental Permissions** - Request only the scopes you need, when you need them
- **Real-time Execution** - Watch your code run with live telemetry
- **Modern UI** - Beautiful, responsive interface built with Next.js and Tailwind

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (Frontend/API)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Supabase│ │ MCP    │
│Database│ │Servers │
└────────┘ └────────┘
    │
┌───▼──────────┐
│ Python       │
│ Sandbox      │
│ (nexus_sdk)  │
└──────────────┘
```

---

## 🚦 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm/yarn)
- **Python** 3.8+ (for sandbox execution)
- **Supabase** account (for database)
- **Google Cloud** project (for OAuth)

### 1️⃣ Clone & Install

```bash
# Clone the repo
git clone <your-repo-url>
cd project-nexus

# Install dependencies
pnpm install

# Or with npm
npm install
```

### 2️⃣ Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#-environment-variables) section for details.

### 3️⃣ Database Setup

Run the SQL migration scripts in order:

```bash
# Connect to your Supabase database and run:
psql <your-supabase-connection-string> -f scripts/001_enable_pgvector.sql
psql <your-supabase-connection-string> -f scripts/002_create_mcp_tables.sql
psql <your-supabase-connection-string> -f scripts/003_seed_sample_data.sql
psql <your-supabase-connection-string> -f scripts/004_create_rls_policies.sql
psql <your-supabase-connection-string> -f scripts/005_create_search_function.sql
psql <your-supabase-connection-string> -f scripts/006_google_workspace_schema.sql
psql <your-supabase-connection-string> -f scripts/007_add_mcp_server_logos.sql
psql <your-supabase-connection-string> -f scripts/008_add_new_mcp_servers.sql
```

Or use the Supabase SQL Editor to run them one by one.

### 4️⃣ Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxxxx` |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | `a1b2c3d4...` (64 chars) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `http://localhost:3000` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `${NEXT_PUBLIC_APP_URL}/api/oauth/google/callback` |

### 🔐 Generating Encryption Key

Generate a secure 32-byte encryption key:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 📚 Usage Guide

### 🔌 Connecting Google Workspace

1. **Click "Connect Google Account"** in the UI
2. **Authorize** in the popup window
3. **Select account** from the account switcher
4. **Start coding!** Use the Python SDK in the sandbox

### 💻 Using the Python SDK

```python
from nexus_sdk import google

# Search Google Drive
files = google.drive.search("Project Nexus Specs")
print(f"Found {len(files)} files")

# List calendar events
events = google.calendar.list_events(
    start_date="2024-01-01",
    end_date="2024-12-31"
)
for event in events:
    print(f"Event: {event['summary']}")

# Send an email
google.gmail.send(
    to="team@example.com",
    subject="Project Update",
    body="Here's the latest update on Project Nexus!"
)
```

### 🔍 Searching Tools

Use the semantic search to find MCP tools:

```typescript
// The UI handles this, but here's the API:
POST /api/search
{
  "query": "search for files",
  "embedding": [0.1, 0.2, ...] // Optional vector embedding
}
```

### 🧪 Executing Code

#### Using the Code Wizard (Recommended for Beginners)

1. **Select a tool** from the left panel
2. **Switch to "Wizard" mode** in the Python Sandbox
3. **Fill out the form** with the tool's parameters
4. **Click "Generate & Run Code"** - Python code is generated automatically!
5. **Switch to "Code" mode** to view or edit the generated code
6. **Execute** your code

The wizard makes it easy to use MCP tools without writing Python code manually.

#### Writing Code Manually

Write Python code in the terminal view and execute:

```python
# Your code runs in a sandbox with nexus_sdk available
from nexus_sdk import google

result = google.drive.list_files(max_results=10)
print(result)
```

---

## 🏛️ Project Structure

```
project-nexus/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── oauth/        # OAuth endpoints
│   │   ├── mcp/          # MCP server management
│   │   ├── sandbox/       # Code execution
│   │   └── search/       # Semantic search
│   ├── oauth/             # OAuth callback pages
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── code-wizard.tsx   # Code wizard form builder
│   ├── terminal-view.tsx # Python sandbox UI
│   ├── google-oauth-button.tsx
│   ├── account-switcher.tsx
│   └── ...
├── lib/                   # Core libraries
│   ├── oauth/            # OAuth utilities
│   ├── mcp/              # MCP runtime
│   └── supabase/          # Supabase clients
├── scripts/               # SQL migrations & Python
│   ├── nexus_sdk/        # Python SDK
│   └── *.sql             # Database migrations
└── public/                # Static assets
```

---

## 🔒 Security

- ✅ **Encrypted Tokens** - All OAuth tokens encrypted at rest (AES-256-GCM)
- ✅ **Row Level Security** - Supabase RLS policies protect user data
- ✅ **Incremental Scopes** - Request minimal permissions, upgrade as needed
- ✅ **Secure State** - OAuth state tokens prevent CSRF attacks
- ✅ **HTTPS Only** - OAuth callbacks require HTTPS in production

### 🛡️ Best Practices

1. **Never commit** `.env.local` or `.env` files
2. **Rotate** `ENCRYPTION_KEY` periodically
3. **Use** environment-specific OAuth credentials
4. **Enable** Supabase RLS on all tables
5. **Monitor** MCP server instances for security

---

## 🧪 Development

### Running Tests

```bash
# Lint code
pnpm lint

# Type check
pnpm type-check  # Add to package.json if needed
```

### Database Migrations

When adding new features:

1. Create migration file: `scripts/XXX_feature_name.sql`
2. Update RLS policies if needed
3. Test locally first
4. Apply to production

### Adding New MCP Servers

1. Insert server record in `mcp_servers` table
2. Register tools in `mcp_tools` table
3. Generate embeddings for semantic search
4. Test provisioning via `/api/mcp/provision`

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Import** project in Vercel
3. **Add** environment variables in Vercel dashboard
4. **Deploy** 🎉

### Environment Variables in Vercel

Add all required variables in:
**Settings → Environment Variables**

Make sure to set:
- `NEXT_PUBLIC_APP_URL` to your production domain
- `GOOGLE_REDIRECT_URI` to match your domain

---

## 🤝 Contributing

We love contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📖 API Reference

### OAuth Endpoints

- `POST /api/oauth/google/initiate` - Start OAuth flow
- `GET /api/oauth/google/callback` - OAuth callback handler
- `POST /api/oauth/google/upgrade-scope` - Request additional scopes
- `GET /api/oauth/accounts` - List connected accounts
- `PATCH /api/oauth/accounts` - Update account settings
- `DELETE /api/oauth/accounts?account_id=xxx` - Remove account

### MCP Endpoints

- `GET /api/mcp/instances` - List server instances
- `POST /api/mcp/call` - Execute MCP tool
- `POST /api/mcp/provision` - Provision new server instance

### Sandbox Endpoints

- `POST /api/sandbox/execute` - Execute Python code
- `GET /api/sandbox/[id]` - Get execution result

---

## 🐛 Troubleshooting

### OAuth Issues

**Problem**: "Failed to initiate OAuth"
- ✅ Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- ✅ Verify redirect URI matches Google Cloud Console
- ✅ Ensure callback URL is accessible

### Database Issues

**Problem**: "RLS policy violation"
- ✅ Check user is authenticated
- ✅ Verify RLS policies are enabled
- ✅ Test with Supabase SQL Editor

### MCP Server Issues

**Problem**: "Instance not running"
- ✅ Check server provisioning logs
- ✅ Verify OAuth tokens are valid
- ✅ Check process is running: `ps aux | grep mcp`

---

## 📝 License

MIT License - feel free to use this project for your own purposes!

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Database powered by [Supabase](https://supabase.com)
- MCP servers from the [Model Context Protocol](https://modelcontextprotocol.io) ecosystem

---

<div align="center">

**Made with ❤️ by the Project Nexus team**

[⭐ Star us on GitHub](https://github.com) · [📖 Documentation](https://github.com) · [🐛 Report Bug](https://github.com)

</div>
