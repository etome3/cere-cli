import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export class CerebrasAPI {
  private client: AxiosInstance;
  private baseURL = 'https://api.cerebras.ai/v1';

  constructor(apiKey?: string) {
    const key = apiKey || config.get('apiKey');
    if (!key) {
      throw new Error('API key not found. Please set it using "cere config --api-key YOUR_KEY"');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.post('/chat/completions', request);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await this.client.post('/chat/completions', {
        ...request,
        stream: true
      }, {
        responseType: 'stream'
      });

      let buffer = '';
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        });

        response.data.on('end', () => resolve());
        response.data.on('error', reject);
      });
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<Model[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw error;
    }
  }
}
