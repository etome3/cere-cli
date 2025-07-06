import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import ora, { Ora } from 'ora';
import clipboardy from 'clipboardy';
import { config } from './config.js';

// Configure marked to use terminal renderer
const terminalRenderer = new TerminalRenderer({
  code: chalk.yellow,
  blockquote: chalk.gray.italic,
  html: chalk.gray,
  heading: chalk.green.bold,
  firstHeading: chalk.magenta.bold,
  hr: chalk.gray,
  listitem: chalk.gray,
  list: (body: string) => body,
  paragraph: chalk.white,
  table: chalk.gray,
  tablecell: chalk.gray,
  strong: chalk.bold,
  em: chalk.italic,
  codespan: chalk.yellow,
  del: chalk.strikethrough,
  link: chalk.blue.underline,
  href: chalk.blue.underline,
} as any);

marked.setOptions({
  renderer: terminalRenderer as any
});

export const themes = {
  default: {
    user: chalk.cyan,
    assistant: chalk.green,
    system: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow
  },
  dark: {
    user: chalk.blueBright,
    assistant: chalk.greenBright,
    system: chalk.yellowBright,
    error: chalk.redBright,
    info: chalk.cyanBright,
    success: chalk.greenBright,
    warning: chalk.yellowBright
  },
  light: {
    user: chalk.blue,
    assistant: chalk.green,
    system: chalk.yellow,
    error: chalk.red,
    info: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow
  },
  colorful: {
    user: gradient.rainbow,
    assistant: gradient.pastel,
    system: gradient.morning,
    error: chalk.red.bold,
    info: gradient.cristal,
    success: gradient.teen,
    warning: gradient.fruit
  }
};

export function getTheme() {
  const themeName = config.get('theme') || 'colorful';
  return themes[themeName as keyof typeof themes] || themes.default;
}

export function displayBanner(): void {
  const theme = getTheme();
  console.log();
  console.log(
    theme.assistant(
      figlet.textSync('Cere-CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  );
  console.log(theme.info('🚀 Cerebras AI Interactive CLI - The Fastest AI Inference'));
  console.log();
}

export function formatMessage(role: string, content: string): string {
  const theme = getTheme();
  const prefix = role === 'user' ? '👤 You' : '🤖 AI';
  const colorFn = role === 'user' ? theme.user : theme.assistant;
  
  return `\n${colorFn(prefix + ':')}\n${content}\n`;
}

export function renderMarkdown(text: string): string {
  return marked(text) as string;
}

export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan'
  });
}

export function displayError(message: string): void {
  const theme = getTheme();
  console.error(theme.error(`\n❌ Error: ${message}\n`));
}

export function displaySuccess(message: string): void {
  const theme = getTheme();
  console.log(theme.success(`\n✅ ${message}\n`));
}

export function displayInfo(message: string): void {
  const theme = getTheme();
  console.log(theme.info(`\nℹ️  ${message}\n`));
}

export function displayWarning(message: string): void {
  const theme = getTheme();
  console.log(theme.warning(`\n⚠️  ${message}\n`));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboardy.write(text);
    return true;
  } catch (error) {
    return false;
  }
}

export function formatTokenUsage(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): string {
  const theme = getTheme();
  return theme.info(`\n📊 Token Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
