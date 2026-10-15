# TrelloCopilotInstaller

# Trello Copilot

Trello Copilot is a GitHub Copilot Agent Plugin that allows administrators to manage Trello-based production orders using natural language using github copilot inside vscode.

Instead of opening Trello or learning MCP tool names, admins can ask GitHub Copilot questions such as:

- "Find order 3264623"
- "Move 3264623 to PROGRAMMING"
- "Show archived orders on Trigard Memorials"
- "Give me today's production report"

The plugin communicates with Trello through a dedicated integration account and exposes 27 MCP tools through a standalone Windows executable.

---

# Features

## Order Management

- Create orders
- Find orders
- Move orders between lists
- Rename orders
- Archive orders
- Restore archived orders
- List orders on boards
- List archived orders
- View completed orders by date

## Reporting

- Daily Production Report
- Due Today reporting
- Overdue order reporting
- RUSH order reporting
- Archived/completed order reporting
- Production consistency validation

## Trello Card Management

- View card details
- Read descriptions
- Update descriptions
- Add comments
- Read comments
- Manage labels
- Manage due dates
- View attachments
- Read and update custom fields

---

# Architecture

```text
GitHub Copilot App
        │
        ▼
Private Plugin Marketplace
        │
        ▼
trello-orders Plugin
        │
        ▼
trello-orders.exe
        │
        ▼
27 MCP Tools
        │
        ▼
Dedicated Trello Integration Account
        │
        ▼
Trello REST API
```

---

# Technology Stack

- GitHub Copilot Agent Plugins
- MCP (Model Context Protocol)
- Node.js
- Trello REST API
- ESBuild
- Node Single Executable Applications (SEA)
- Git LFS

---

# Project Structure

```text
trellocopilot-plugin
│
├── .github/
│   └── plugin/
│       └── marketplace.json
│
├── plugins/
│   └── trello-orders/
│       ├── plugin.json
│       ├── mcp.json
│       ├── trello-orders.exe
│       ├── server.mjs
│       ├── trello-api.mjs
│       ├── package.json
│       ├── sea-config.json
│       │
│       ├── com.github.copilot/
│       │   └── agents/
│       │       └── trello-orders.agent.md
│       │
│       └── tools/
│           ├── orders.mjs
│           ├── cards.mjs
│           ├── comments.mjs
│           ├── labels.mjs
│           ├── dates.mjs
│           ├── attachments.mjs
│           └── customfields.mjs
```

---

# Security

The plugin was designed with security in mind.

## Trello Authentication

Credentials are never stored in source code.

Required environment variables:

```text
TRELLO_API_KEY
TRELLO_TOKEN
```

These values are stored on authorized administrator workstations and are not included in GitHub.

## Integration Account

A dedicated Trello integration account is used instead of personal administrator accounts.

## Source Control Exclusions

The following items are excluded from Git:

```text
.env
node_modules
build output
archive-history.json
```

## Safety Controls

Permanent card deletion is intentionally not exposed.

The recommended workflow is:

```text
Archive
↓
Restore if needed
```

---

# Daily Production Report

The Daily Production Report provides:

- Active order counts
- Order counts by list
- Orders due today
- Overdue orders
- RUSH orders
- Hidden active cards inside archived lists
- Orders completed today

The report includes internal validation checks to ensure totals remain consistent.

---

# Supported Natural Language Requests

## Orders

```text
Find order 3264623
Move 3264623 to PROGRAMMING
Create order 3265000 for Desert Lawn in NEW ORDERS
Rename 3264623 to Nelson Scroll / White Haven
Archive order 3264623
Restore 3264623 to PROGRAMMING
```

## Reporting

```text
Show archived orders on Trigard Memorials
Show completed orders from September 21, 2026
Give me today's production report
Show overdue orders
Show RUSH orders
```

## Comments

```text
Show comments on 3264623
Add a comment to 3264623 saying programming is finished
```

## Labels

```text
Add RUSH to 3264623
Remove RUSH from 3264623
What labels are on 3264623?
```

## Due Dates

```text
When is 3264623 due?
Set 3264623 due September 25 at 4 PM Arizona time
Mark 3264623 due date complete
Clear the due date on 3264623
```

## Custom Fields

```text
Show custom fields available for 3264623
Show custom field values for 3264623
Set the Priority custom field on 3264623 to High
```

---

# MCP Tool Catalog

The plugin currently exposes:

| Category | Count |
|-----------|---------|
| Orders | 11 |
| Cards | 3 |
| Comments | 2 |
| Labels | 3 |
| Dates | 4 |
| Attachments | 1 |
| Custom Fields | 3 |

**Total: 27 MCP Tools**

---

# Build Process

```bash
npx esbuild server.mjs \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=build/trello-orders-bundle.mjs
```

Build SEA executable:

```bash
node --build-sea sea-config.json
```

Release workflow:

1. Update source code
2. Build bundle
3. Build executable
4. Test executable
5. Update plugin version
6. Commit changes
7. Push to GitHub

Git LFS manages the large executable binary.

---

# Deployment Status

✅ Private GitHub Copilot Marketplace

✅ Standalone Windows executable

✅ Dedicated Trello integration account

✅ Git LFS support

✅ Daily production reporting

✅ Order archive history tracking

✅ Natural language order management

---

# License

Private internal-use project.

All rights reserved.
