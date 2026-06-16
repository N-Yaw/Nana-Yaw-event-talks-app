#!/usr/bin/env node

import { Command } from 'commander';
import Parser from 'rss-parser';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();
const parser = new Parser();

// Helper to format publication dates to a human-readable relative time
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;

  if (isNaN(diffMs)) return dateString;

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

// Helper to parse the article title and separate the source name
function parseTitle(title) {
  // Google News RSS titles usually end with " - Source Name"
  const match = title.match(/(.*) - ([^-]+)$/);
  if (match) {
    return {
      titleText: match[1].trim(),
      source: match[2].trim()
    };
  }
  return {
    titleText: title,
    source: 'Google News'
  };
}

program
  .name('google-news')
  .description('Fetch the latest news from Google News in your terminal')
  .version('1.0.0')
  .option('-s, --search <query>', 'Search query to fetch specific news')
  .option('-t, --topic <topic>', 'Fetch news for a specific topic (e.g. world, technology, business, science, sports, health, entertainment)')
  .option('-l, --limit <number>', 'Number of news items to display', '10')
  .option('-g, --gl <country>', 'Country code (e.g., US, GB, IN)', 'US')
  .option('--hl <language>', 'Language code (e.g., en, es, fr)', 'en')
  .parse(process.argv);

const options = program.opts();

async function main() {
  const limit = parseInt(options.limit, 10);
  if (isNaN(limit) || limit <= 0) {
    console.error(chalk.red('Error: Limit must be a positive integer.'));
    process.exit(1);
  }

  const hl = options.hl.toLowerCase();
  const gl = options.gl.toUpperCase();
  const ceid = `${gl}:${hl}`;

  let url = 'https://news.google.com/rss';
  let titleHeader = 'Top Headlines';

  if (options.search) {
    const query = options.search;
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    titleHeader = `Search: "${query}"`;
  } else if (options.topic) {
    const topicInput = options.topic.toLowerCase();
    
    // Map standard topics
    const topicsMap = {
      world: 'WORLD',
      nation: 'NATION',
      business: 'BUSINESS',
      technology: 'TECHNOLOGY',
      entertainment: 'ENTERTAINMENT',
      sports: 'SPORTS',
      science: 'SCIENCE',
      health: 'HEALTH'
    };

    const targetTopic = topicsMap[topicInput];
    if (!targetTopic) {
      console.error(chalk.red(`Error: Invalid topic "${options.topic}".`));
      console.error(chalk.yellow(`Available topics: ${Object.keys(topicsMap).join(', ')}`));
      process.exit(1);
    }

    url = `https://news.google.com/rss/headlines/section/topic/${targetTopic}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
    titleHeader = `Topic: ${targetTopic}`;
  }

  console.log();
  const spinner = ora({
    text: chalk.dim('Fetching news from Google News...'),
    color: 'cyan'
  }).start();

  try {
    const feed = await parser.parseURL(url);
    spinner.succeed(chalk.green(`Successfully loaded news`));
    console.log();

    console.log(chalk.bold.cyan.underline(`=== ${titleHeader} ===`));
    console.log();

    const items = feed.items.slice(0, limit);
    if (items.length === 0) {
      console.log(chalk.yellow('No news items found.'));
      return;
    }

    items.forEach((item, index) => {
      const { titleText, source } = parseTitle(item.title);
      const relativeTime = getRelativeTime(item.pubDate);
      
      // Indexing prefix (e.g. "1. ")
      const prefix = chalk.cyan.bold(`${index + 1}. `);
      
      // Title and source
      console.log(`${prefix}${chalk.white.bold(titleText)}`);
      console.log(`   ${chalk.dim('Source:')} ${chalk.green(source)}  •  ${chalk.dim('Published:')} ${chalk.yellow(relativeTime)}`);
      console.log(`   ${chalk.dim('Link:')} ${chalk.blue.underline(item.link)}`);
      console.log();
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch news'));
    console.error(chalk.red(`Error details: ${error.message}`));
    process.exit(1);
  }
}

main();
