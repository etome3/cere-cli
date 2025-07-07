import inquirer from 'inquirer';
import { CerebrasAPI } from './api.js';
import { ConversationManager } from './conversation.js';
import { config } from './config.js';
import {
  displayBanner,
  formatMessage,
  renderMarkdown,
  createSpinner,
  displayError,
  displaySuccess,
  displayInfo,
  displayWarning,
  copyToClipboard,
  formatTokenUsage,
  getTheme
} from './utils.js';
import { FileOperations } from './file-operations.js';

export class InteractiveChat {
  private api: CerebrasAPI;
  private conversation: ConversationManager;
  private isRunning: boolean = false;

  constructor() {
    this.api = new CerebrasAPI();
    this.conversation = new ConversationManager();
  }

  async start(initialMessage?: string, systemPrompt?: string, showBanner: boolean = true): Promise<void> {
    await this.conversation.initialize();
    this.isRunning = true;

    if (showBanner) {
      displayBanner();
    }
    displayInfo('Type /help for available commands');

    if (systemPrompt) {
      this.conversation.addMessage({
        role: 'system',
        content: systemPrompt
      });
      displayInfo(`System prompt set: ${systemPrompt}`);
    }

    if (initialMessage) {
      await this.handleUserInput(initialMessage);
    }

    while (this.isRunning) {
      try {
        const { message } = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: getTheme().user('You:'),
            prefix: ''
          }
        ]);

        if (!message.trim()) continue;

        await this.handleUserInput(message);
      } catch (error) {
        if (error instanceof Error && error.message.includes('force closed')) {
          // User pressed Ctrl+C
          await this.handleExit();
        } else {
          displayError(`An error occurred: ${error}`);
        }
      }
    }
  }

  private async handleUserInput(input: string): Promise<void> {
    if (input.startsWith('/')) {
      await this.handleCommand(input);
    } else {
      await this.sendMessage(input);
    }
  }

  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');
    const arg = args.join(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'clear':
        this.conversation.clear();
        console.clear();
        displayBanner();
        displaySuccess('Conversation cleared');
        break;

      case 'save':
        await this.conversation.saveSession();
        displaySuccess('Conversation saved');
        break;

      case 'history':
        await this.showHistory();
        break;

      case 'copy':
        await this.copyLastMessage();
        break;

      case 'model':
        if (arg) {
          config.set('model', arg);
          displaySuccess(`Model changed to: ${arg}`);
        } else {
          await this.showModels();
        }
        break;

      case 'system':
        if (arg) {
          this.conversation.clear();
          this.conversation.addMessage({
            role: 'system',
            content: arg
          });
          displaySuccess('System prompt updated');
        } else {
          displayWarning('Please provide a system prompt');
        }
        break;

      case 'temp':
      case 'temperature':
        if (arg) {
          const temp = parseFloat(arg);
          if (temp >= 0 && temp <= 2) {
            config.set('temperature', temp);
            displaySuccess(`Temperature set to: ${temp}`);
          } else {
            displayError('Temperature must be between 0 and 2');
          }
        } else {
          displayInfo(`Current temperature: ${config.get('temperature')}`);
        }
        break;

      case 'tokens':
      case 'maxtokens':
        if (arg) {
          const tokens = parseInt(arg);
          if (tokens > 0) {
            config.set('maxTokens', tokens);
            displaySuccess(`Max tokens set to: ${tokens}`);
          } else {
            displayError('Max tokens must be a positive number');
          }
        } else {
          displayInfo(`Current max tokens: ${config.get('maxTokens')}`);
        }
        break;

      case 'theme':
        if (arg) {
          const validThemes = ['default', 'dark', 'light', 'colorful'];
          if (validThemes.includes(arg)) {
            config.set('theme', arg as any);
            displaySuccess(`Theme changed to: ${arg}`);
          } else {
            displayError(`Invalid theme. Choose from: ${validThemes.join(', ')}`);
          }
        } else {
          displayInfo(`Current theme: ${config.get('theme')}`);
        }
        break;

      case 'file':
      case 'read':
        if (arg) {
          await this.readFile(arg);
        } else {
          displayWarning('Please provide a file path to read');
        }
        break;

      case 'export':
        await this.exportConversation(arg);
        break;

      case 'search':
        if (arg) {
          await this.searchConversations(arg);
        } else {
          displayWarning('Please provide a search query');
        }
        break;

      case 'exit':
      case 'quit':
        await this.handleExit();
        break;

      default:
        displayWarning(`Unknown command: ${cmd}. Type /help for available commands.`);
    }
  }

  private showHelp(): void {
    const theme = getTheme();
    console.log(theme.info('\n📚 Available Commands:\n'));
    const commands = [
      ['/help', 'Show this help message'],
      ['/clear', 'Clear the conversation'],
      ['/save', 'Save the current conversation'],
      ['/history', 'Show conversation history'],
      ['/copy', 'Copy last AI response to clipboard'],
      ['/file [path]', 'Read a file and include in context'],
      ['/export [path]', 'Export conversation to file (md/json/txt)'],
      ['/search [query]', 'Search through conversation history'],
      ['/model [name]', 'Change or show available models'],
      ['/system [prompt]', 'Set a new system prompt'],
      ['/temp [0-2]', 'Set or show temperature'],
      ['/tokens [number]', 'Set or show max tokens'],
      ['/theme [name]', 'Change theme (default, dark, light, colorful)'],
      ['/exit', 'Exit the chat']
    ];

    commands.forEach(([cmd, desc]) => {
      console.log(theme.system(`  ${cmd.padEnd(20)} ${desc}`));
    });
    console.log();
  }

  private async sendMessage(content: string): Promise<void> {
    this.conversation.addMessage({
      role: 'user',
      content
    });

    const spinner = createSpinner('Thinking...');
    spinner.start();

    try {
      const model = config.get('model') || 'llama3.1-8b';
      const temperature = config.get('temperature') || 0.7;
      const maxTokens = config.get('maxTokens') || 1024;

      let fullResponse = '';
      const theme = getTheme();

      // First time we receive data, stop spinner and print AI prefix
      let isFirstChunk = true;

      await this.api.streamChatCompletion(
        {
          model,
          messages: this.conversation.getMessages(),
          temperature,
          max_tokens: maxTokens,
          stream: true
        },
        (chunk) => {
          if (isFirstChunk) {
            spinner.stop();
            console.log(`\n${theme.assistant('🤖 AI:')}`);
            isFirstChunk = false;
          }
          fullResponse += chunk;
          process.stdout.write(renderMarkdown(chunk));
        }
      );

      console.log('\n');

      this.conversation.addMessage({
        role: 'assistant',
        content: fullResponse
      });

      // Auto-save if enabled
      if (config.get('conversationHistory')) {
        await this.conversation.saveSession();
      }
    } catch (error) {
      spinner.stop();
      displayError(`Failed to get response: ${error}`);
    }
  }

  private async showHistory(): Promise<void> {
    const sessions = await this.conversation.listSessions();
    
    if (sessions.length === 0) {
      displayInfo('No conversation history found');
      return;
    }

    const choices = sessions.map(session => ({
      name: `${session.date} (${session.messageCount} messages)`,
      value: session.id
    }));

    choices.push({ name: 'Cancel', value: 'cancel' });

    const { sessionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sessionId',
        message: 'Select a conversation to load:',
        choices
      }
    ]);

    if (sessionId !== 'cancel') {
      await this.conversation.loadSession(sessionId);
      displaySuccess('Conversation loaded');
      
      // Display the loaded conversation
      const messages = this.conversation.getMessages();
      messages.forEach(msg => {
        if (msg.role !== 'system') {
          console.log(formatMessage(msg.role, renderMarkdown(msg.content)));
        }
      });
    }
  }

  private async showModels(): Promise<void> {
    const spinner = createSpinner('Fetching available models...');
    spinner.start();

    try {
      const models = await this.api.listModels();
      spinner.stop();

      const currentModel = config.get('model');
      const choices = models.map(model => ({
        name: model.id + (model.id === currentModel ? ' (current)' : ''),
        value: model.id
      }));

      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Select a model:',
          choices
        }
      ]);

      config.set('model', model);
      displaySuccess(`Model changed to: ${model}`);
    } catch (error) {
      spinner.stop();
      displayError(`Failed to fetch models: ${error}`);
    }
  }

  private async copyLastMessage(): Promise<void> {
    const lastMessage = this.conversation.getLastAssistantMessage();
    
    if (lastMessage) {
      const success = await copyToClipboard(lastMessage);
      if (success) {
        displaySuccess('Last AI response copied to clipboard');
      } else {
        displayError('Failed to copy to clipboard');
      }
    } else {
      displayWarning('No AI response to copy');
    }
  }

  private async handleExit(): Promise<void> {
    if (this.conversation.getMessages().length > 0) {
      const { save } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'save',
          message: 'Save conversation before exiting?',
          default: true
        }
      ]);

      if (save) {
        await this.conversation.saveSession();
        displaySuccess('Conversation saved');
      }
    }

    displayInfo('Goodbye! 👋');
    this.isRunning = false;
    process.exit(0);
  }

  private async readFile(filePath: string): Promise<void> {
    const spinner = createSpinner('Reading file...');
    spinner.start();

    const fileContent = await FileOperations.readFile(filePath);
    spinner.stop();

    if (fileContent) {
      const formattedContent = FileOperations.formatFileContent(fileContent);
      const userMessage = `Please analyze this file:\n${formattedContent}`;
      
      displayInfo(`File loaded: ${filePath}`);
      await this.sendMessage(userMessage);
    }
  }

  private async exportConversation(outputPath?: string): Promise<void> {
    const messages = this.conversation.getMessages();
    
    if (messages.length === 0) {
      displayWarning('No messages to export');
      return;
    }

    let path = outputPath;
    let format: 'json' | 'md' | 'txt' = 'md';

    if (!path) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'filename',
          message: 'Enter filename (without extension):',
          default: `conversation_${new Date().toISOString().split('T')[0]}`
        },
        {
          type: 'list',
          name: 'format',
          message: 'Select export format:',
          choices: [
            { name: 'Markdown (.md)', value: 'md' },
            { name: 'JSON (.json)', value: 'json' },
            { name: 'Plain Text (.txt)', value: 'txt' }
          ],
          default: 'md'
        }
      ]);

      path = `${answers.filename}.${answers.format}`;
      format = answers.format;
    } else {
      // Determine format from extension
      if (path.endsWith('.json')) format = 'json';
      else if (path.endsWith('.txt')) format = 'txt';
      else if (!path.endsWith('.md')) path += '.md';
    }

    await FileOperations.saveConversation(messages, path, format);
  }

  private async searchConversations(query: string): Promise<void> {
    const sessions = await this.conversation.listSessions();
    
    if (sessions.length === 0) {
      displayInfo('No conversation history to search');
      return;
    }

    displayInfo(`Searching for: "${query}"...`);
    const results: Array<{ sessionId: string; date: string; matches: string[] }> = [];

    for (const session of sessions) {
      try {
        await this.conversation.loadSession(session.id);
        const messages = this.conversation.getMessages();
        const matches: string[] = [];

        messages.forEach(msg => {
          if (msg.content.toLowerCase().includes(query.toLowerCase())) {
            const snippet = this.extractSnippet(msg.content, query);
            matches.push(`${msg.role}: ${snippet}`);
          }
        });

        if (matches.length > 0) {
          results.push({
            sessionId: session.id,
            date: session.date,
            matches: matches.slice(0, 3) // Show max 3 matches per session
          });
        }
      } catch (error) {
        // Skip corrupted sessions
      }
    }

    // Clear messages after search
    this.conversation.clear();

    if (results.length === 0) {
      displayInfo('No matches found');
      return;
    }

    console.log(`\nFound ${results.length} conversations with matches:\n`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. Session from ${new Date(result.date).toLocaleString()}`);
      result.matches.forEach(match => {
        console.log(`   - ${match}`);
      });
      console.log();
    });

    const { loadSession } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'loadSession',
        message: 'Would you like to load one of these conversations?',
        default: false
      }
    ]);

    if (loadSession) {
      const choices = results.map((result, index) => ({
        name: `${index + 1}. ${new Date(result.date).toLocaleString()} (${result.matches.length} matches)`,
        value: result.sessionId
      }));

      const { sessionId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'sessionId',
          message: 'Select conversation to load:',
          choices
        }
      ]);

      await this.conversation.loadSession(sessionId);
      displaySuccess('Conversation loaded');
      
      // Display the loaded conversation
      const messages = this.conversation.getMessages();
      messages.forEach(msg => {
        if (msg.role !== 'system') {
          console.log(formatMessage(msg.role, renderMarkdown(msg.content)));
        }
      });
    }
  }

  private extractSnippet(content: string, query: string, contextLength: number = 50): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + query.length + contextLength);
    
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet.trim();
  }
}
