import fs from 'fs/promises';
import path from 'path';
import { displayError, displayInfo, displayWarning } from './utils.js';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  encoding: string;
}

export class FileOperations {
  private static readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private static readonly SUPPORTED_EXTENSIONS = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
    '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
    '.yml', '.yaml', '.xml', '.html', '.css', '.scss',
    '.sql', '.graphql', '.env', '.ini', '.conf', '.config'
  ];

  static async readFile(filePath: string): Promise<FileContent | null> {
    try {
      const resolvedPath = path.resolve(filePath);
      const stats = await fs.stat(resolvedPath);

      if (!stats.isFile()) {
        displayError(`Path is not a file: ${filePath}`);
        return null;
      }

      if (stats.size > this.MAX_FILE_SIZE) {
        displayError(`File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 1MB.`);
        return null;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      if (!this.SUPPORTED_EXTENSIONS.includes(ext) && ext !== '') {
        displayWarning(`File extension '${ext}' may not be a text file. Attempting to read anyway.`);
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      
      return {
        path: resolvedPath,
        content,
        size: stats.size,
        encoding: 'utf-8'
      };
    } catch (error) {
      displayError(`Failed to read file: ${error}`);
      return null;
    }
  }

  static async readMultipleFiles(filePaths: string[]): Promise<FileContent[]> {
    const results: FileContent[] = [];
    
    for (const filePath of filePaths) {
      const content = await this.readFile(filePath);
      if (content) {
        results.push(content);
      }
    }

    return results;
  }

  static async saveConversation(
    messages: Array<{ role: string; content: string }>,
    outputPath: string,
    format: 'json' | 'md' | 'txt' = 'md'
  ): Promise<boolean> {
    try {
      let content = '';
      const timestamp = new Date().toISOString();

      switch (format) {
        case 'json':
          content = JSON.stringify({
            timestamp,
            messages
          }, null, 2);
          break;

        case 'md':
          content = `# Conversation Export\n\n`;
          content += `**Date:** ${timestamp}\n\n---\n\n`;
          
          messages.forEach(msg => {
            if (msg.role === 'system') {
              content += `## System Prompt\n\n${msg.content}\n\n---\n\n`;
            } else if (msg.role === 'user') {
              content += `### 👤 You\n\n${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
              content += `### 🤖 AI\n\n${msg.content}\n\n---\n\n`;
            }
          });
          break;

        case 'txt':
          content = `Conversation Export\n`;
          content += `Date: ${timestamp}\n`;
          content += `${'='.repeat(50)}\n\n`;
          
          messages.forEach(msg => {
            const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
            content += `${role}:\n${msg.content}\n\n${'-'.repeat(30)}\n\n`;
          });
          break;
      }

      await fs.writeFile(outputPath, content, 'utf-8');
      displayInfo(`Conversation saved to: ${outputPath}`);
      return true;
    } catch (error) {
      displayError(`Failed to save conversation: ${error}`);
      return false;
    }
  }

  static formatFileContent(file: FileContent): string {
    const relativePath = path.relative(process.cwd(), file.path);
    const sizeKB = (file.size / 1024).toFixed(2);
    
    return `\n📄 **File:** ${relativePath} (${sizeKB}KB)\n\`\`\`${this.getLanguageFromExtension(file.path)}\n${file.content}\n\`\`\`\n`;
  }

  private static getLanguageFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.ps1': 'powershell',
      '.bat': 'batch',
      '.cmd': 'batch',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.md': 'markdown'
    };

    return languageMap[ext] || 'text';
  }
}
