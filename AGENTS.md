# X Developer Platform — Agent Instructions

This document provides guidance for AI agents, coding assistants, and LLM-based tools interacting with the X Developer Platform documentation at https://docs.x.com.

## Preferred Documentation Access Methods

**Always prefer these methods for the most accurate, up-to-date, and agent-friendly content:**

1. **llms.txt** (recommended starting point)
   - https://docs.x.com/llms.txt — Small, curated root index with links to section-specific indexes.
   - Section indexes (follow the links in the root):
     - https://docs.x.com/x-api/llms.txt (X API v2 — 370+ pages)
     - https://docs.x.com/enterprise-api/llms.txt
     - https://docs.x.com/x-ads-api/llms.txt
     - https://docs.x.com/xdks/llms.txt (Python + TypeScript XDKs)

2. **llms-full.txt** — Complete documentation as a single Markdown file for maximum context:
   - https://docs.x.com/llms-full.txt

3. **Raw Markdown for any individual page**
   - Append `.md` to any documentation URL.
   - Example: `https://docs.x.com/x-api/posts/get-post-by-id.md`
   - Every page supports this. Use it instead of the HTML view when possible.

4. **MCP Server** (for tool-using agents)
   - https://docs.x.com/tools/mcp — Full Model Context Protocol server exposing 200+ X API endpoints + documentation search.

5. **skill.md** (capability summary)
   - https://docs.x.com/skill.md — Structured description of every action an agent can perform with the X API (agentskills.io format).

## Site Structure & Navigation

- **X API v2** (`/x-api/...`): Posts, Users, Direct Messages, Lists, Spaces, Media, Streams (filtered + volume), Compliance, Webhooks, Account Activity, Trends, News, Usage, Connections.
- **Enterprise APIs** (`/enterprise-api/...`): Account Activity (webhooks), X Activity (XAA), GNIP/PowerTrack historical & real-time, Compliance.
- **Ads API** (`/x-ads-api/...`): Campaign Management, Creatives, Audiences, Analytics, Measurement, Catalog.
- **SDKs (XDKs)** (`/xdks/python/...` and `/xdks/typescript/...`): Official client libraries with full type coverage, pagination, and streaming helpers.
- **Fundamentals**: Authentication, rate limits, data dictionary, expansions, fields, pagination, versioning, consistency.
- **AI & Agent Tools** (`/tools/ai`, `/tools/llms-txt`, `/tools/skill-md`, `/tools/mcp`).

All pages are available in the navigation tree defined in `docs.json`.

## Important Technical Notes for Agents

- **Authentication**: The platform supports OAuth 1.0a (user context), OAuth 2.0 (user context + PKCE, app-only Bearer), and Basic Auth for some enterprise endpoints. See `/fundamentals/authentication/...`.
- **Rate Limits**: Most endpoints have both app-level and user-level rate limits. See `/fundamentals/rate-limits.md` and per-endpoint documentation.
- **Data Model**: Use the official data dictionary, fields, expansions, and metrics pages. Posts, Users, and Spaces are the core objects.
- **Real-time Data**: Filtered Stream, Volume Streams, Account Activity webhooks, and X Activity (XAA) are the primary real-time mechanisms.
- **Compliance & Safety**: Always respect developer terms, display requirements, and restricted use cases. See `/developer-guidelines.md` and `/developer-terms/...`.

## How to Use This Documentation Effectively

- Start with the root `llms.txt` to discover relevant pages.
- Fetch individual pages via the `.md` suffix for clean, structured Markdown.
- For deep context on the entire platform, load `llms-full.txt`.
- For structured capabilities (what actions are possible), load `skill.md`.
- For live tool calling against the X API, use the MCP server.
- When writing code, prefer the official Python or TypeScript XDKs (full references available in their `llms.txt` files).

## Do Not

- Rely solely on the HTML-rendered pages when a clean Markdown alternative exists.
- Assume deprecated v1.1 endpoints are still primary (focus on v2 and Enterprise equivalents).
- Ignore rate limits, authentication context (app-only vs user context), or pagination requirements.
- Generate code that violates the X Developer Agreement or Display Requirements.

## Additional Resources

- OpenAPI spec: https://docs.x.com/openapi.json (or https://api.x.com/2/openapi.json)
- Changelog: https://docs.x.com/changelog.md
- Status page: https://docs.x.com/status.md
- Developer Guidelines: https://docs.x.com/developer-guidelines.md
- Support & Community: https://devcommunity.x.com

This documentation is designed to be consumed reliably by AI agents. Use the machine-readable formats (`llms.txt` family, `.md` suffix, `skill.md`, MCP) for the best results.
