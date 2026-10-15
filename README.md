# Trello Copilot

Trello Copilot is a natural-language interface for managing Trello production orders through GitHub Copilot.

The project allows administrators to create, find, update, move, archive, restore, and report on Trello orders without manually navigating Trello boards. Administrators can interact using plain English requests while the application handles the underlying Trello API operations.

# Installation

Trello Copilot automatically installs all required components and downloads the latest project files.

## Prerequisites

- Windows 10 or Windows 11
- Internet connection
- Administrative privileges

## Quick Start

1. Download the latest release.
2. Extract the files to a folder of your choice.
3. Run:

```
TrelloCopilotInstaller.cmd
```

4. The installer will automatically:

   - Download and install Visual Studio Code
   - Download and install Node.js
   - Download the required project files
   - Install project dependencies
   - Configure the local environment, You will need to input your api key onto the env file (See first time setup)
   - once it is done vscode will pop up

5. When installation completes, launch:

```text
Start-TrelloCopilot.cmd
```

## First-Time Setup

Create a `.env` file in the project directory:

```env
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_trello_token
```

## Troubleshooting

### Node.js Not Installed

Run:

```text
TrelloCopilotInstaller.cmd
```

again to reinstall dependencies.

### Trello Authentication Errors

Verify the following variables are configured correctly:

```env
TRELLO_API_KEY=
TRELLO_TOKEN=
```

### VS Code Not Opening

Re-run:

```text
TrelloCopilotInstaller.cmd
```

or restart the computer after installation.

## Running Trello Copilot

After installation:

```text
Start-TrelloCopilot.cmd
```

Then use natural language commands such as:

```text
Find order 3264623
Move order 3264623 to PROGRAMMING
Show overdue orders
Give me today's production report



## Overview

The project originated as a local Trello MCP solution and was expanded into a Copilot-integrated order management platform.

Trello Copilot enables trusted administrators to:

- Find production orders
- Move orders between production stages
- Create new orders
- Archive and restore completed orders
- Track due dates
- Manage labels and comments
- View custom fields
- Generate production reports
- Track completed work by date

All functionality is driven through natural-language requests.

---

## Features

### Order Management

- Find orders by order number
- Create orders
- Rename orders
- Move orders between lists
- Archive orders
- Restore archived orders
- View board lists
- List archived orders
- View completed orders by date

### Card Management

- View card details
- Read descriptions
- Update descriptions
- View comments
- Add comments
- View labels
- Add labels
- Remove labels
- View attachments

### Due Date Management

- View due dates
- Set due dates
- Complete due dates
- Clear due dates

### Custom Fields

- View available custom fields
- View custom field values
- Update custom field values

### Reporting

- Daily production reports
- Due today reporting
- Overdue order reporting
- RUSH order reporting
- Completed order reporting
- Archived order reporting


---

## Example Requests

### Orders

```text
Find order 3264623
Move 3264623 to PROGRAMMING
Create order 3265000 for Desert Lawn in NEW ORDERS
Rename 3264623 to Nelson Scroll / White Haven
Archive order 3264623
Restore 3264623 to PROGRAMMING
```

### Reporting

```text
Give me today's production report
Show overdue orders
Show archived orders on Trigard Memorials
Show completed orders from September 21, 2026
```

### Comments

```text
Show comments on 3264623
Add a comment to 3264623 saying programming is finished
```

### Labels

```text
Add RUSH to 3264623
Remove RUSH from 3264623
What labels are on 3264623?
```

### Due Dates

```text
When is 3264623 due?
Set 3264623 due September 25 at 4 PM Arizona time
Mark 3264623 due date complete
Clear the due date on 3264623
```

### Custom Fields

```text
Show custom fields available for 3264623
Show custom field values for 3264623
Set the Priority custom field on 3264623 to High
```


---

## Daily Production Report

The Daily Production Report provides:

- Active order counts
- Order counts by list
- Orders due today
- Overdue orders
- RUSH orders
- Orders completed today
- Orders archived today
- Internal consistency validation

The report includes safeguards that verify list totals match active order totals before results are returned.

---

## Security

Trello Copilot uses a dedicated Trello integration account instead of personal administrator credentials.

### Required Environment Variables

```env
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token
```

### Source Control Exclusions

The following items should never be committed:

```text
.env
node_modules
build/
archive-history.json
```

### Credential Protection

- Trello credentials are stored outside the repository.
- Environment variables are used instead of hardcoded values.
- Permanent card deletion is intentionally not exposed instead i just added the archive and unarchive action to not risk losing cards and not having any way to restore them.
- Archive and restore workflows are preferred for data protection.


---

## Current Tool Catalog

The current implementation includes 27 tools:

| Category | Count |
|-----------|---------|
| Orders | 11 |
| Cards | 3 |
| Comments | 2 |
| Labels | 3 |
| Dates | 4 |
| Attachments | 1 |
| Custom Fields | 3 |

**Total Tools: 27**

---

## Installation

Clone the repository:

```bash
git clone https://github.com/jonathanv48820-creator/TrelloCopilotInstaller.git
```

Install dependencies:

```bash
npm install
```

Configure environment variables:

```env
TRELLO_API_KEY=
TRELLO_TOKEN=
```

Start the application:

```bash
npm start
```

---

## Roadmap

Future enhancements may include:

- Additional production analytics
- AI-assisted reporting
- Dashboard integration
- SharePoint integration
- Microsoft Teams notifications
- Expanded workflow automation

---

## License

Private internal-use project.

All rights reserved.
