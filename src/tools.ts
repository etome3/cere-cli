import { ChatMessage } from './api.js';
import { displayInfo, displayWarning } from './utils.js';

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResponse {
  role: 'tool';
  content: string;
  tool_call_id: string;
}

// Built-in tools
export const BUILT_IN_TOOLS: Record<string, ToolFunction> = {
  calculate: {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(pi/2)")'
        }
      },
      required: ['expression']
    }
  },
  get_current_time: {
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "UTC", "America/New_York"). Defaults to system timezone.'
        }
      }
    }
  },
  generate_random: {
    name: 'generate_random',
    description: 'Generate random numbers or strings',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['number', 'string', 'uuid'],
          description: 'Type of random value to generate'
        },
        min: {
          type: 'number',
          description: 'Minimum value for random number'
        },
        max: {
          type: 'number',
          description: 'Maximum value for random number'
        },
        length: {
          type: 'number',
          description: 'Length for random string'
        }
      },
      required: ['type']
    }
  }
};

export class ToolManager {
  private tools: Map<string, ToolFunction> = new Map();
  private handlers: Map<string, (args: any) => Promise<string> | string> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools(): void {
    // Calculator
    this.registerTool(BUILT_IN_TOOLS.calculate, (args: { expression: string }) => {
      try {
        // Simple math expression evaluator (in production, use a proper math library)
        const result = this.evaluateMathExpression(args.expression);
        return `Result: ${result}`;
      } catch (error) {
        return `Error: ${error}`;
      }
    });

    // Current time
    this.registerTool(BUILT_IN_TOOLS.get_current_time, (args: { timezone?: string }) => {
      const date = new Date();
      if (args.timezone) {
        try {
          return date.toLocaleString('en-US', { timeZone: args.timezone, dateStyle: 'full', timeStyle: 'long' });
        } catch {
          return `Invalid timezone. Current UTC time: ${date.toISOString()}`;
        }
      }
      return date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });
    });

    // Random generator
    this.registerTool(BUILT_IN_TOOLS.generate_random, (args: any) => {
      switch (args.type) {
        case 'number':
          const min = args.min || 0;
          const max = args.max || 100;
          const randomNum = Math.random() * (max - min) + min;
          return `Random number: ${randomNum}`;
        
        case 'string':
          const length = args.length || 10;
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return `Random string: ${result}`;
        
        case 'uuid':
          // Simple UUID v4 generator
          const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          return `UUID: ${uuid}`;
        
        default:
          return 'Invalid type specified';
      }
    });
  }

  registerTool(
    tool: ToolFunction,
    handler: (args: any) => Promise<string> | string
  ): void {
    this.tools.set(tool.name, tool);
    this.handlers.set(tool.name, handler);
    displayInfo(`Registered tool: ${tool.name}`);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values()).map(func => ({
      type: 'function' as const,
      function: func
    }));
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResponse> {
    const handler = this.handlers.get(toolCall.function.name);
    
    if (!handler) {
      return {
        role: 'tool',
        content: `Error: Unknown tool "${toolCall.function.name}"`,
        tool_call_id: toolCall.id
      };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await handler(args);
      
      return {
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id
      };
    } catch (error) {
      return {
        role: 'tool',
        content: `Error executing tool: ${error}`,
        tool_call_id: toolCall.id
      };
    }
  }

  private evaluateMathExpression(expr: string): number {
    // Remove any potentially dangerous characters
    const sanitized = expr.replace(/[^0-9+\-*/().^\s]/g, '');
    
    // Basic math functions
    const math = {
      sqrt: Math.sqrt,
      pow: Math.pow,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      log: Math.log,
      abs: Math.abs,
      pi: Math.PI,
      e: Math.E
    };

    // Create a function that evaluates the expression
    try {
      const func = new Function(...Object.keys(math), `return ${sanitized}`);
      return func(...Object.values(math));
    } catch (error) {
      throw new Error('Invalid mathematical expression');
    }
  }
}

export function formatToolsForAPI(tools: Tool[]): any[] {
  return tools.map(tool => ({
    type: tool.type,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }
  }));
}
