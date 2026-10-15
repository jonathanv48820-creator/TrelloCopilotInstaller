# Trello Copilot

Trello Copilot is a Node.js application that connects GitHub Copilot with Trello through the Trello REST API, allowing administrators to manage production orders using natural language.

The project is designed to simplify order tracking, reporting, and board management without requiring users to navigate Trello manually.

## Features

### Order Management

- Find orders by number
- Create new orders
- Move orders between lists
- Rename orders
- Archive and restore orders
- View active and archived orders

### Reporting

- Daily production reports
- Due today reports
- Overdue order reports
- RUSH order tracking
- Completed order tracking
- Board activity summaries

### Card Management

- View card details
- Update descriptions
- Add comments
- Manage labels
- Manage due dates
- View attachments
- Read and update custom fields

## Technology Stack

- Node.js
- GitHub Copilot
- Trello REST API
- JavaScript (ES Modules)

## How It Works

```text
GitHub Copilot
      ↓
Trello Copilot
      ↓
Trello REST API
      ↓
Trello Boards
```

## Example Commands

### Orders

```text
Find order 3264623
Move order 3264623 to PROGRAMMING
Archive order 3264623
Restore order 3264623
```

### Reports

```text
Give me today's production report
Show overdue orders
Show archived orders
```

### Card Updates

```text
Add comment to 3264623: Programming complete
Add RUSH label to 3264623
Set due date for tomorrow at 4 PM
```

## Configuration

Create a `.env` file:

```env
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token
```

## Installation

Clone the repository:

```bash
git clone https://github.com/jonathanv48820-creator/TrelloCopilotInstaller.git
cd TrelloCopilotInstaller
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

## Security

- Do not commit API keys.
- Keep `.env` files out of source control.
- Use a dedicated Trello integration account when possible.

## Roadmap

- [ ] AI-assisted production analysis
- [ ] Automated reporting
- [ ] Trello board insights
- [ ] SharePoint integration
- [ ] Microsoft Teams notifications

## License

Private project.
