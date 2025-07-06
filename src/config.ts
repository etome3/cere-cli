import Conf from 'conf';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigSchema {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  conversationHistory?: boolean;
  theme?: 'default' | 'dark' | 'light' | 'colorful';
}

export class Config {
  private store: Conf<ConfigSchema>;

  constructor() {
    this.store = new Conf<ConfigSchema>({
      projectName: 'cere-cli',
      defaults: {
        model: 'llama3.1-8b',
        maxTokens: 1024,
        temperature: 0.7,
        conversationHistory: true,
        theme: 'colorful'
      }
    });
  }

  get(key: keyof ConfigSchema): any {
    return this.store.get(key);
  }

  set(key: keyof ConfigSchema, value: any): void {
    this.store.set(key, value);
  }

  has(key: keyof ConfigSchema): boolean {
    return this.store.has(key);
  }

  delete(key: keyof ConfigSchema): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getAll(): ConfigSchema {
    return this.store.store;
  }
}

export const config = new Config();
