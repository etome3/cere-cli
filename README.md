# Cere-CLI 🚀

A powerful and intuitive command-line interface for interacting with AI through the Cerebras API. Experience the world's fastest AI inference with a feature-rich terminal application.

## Features ✨

### Core Features
- **Interactive Chat Interface** - Engage in natural conversations with AI
- **Streaming Responses** - See AI responses as they're generated in real-time
- **Multiple AI Models** - Switch between available Cerebras models
- **Conversation History** - Save and load previous conversations
- **File Operations** - Read files and include them in your chat context
- **Export Conversations** - Save chats in Markdown, JSON, or plain text
- **Search History** - Find specific content across all your conversations
- **Markdown Rendering** - Beautiful formatting for code blocks and rich text
- **Syntax Highlighting** - Automatic language detection for code snippets
- **Theme Support** - Choose from multiple color themes
- **Clipboard Integration** - Copy AI responses with a single command

### Advanced Features
- **System Prompts** - Set custom instructions for AI behavior
- **Temperature Control** - Adjust response creativity (0-2)
- **Token Management** - Control response length
- **Tool Use Support** - Enable AI to use built-in tools (calculator, time, random)
- **Auto-save** - Automatically save conversations
- **Configuration Management** - Persistent settings across sessions

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cere-cli.git
cd cere-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Setup

### 1. Get a Cerebras API Key
Visit [Cerebras Cloud](https://cloud.cerebras.ai/) to obtain your API key.

### 2. Configure the CLI

#### Interactive Setup (Recommended)
```bash
cere init
```

#### Manual Configuration
```bash
cere config --api-key YOUR_API_KEY
```

#### Environment Variable
```bash
export CEREBRAS_API_KEY=your_api_key_here
```

## Usage

### Starting a Chat Session
```bash
# Start interactive chat
cere

# Or explicitly
cere chat

# With a system prompt
cere chat --system "You are a helpful coding assistant"

# Send a single message
cere chat -m "What is the weather like today?"
```

### Chat Commands

During a chat session, you can use these commands:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear the current conversation |
| `/save` | Save the conversation |
| `/history` | Browse and load previous conversations |
| `/copy` | Copy the last AI response to clipboard |
| `/file [path]` | Read a file and include it in the conversation |
| `/export [path]` | Export the conversation to a file |
| `/search [query]` | Search through conversation history |
| `/model [name]` | Change or view available models |
| `/system [prompt]` | Set a new system prompt |
| `/temp [0-2]` | Set temperature (creativity level) |
| `/tokens [number]` | Set maximum response length |
| `/theme [name]` | Change color theme |
| `/exit` or `/quit` | Exit the chat |

### Configuration

```bash
# Set API key
cere config --api-key YOUR_KEY

# Set default model
cere config --model llama3.1-70b

# Set temperature
cere config --temperature 0.7

# Set max tokens
cere config --max-tokens 2048

# Set theme
cere config --theme colorful

# Enable/disable conversation history
cere config --history true

# Show current configuration
cere config --show

# Reset to defaults
cere config --reset
```

### Available Models

```bash
# List all available models
cere models
```

Current models include:
- `llama3.1-8b` - Fast and efficient
- `llama3.1-70b` - More capable, larger model

## Examples

### Reading Files
```bash
# In chat:
/file example.py
# The AI will analyze the file and you can ask questions about it
```

### Exporting Conversations
```bash
# In chat:
/export
# Follow the prompts to choose format and filename

# Or specify directly:
/export my-conversation.md
```

### Searching History
```bash
# In chat:
/search python function
# Shows all conversations mentioning "python function"
```

### Using with Scripts
```bash
# Get a quick response
cere chat -m "Explain Docker in one paragraph"

# Use with system prompt
cere chat --system "You are a Linux expert" -m "How do I check disk usage?"

# Pipe input
echo "What is 2+2?" | cere chat -m -
```

## Themes

Available themes:
- `default` - Balanced colors
- `dark` - High contrast dark theme
- `light` - Softer colors
- `colorful` - Vibrant gradient effects (default)

## File Support

Supported file types for reading:
- Programming languages: `.js`, `.ts`, `.py`, `.java`, `.go`, `.rs`, `.cpp`, etc.
- Markup: `.md`, `.html`, `.xml`
- Data: `.json`, `.yaml`, `.csv`
- Scripts: `.sh`, `.bash`, `.ps1`
- Config: `.env`, `.ini`, `.conf`
- And many more...

Maximum file size: 1MB

## Configuration Files

Configuration is stored in:
- Windows: `%APPDATA%\cere-cli\config.json`
- macOS: `~/Library/Application Support/cere-cli/config.json`
- Linux: `~/.config/cere-cli/config.json`

Conversation history is stored in:
- `~/.cere-cli/history/`

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Clean build files
npm run clean
```

## Troubleshooting

### API Key Issues
- Ensure your API key is correctly set
- Check if the key has proper permissions
- Verify network connectivity

### File Reading Issues
- Check file permissions
- Ensure file size is under 1MB
- Verify file encoding is UTF-8

### Performance Tips
- Use streaming for better responsiveness
- Adjust max tokens for faster responses
- Clear conversation history periodically

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Support

- Report issues on [GitHub Issues](https://github.com/yourusername/cere-cli/issues)
- Check the [Cerebras Documentation](https://inference-docs.cerebras.ai/)
- Join our [Discord Community](https://discord.gg/cerebras)

---

Built with ❤️ using the Cerebras API - The Fastest AI Inference
