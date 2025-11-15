// Load environment variables from .env file
require('dotenv').config();

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const AIOrganizer = require('../services/ai-service');

let mainWindow;

// Initialize AI service
let aiService = null;
function initializeAIService() {
  try {
    // Try to load API key from environment or .env file
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      aiService = new AIOrganizer(apiKey);
      console.log('AI service initialized');
    } else {
      console.warn('OpenAI API key not found. AI features will be limited.');
    }
  } catch (error) {
    console.error('Failed to initialize AI service:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Only open DevTools in development mode
  const isDev = process.argv.includes('--dev') || 
                process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  initializeAIService();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Recreate window on macOS when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for file operations
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const fileData = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = await fs.stat(fullPath);
      
      fileData.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        extension: item.isDirectory() ? null : path.extname(item.name)
      });
    }
    
    return fileData;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.json', '.js', '.html', '.css', '.py', '.cpp', '.java'];
    
    if (textExtensions.includes(ext)) {
      const content = await fs.readFile(filePath, 'utf-8');
      return { type: 'text', content };
    } else {
      return { type: 'binary', content: `Binary file: ${path.basename(filePath)}` };
    }
  } catch (error) {
    return { type: 'error', content: error.message };
  }
});

ipcMain.handle('move-file', async (event, sourcePath, destinationPath) => {
  try {
    await fs.rename(sourcePath, destinationPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('organize-files', async (event, files, strategy) => {
  // Simple organization by file type (fallback)
  const organized = {};
  
  for (const file of files) {
    if (!file.isDirectory) {
      const ext = file.extension || 'no-extension';
      if (!organized[ext]) {
        organized[ext] = [];
      }
      organized[ext].push(file);
    }
  }
  
  return organized;
});

// AI IPC Handlers
ipcMain.handle('ai-suggest-organization', async (event, files, userQuery) => {
  if (!aiService) {
    // Fallback to basic organization
    return new AIOrganizer().fallbackOrganization(files);
  }
  
  try {
    return await aiService.suggestOrganization(files, userQuery);
  } catch (error) {
    console.error('AI organization error:', error);
    return new AIOrganizer().fallbackOrganization(files);
  }
});

ipcMain.handle('ai-detect-projects', async (event, files) => {
  if (!aiService) {
    return {};
  }
  
  try {
    return await aiService.detectProjects(files);
  } catch (error) {
    console.error('AI project detection error:', error);
    return {};
  }
});

ipcMain.handle('ai-suggest-renames', async (event, files) => {
  if (!aiService) {
    return [];
  }
  
  try {
    return await aiService.suggestRenames(files);
  } catch (error) {
    console.error('AI rename suggestion error:', error);
    return [];
  }
});

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
