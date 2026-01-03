# Quick Fix Guide - "Failed to update execution" Error

## Main Issue: Python Not Installed

Your code execution is failing because **Python is not installed** or not in your system PATH.

## Solution Steps

### 1. Install Python

1. Download Python from: https://www.python.org/downloads/
2. **Important:** During installation, check the box "Add Python to PATH"
3. Complete the installation
4. **Restart your terminal/command prompt** (or restart your computer)

### 2. Verify Installation

Open a new terminal and run:
```powershell
python --version
```

You should see: `Python 3.11.x` or `Python 3.12.x`

### 3. Restart Your Dev Server

1. Stop your current `npm run dev` (press Ctrl+C)
2. Start it again: `npm run dev`
3. Try running your code again in the browser

## Optional: Fix "Failed to load secrets" Error

This error is harmless (the app works without it), but if you want to store API keys:

1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Run the contents of `scripts/010_create_user_secrets_table.sql`

## Verify Everything Works

After installing Python and restarting:

1. Go to your Code Wizard
2. Enter your query: "latest AI blogs from anthropic"
3. Click "Generate & Run Code"
4. Check the Output tab - you should see execution results instead of "Failed to update execution"

## Still Having Issues?

If Python is installed but you still see errors:

1. Check your server logs (terminal where `npm run dev` runs)
2. Look for `[Sandbox] Update error:` messages
3. Share those error messages for further debugging
