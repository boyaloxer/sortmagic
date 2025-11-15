# File Organizer - AI-Powered File Management

A modern file organization tool with a Cursor-like interface that uses AI to intelligently organize your files and folders.

## Features

### 🎨 Cursor-Like Interface
- **Three-panel layout**: File tree, preview, and AI chat
- **Dark theme** optimized for long working sessions
- **Real-time file preview** with syntax highlighting
- **Detailed file metadata** display

### 🤖 AI-Powered Organization
- **Smart categorization** by file type, date, or project
- **Duplicate detection** to clean up redundant files
- **Intelligent renaming** suggestions
- **Project detection** from file patterns
- **Natural language commands** for organization tasks

### 📁 File Management
- **Batch operations** for moving and organizing files
- **Search and filter** across your directories
- **File statistics** and insights
- **Safe preview** before applying changes

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/file-organizer.git
cd file-organizer
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up OpenAI API (Optional for AI features)**
Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your-api-key-here
```

4. **Run the application**
```bash
npm start
```

## Usage

### Basic File Organization

1. Click "Select Folder" to choose a directory
2. Browse files in the left panel
3. Click any file to preview its contents
4. Use quick action buttons or chat to organize

### AI Commands

Type natural language commands in the chat:
- "Organize my files by type"
- "Find all duplicate files"
- "Group files by project"
- "Show me the largest files"
- "Clean up file names"
- "Create a folder structure for a web project"

### Quick Actions

- **By Type**: Organizes files into folders by extension
- **By Date**: Groups files by creation/modification date
- **By Project**: AI detects and groups related files
- **Find Duplicates**: Identifies potentially duplicate files

## Architecture

```
file-organizer/
├── main.js           # Electron main process
├── preload.js        # Secure bridge for IPC
├── renderer.js       # UI logic and interactions
├── index.html        # Main application layout
├── styles.css        # Dark theme styling
├── ai-service.js     # OpenAI integration
└── package.json      # Dependencies and scripts
```

## Technologies

- **Electron**: Cross-platform desktop application
- **Node.js**: File system operations
- **OpenAI API**: Intelligent file analysis
- **HTML/CSS/JS**: User interface

## Roadmap

- [ ] Undo/Redo functionality
- [ ] File content analysis for better grouping
- [ ] Custom organization rules
- [ ] Scheduled organization tasks
- [ ] Cloud storage integration
- [ ] Multi-folder operations
- [ ] Export organization reports
- [ ] Local AI model support

## Development

### Building for Production

```bash
# Windows
npm run dist

# macOS
npm run build

# Linux
npm run build
```

### Adding New Features

1. File operations: Update `main.js` IPC handlers
2. UI features: Modify `renderer.js` and `index.html`
3. AI capabilities: Extend `ai-service.js`
4. Styling: Edit `styles.css`

## Safety Features

- **Preview mode**: See changes before applying
- **Non-destructive**: Original files are moved, not deleted
- **Confirmation dialogs**: For major operations
- **Backup recommendations**: Before bulk operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on GitHub.

---

**Note**: This tool moves files on your system. Always backup important data before performing bulk operations.
