import { ChatMessage } from './api.js';
import { config } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ConversationManager {
  private messages: ChatMessage[] = [];
  private sessionId: string;
  private historyDir: string;

  constructor() {
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.historyDir = path.join(os.homedir(), '.cere-cli', 'history');
  }

  async initialize(): Promise<void> {
    if (config.get('conversationHistory')) {
      await fs.mkdir(this.historyDir, { recursive: true });
    }
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  async saveSession(): Promise<void> {
    if (!config.get('conversationHistory')) return;

    const sessionFile = path.join(this.historyDir, `${this.sessionId}.json`);
    const sessionData = {
      id: this.sessionId,
      date: new Date().toISOString(),
      messages: this.messages
    };

    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
  }

  async loadSession(sessionId: string): Promise<void> {
    const sessionFile = path.join(this.historyDir, `${sessionId}.json`);
    try {
      const data = await fs.readFile(sessionFile, 'utf-8');
      const sessionData = JSON.parse(data);
      this.messages = sessionData.messages;
      this.sessionId = sessionData.id;
    } catch (error) {
      throw new Error(`Failed to load session: ${error}`);
    }
  }

  async listSessions(): Promise<Array<{ id: string; date: string; messageCount: number }>> {
    try {
      const files = await fs.readdir(this.historyDir);
      const sessions = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.historyDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const sessionData = JSON.parse(data);
          sessions.push({
            id: sessionData.id,
            date: sessionData.date,
            messageCount: sessionData.messages.length
          });
        }
      }

      return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionFile = path.join(this.historyDir, `${sessionId}.json`);
    await fs.unlink(sessionFile);
  }

  getLastUserMessage(): string | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        return this.messages[i].content;
      }
    }
    return undefined;
  }

  getLastAssistantMessage(): string | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') {
        return this.messages[i].content;
      }
    }
    return undefined;
  }
}
