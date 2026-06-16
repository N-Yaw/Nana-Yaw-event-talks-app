# Google News CLI Tool

A Node.js command-line interface (CLI) application to fetch the latest news headlines from Google News directly inside your terminal.

## Features

- **Top Headlines**: Retrieve general headlines.
- **Search Queries**: Fetch news articles matching any specific keyword/query.
- **Topics**: Filter news by topics such as World, Business, Technology, Science, Sports, Health, and Entertainment.
- **Custom Limits**: Choose how many news articles to fetch and display.
- **Aesthetic Terminal Design**: Colors, structured spacing, relative dates, and loading indicators.

## Prerequisites

- Node.js (version 18.0.0 or higher recommended)

## Installation

1. Clone or download this project to your local machine.
2. Navigate to the project directory:
   ```bash
   cd c:/Users/nykak/ANTIGRAVITY_PROJECTS_my_first_project
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

## Usage

You can run the application directly using Node:

```bash
# Get top headlines (default 10 items)
node index.js

# Search for specific news
node index.js --search "quantum computing"
node index.js -s "artificial intelligence"

# Filter news by topic
node index.js --topic technology
node index.js -t sports

# Limit the number of news items displayed
node index.js --limit 5

# Customize localization (e.g., UK English edition)
node index.js --gl GB --hl en
```

## Options

- `-s, --search <query>`: Search query to fetch specific news.
- `-t, --topic <topic>`: Fetch news for a specific topic (available options: `world`, `nation`, `business`, `technology`, `entertainment`, `sports`, `science`, `health`).
- `-l, --limit <number>`: Number of news items to display (default: `10`).
- `-g, --gl <country>`: Country code (default: `US`).
- `--hl <language>`: Language code (default: `en`).
- `-h, --help`: Display help information.
