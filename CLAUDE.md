# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install           # Install deps
npm run build         # tsc → dist/, then chmod +x dist/*.js
npm run watch         # tsc --watch for incremental dev
npm test              # jest with coverage (ESM + ts-jest)
npm test -- -t "name" # Run a single test by name pattern
docker build -t mcp/pythagraph-red .
```

There is no lint script. The package has no `start` — to run locally after `build`, wire `node dist/index.js` into Claude Desktop's `claude_desktop_config.json` (the server only speaks JSON-RPC over stdio, so it has no useful interactive shell).

## Architecture

Single-file MCP server. All logic lives in [index.ts](index.ts); [dist/](dist/) is the compiled output that `bin` (`mcp-server-pythagraph-red`) points at.

- **Transport**: `StdioServerTransport` from `@modelcontextprotocol/sdk`. The process logs to **stderr only** (stdout is the MCP wire) — never `console.log` from handler code.
- **Tools** (registered via `ListToolsRequestSchema` / `CallToolRequestSchema`):
  - `get_graph_data` — full markdown report (`formatGraphDataAsTable`)
  - `get_graph_summary` — short summary, optional `includeDetails` re-invokes the full formatter (`formatGraphSummary`)
- **Schemas**: Zod schemas (`GetGraphDataArgsSchema`, `GetGraphSummaryArgsSchema`) are converted to JSON Schema with `zod-to-json-schema` for the tool listing, then re-validated via `safeParse` inside the handler. Keep both paths in sync when changing args.
- **External call**: `fetchGraphData()` hits `https://red.pythagraph.co.kr/api/red/graph/exportGraphInfo.do?graphId=...`. The response is only considered successful when `data.message === 'OK'` — any other value is thrown as an API error even on HTTP 200. The `timeout: 30000` option in the README is commented out in code (`node-fetch` v3 doesn't accept it as a fetch option).

### Output formatting quirks (intentional, not bugs)

- All user-facing strings are **Korean** with emoji markers (📊 🔗 📈 🏆 etc.). This is intentional output style — keep it Korean when extending the formatters.
- Value-column detection is by **substring match on Korean column names**: `data.cols.findIndex(col => col.includes('값'))` for the value, and `col.includes('MBTI') || col.includes('유형')` for the category in the summary. If you add new column types, extend these heuristics rather than hardcoding indices.
- Numeric value cells are assumed to be **ratios in [0,1]** and rendered as `(n * 100).toFixed(1) + '%'`. Any change to upstream units must update both the table formatter and the statistics block.
- `graphDet` is HTML — stripped with a naive `replace(/<[^>]*>/g, '')` plus a few entity replacements. The `﻿` character in the regex is a literal U+FEFF (BOM) strip, not a typo.

### Tests

Jest is configured for ESM + ts-jest. `testMatch` is `**/__tests__/**/*.test.ts`. The `__tests__` directory does **not exist yet** — `npm test` currently exits with "no tests found". When adding tests, mock `node-fetch` rather than hitting the live Pythagraph API.

### Build / packaging

- `type: "module"` — the project is ESM. The jest `moduleNameMapper` rewrites `./foo.js` imports back to `./foo` for ts-jest.
- `tsconfig.json` includes `./**/*.ts` and excludes `dist/` and `__tests__/`, so test files are **not** compiled into the published `dist/`.
- `prepare` runs `build` on install, so the package is buildable from a fresh clone with just `npm install`.
- The Docker image is a two-stage Node 22 alpine build; entrypoint is `node /app/dist/index.js`.
