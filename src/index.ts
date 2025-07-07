#!/usr/bin/env node

import { Command } from 'commander';
import { config } from './config.js';
import { CerebrasAPI } from './api.js';
import { InteractiveChat } from './chat.js';
import {
  displayBanner,
  displayError,
  displaySuccess,
  displayInfo,
  displayWarning,
  createSpinner,
  getTheme
} from './utils.js';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  await fs.readFile(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('cere')
  .description('A complete and intuitive interactive CLI for talking to AI through the Cerebras API')
  .version(packageJson.version);

// Main chat command
program
  .command('chat', { isDefault: true })
  .description('Start an interactive chat session')
  .option('-m, --message <message>', 'Send a single message without entering interactive mode')
  .option('-s, --system <prompt>', 'Set a system prompt for the conversation')
  .option('--model <model>', 'Specify the model to use')
  .option('--temperature <temp>', 'Set temperature (0-2)', parseFloat)
  .option('--max-tokens <tokens>', 'Set max tokens', parseInt)
  .action(async (options) => {
    try {
      // Check if API key is configured
      if (!config.has('apiKey') && !process.env.CEREBRAS_API_KEY) {
        displayError('API key not configured. Please run "cere config --api-key YOUR_KEY" first.');
        process.exit(1);
      }

      // Set API key from env if not in config
      if (!config.has('apiKey') && process.env.CEREBRAS_API_KEY) {
        config.set('apiKey', process.env.CEREBRAS_API_KEY);
      }

      // Apply command-line options to config
      if (options.model) config.set('model', options.model);
      if (options.temperature !== undefined) config.set('temperature', options.temperature);
      if (options.maxTokens !== undefined) config.set('maxTokens', options.maxTokens);

      if (options.message) {
        // Single message mode
        const api = new CerebrasAPI();
        const spinner = createSpinner('Getting response...');
        spinner.start();

        try {
          const messages = [];
          if (options.system) {
            messages.push({ role: 'system' as const, content: options.system });
          }
          messages.push({ role: 'user' as const, content: options.message });

          const response = await api.chatCompletion({
            model: config.get('model') || 'llama3.1-8b',
            messages,
            temperature: config.get('temperature') || 0.7,
            max_tokens: config.get('maxTokens') || 1024
          });

          spinner.stop();
          console.log(getTheme().assistant('\n🤖 AI:'));
          console.log(response.choices[0].message.content);
          console.log();
        } catch (error) {
          spinner.stop();
          displayError(`Failed to get response: ${error}`);
          process.exit(1);
        }
      } else {
        // Interactive mode
        displayBanner();
        const chat = new InteractiveChat();
        await chat.start(undefined, options.system, false);
      }
    } catch (error) {
      displayError(`Failed to start chat: ${error}`);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Configure cere-cli settings')
  .option('--api-key <key>', 'Set your Cerebras API key')
  .option('--model <model>', 'Set default model')
  .option('--temperature <temp>', 'Set default temperature (0-2)', parseFloat)
  .option('--max-tokens <tokens>', 'Set default max tokens', parseInt)
  .option('--theme <theme>', 'Set theme (default, dark, light, colorful)')
  .option('--history <enabled>', 'Enable/disable conversation history (true/false)')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset configuration to defaults')
  .action(async (options) => {
    if (options.show) {
      const currentConfig = config.getAll();
      console.log(getTheme().info('\n📋 Current Configuration:\n'));
      Object.entries(currentConfig).forEach(([key, value]) => {
        if (key === 'apiKey' && value) {
          // Mask API key
          const masked = (value as string).substring(0, 8) + '...' + (value as string).substring((value as string).length - 4);
          console.log(`  ${key}: ${masked}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      console.log();
      return;
    }

    if (options.reset) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all settings?',
          default: false
        }
      ]);

      if (confirm) {
        config.clear();
        displaySuccess('Configuration reset to defaults');
      }
      return;
    }

    let changed = false;

    if (options.apiKey) {
      config.set('apiKey', options.apiKey);
      displaySuccess('API key saved');
      changed = true;
    }

    if (options.model) {
      config.set('model', options.model);
      displaySuccess(`Default model set to: ${options.model}`);
      changed = true;
    }

    if (options.temperature !== undefined) {
      if (options.temperature >= 0 && options.temperature <= 2) {
        config.set('temperature', options.temperature);
        displaySuccess(`Default temperature set to: ${options.temperature}`);
        changed = true;
      } else {
        displayError('Temperature must be between 0 and 2');
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens > 0) {
        config.set('maxTokens', options.maxTokens);
        displaySuccess(`Default max tokens set to: ${options.maxTokens}`);
        changed = true;
      } else {
        displayError('Max tokens must be a positive number');
      }
    }

    if (options.theme) {
      const validThemes = ['default', 'dark', 'light', 'colorful'];
      if (validThemes.includes(options.theme)) {
        config.set('theme', options.theme as any);
        displaySuccess(`Theme set to: ${options.theme}`);
        changed = true;
      } else {
        displayError(`Invalid theme. Choose from: ${validThemes.join(', ')}`);
      }
    }

    if (options.history !== undefined) {
      const enabled = options.history === 'true';
      config.set('conversationHistory', enabled);
      displaySuccess(`Conversation history ${enabled ? 'enabled' : 'disabled'}`);
      changed = true;
    }

    if (!changed) {
      displayInfo('No configuration changes made. Use --help to see available options.');
    }
  });

// Models command
program
  .command('models')
  .description('List available Cerebras models')
  .action(async () => {
    try {
      if (!config.has('apiKey') && !process.env.CEREBRAS_API_KEY) {
        displayError('API key not configured. Please run "cere config --api-key YOUR_KEY" first.');
        process.exit(1);
      }

      const api = new CerebrasAPI();
      const spinner = createSpinner('Fetching models...');
      spinner.start();

      const models = await api.listModels();
      spinner.stop();

      const currentModel = config.get('model');
      console.log(getTheme().info('\n📦 Available Models:\n'));
      
      models.forEach(model => {
        const isCurrent = model.id === currentModel;
        const marker = isCurrent ? ' ✓' : '';
        console.log(`  ${model.id}${marker}`);
      });
      
      console.log();
      if (currentModel) {
        displayInfo(`Current default: ${currentModel}`);
      }
    } catch (error) {
      displayError(`Failed to fetch models: ${error}`);
      process.exit(1);
    }
  });

// Init command for first-time setup
program
  .command('init')
  .description('Initialize cere-cli with interactive setup')
  .action(async () => {
    displayBanner();
    displayInfo('Welcome to Cere-CLI! Let\'s set up your configuration.\n');

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Cerebras API key:',
        validate: (input) => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'theme',
        message: 'Choose a color theme:',
        choices: ['colorful', 'default', 'dark', 'light'],
        default: 'colorful'
      },
      {
        type: 'confirm',
        name: 'history',
        message: 'Enable conversation history?',
        default: true
      }
    ]);

    config.set('apiKey', answers.apiKey);
    config.set('theme', answers.theme);
    config.set('conversationHistory', answers.history);

    displaySuccess('Configuration complete! You can now start chatting with "cere chat" or just "cere"');
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (process.argv.length === 2) {
  // No arguments provided, start default chat
  program.parse([...process.argv, 'chat']);
}
