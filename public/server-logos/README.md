# Server Logos

This directory contains logo files for MCP servers displayed in the Project Nexus interface.

## Expected Logo Files

Place SVG, PNG, or other image files here for each MCP server:

- `langchain-mcp.svg` - LangChain MCP Server logo
- `google-maps.svg` - Google Maps Grounding Lite logo  
- `google-workspace.svg` - Google Workspace MCP Server logo
- `brave-search.svg` - Brave Search logo
- `puppeteer.svg` - Puppeteer logo (NOT Playwright - they are different tools)
- `filesystem.svg` - Filesystem server logo
- `postgres.svg` - Postgres server logo

## Logo Guidelines

- **Format**: SVG preferred (scalable, small file size), PNG acceptable
- **Size**: Optimized for display at 32x32px to 64x64px
- **Style**: Should work on both light and dark backgrounds
- **Naming**: Use kebab-case matching the server name

## Where to Find Logos

- **Official projects**: Check the repository's README, docs, or website
- **Brand assets**: Use official brand guidelines and assets
- **Simple icons**: Consider using simple, recognizable icons if official logos aren't available

## Adding New Logos

1. Add the logo file to this directory
2. Update the `logo_url` field in the `mcp_servers` table
3. The logo will automatically appear in the UI
