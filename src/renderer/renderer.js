// Global state
let currentDirectory = null;
let currentFiles = [];
let selectedFile = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Check if electronAPI is available
  if (!window.electronAPI) {
    const errorMsg = 'electronAPI is not available. Make sure preload.js ' +
                     'is loaded correctly.';
    console.error(errorMsg);
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; 
                  justify-content: center; height: 100vh; 
                  color: #ff6b6b; font-size: 16px;">
        <p>Error: Electron API not available. Please restart the application.</p>
      </div>
    `;
    return;
  }
  
  setupEventListeners();
  setupTitleBarControls();
});

// Setup all event listeners
function setupEventListeners() {
  // Folder selection
  document.getElementById('select-folder').addEventListener('click', selectFolder);
  
  // Chat functionality
  document.getElementById('send-message').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Quick action buttons
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
  });
  
  // Search functionality
  document.querySelector('.search-bar').addEventListener('input', (e) => {
    filterFiles(e.target.value);
  });
}

// Title bar controls
function setupTitleBarControls() {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  
  document.querySelector('.minimize')?.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  document.querySelector('.maximize')?.addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });
  
  document.querySelector('.close')?.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
}

// Select folder dialog
async function selectFolder() {
  if (!window.electronAPI?.selectDirectory) {
    console.error('selectDirectory not available');
    return;
  }
  
  try {
    const folderPath = await window.electronAPI.selectDirectory();
    if (folderPath) {
      currentDirectory = folderPath;
      await loadDirectory(folderPath);
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    addChatMessage('Error: Failed to select folder. ' + error.message, 'assistant');
  }
}

// Load directory contents
async function loadDirectory(dirPath) {
  if (!window.electronAPI?.readDirectory) {
    console.error('readDirectory not available');
    return;
  }
  
  try {
    const files = await window.electronAPI.readDirectory(dirPath);
    currentFiles = files;
    displayFileTree(files);
    updateStats(files);
  } catch (error) {
    console.error('Error loading directory:', error);
    addChatMessage('Error: Failed to load directory. ' + error.message, 
                   'assistant');
  }
}

// Display file tree
function displayFileTree(files) {
  const fileTree = document.getElementById('file-tree');
  
  if (files.length === 0) {
    fileTree.innerHTML = `
      <div class="empty-state">
        <p>This folder is empty</p>
      </div>
    `;
    return;
  }
  
  // Sort: directories first, then files
  files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  
  fileTree.innerHTML = files.map(file => {
    // Escape file paths and names to prevent injection attacks
    const escapedPath = escapeHtml(file.path);
    const escapedName = escapeHtml(file.name);
    const directoryClass = file.isDirectory ? 'directory' : '';
    
    return `
      <div class="file-item ${directoryClass}" 
           data-path="${escapedPath}" 
           data-is-directory="${file.isDirectory}">
        <span class="file-icon">${getFileIcon(file)}</span>
        <span class="file-name">${escapedName}</span>
        ${!file.isDirectory ? `<span class="file-size">${formatFileSize(file.size)}</span>` : ''}
      </div>
    `;
  }).join('');
  
  // Add click handlers
  fileTree.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => selectFile(item));
    if (item.dataset.isDirectory === 'true') {
      item.addEventListener('dblclick', () => {
        loadDirectory(item.dataset.path);
      });
    }
  });
}

// Select a file
async function selectFile(element) {
  // Remove previous selection
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  element.classList.add('selected');
  
  const filePath = element.dataset.path;
  const isDirectory = element.dataset.isDirectory === 'true';
  
  selectedFile = currentFiles.find(f => f.path === filePath);
  
  // Update file name in center panel
  document.getElementById('current-file-name').textContent = selectedFile.name;
  
  if (!isDirectory) {
    // Load file content
    if (!window.electronAPI?.readFileContent) {
      console.error('readFileContent not available');
      return;
    }
    
    try {
      const result = await window.electronAPI.readFileContent(filePath);
      displayFileContent(result);
      displayFileDetails(selectedFile);
    } catch (error) {
      console.error('Error reading file:', error);
      displayFileContent({ type: 'error', content: error.message });
    }
  } else {
    displayDirectoryInfo(selectedFile);
  }
}

// Display file content
function displayFileContent(result) {
  const preview = document.getElementById('file-preview');
  
  if (result.type === 'text') {
    // Add line numbers for text files
    const lines = result.content.split('\n');
    const numbered = lines.map((line, i) => 
      `<span style="color: #858585; margin-right: 15px;">${(i + 1).toString().padStart(4)}</span>${escapeHtml(line)}`
    ).join('\n');
    
    preview.innerHTML = `<pre>${numbered}</pre>`;
  } else if (result.type === 'binary') {
    preview.innerHTML = `
      <div class="empty-state">
        <div class="file-icon">💾</div>
        <p>${result.content}</p>
        <p class="hint">Binary files cannot be displayed as text</p>
      </div>
    `;
  } else {
    preview.innerHTML = `
      <div class="empty-state">
        <div class="file-icon">⚠️</div>
        <p>Error loading file</p>
        <p class="hint">${result.content}</p>
      </div>
    `;
  }
}

// Display file details
function displayFileDetails(file) {
  const details = document.getElementById('file-details');
  details.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Type:</span>
      <span class="detail-value">${file.extension || 'No extension'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Size:</span>
      <span class="detail-value">${formatFileSize(file.size)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Modified:</span>
      <span class="detail-value">${new Date(file.modified).toLocaleString()}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Created:</span>
      <span class="detail-value">${new Date(file.created).toLocaleString()}</span>
    </div>
  `;
}

// Display directory info
function displayDirectoryInfo(dir) {
  const preview = document.getElementById('file-preview');
  preview.innerHTML = `
    <div class="empty-state">
      <div class="file-icon">📁</div>
      <p>${dir.name}</p>
      <p class="hint">Double-click to open folder</p>
    </div>
  `;
  
  const details = document.getElementById('file-details');
  details.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Type:</span>
      <span class="detail-value">Folder</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Modified:</span>
      <span class="detail-value">${new Date(dir.modified).toLocaleString()}</span>
    </div>
  `;
}

// Update statistics
function updateStats(files) {
  const fileCount = files.filter(f => !f.isDirectory).length;
  const folderCount = files.filter(f => f.isDirectory).length;
  
  document.getElementById('folder-stats').innerHTML = `
    <span class="stat-item">${fileCount} files</span>
    <span class="stat-item">${folderCount} folders</span>
  `;
}

// Filter files based on search
function filterFiles(query) {
  if (!currentFiles.length) return;
  
  const filtered = query 
    ? currentFiles.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : currentFiles;
  
  displayFileTree(filtered);
}

// Chat functionality
function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  addChatMessage(message, 'user');
  
  // Clear input
  input.value = '';
  
  // Process message (this would connect to AI in a real app)
  setTimeout(() => {
    processAICommand(message);
  }, 500);
}

// Add message to chat
function addChatMessage(content, type = 'assistant') {
  const messagesContainer = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  
  // Escape HTML to prevent XSS attacks
  const escapedContent = escapeHtml(content);
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
    <div class="message-content">
      <p>${escapedContent.replace(/\n/g, '<br>')}</p>
    </div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Process AI commands
async function processAICommand(command) {
  if (!currentFiles.length) {
    addChatMessage("Please select a folder first to organize files.", 
                   'assistant');
    return;
  }
  
  if (!window.electronAPI?.suggestOrganization) {
    // Fallback to basic commands without AI
    await processBasicCommand(command);
    return;
  }
  
  const lowerCommand = command.toLowerCase();
  
  // Try AI-powered organization first
  if (lowerCommand.includes('organize') && lowerCommand.includes('project')) {
    await organizeByProject();
  } else if (lowerCommand.includes('organize')) {
    // Use AI for organization suggestions
    try {
      const organized = await window.electronAPI.suggestOrganization(
        currentFiles, 
        command
      );
      
      let message = "Here's my suggested organization:\n\n";
      for (const [category, files] of Object.entries(organized)) {
        message += `• ${category}: ${files.length} files\n`;
      }
      message += "\nWould you like me to create folders and move these files?";
      addChatMessage(message, 'assistant');
    } catch (error) {
      console.error('AI organization error:', error);
      // Fallback to basic organization
      await processBasicCommand(command);
    }
  } else if (lowerCommand.includes('duplicate')) {
    findDuplicates();
  } else if (lowerCommand.includes('large') || lowerCommand.includes('biggest')) {
    findLargeFiles();
  } else {
    // Use AI for general queries
    try {
      const organized = await window.electronAPI.suggestOrganization(
        currentFiles, 
        command
      );
      let message = "Based on your request, here's my suggestion:\n\n";
      for (const [category, files] of Object.entries(organized)) {
        message += `• ${category}: ${files.length} files\n`;
      }
      addChatMessage(message, 'assistant');
    } catch (error) {
      const helpMsg = "I can help you organize files by type, date, or " +
                      "project, find duplicates, or identify large files. " +
                      "What would you like to do?";
      addChatMessage(helpMsg, 'assistant');
    }
  }
}

// Fallback to basic commands without AI
async function processBasicCommand(command) {
  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('organize') && lowerCommand.includes('type')) {
    await organizeByType();
  } else if (lowerCommand.includes('organize') && lowerCommand.includes('date')) {
    await organizeByDate();
  } else if (lowerCommand.includes('duplicate')) {
    findDuplicates();
  } else if (lowerCommand.includes('large') || lowerCommand.includes('biggest')) {
    findLargeFiles();
  } else {
    addChatMessage("I can help you organize files by type, date, find " +
                   "duplicates, or identify large files. What would you like to do?", 
                   'assistant');
  }
}

// Handle quick actions
function handleQuickAction(action) {
  switch(action) {
    case 'organize-by-type':
      organizeByType();
      break;
    case 'organize-by-date':
      organizeByDate();
      break;
    case 'organize-by-project':
      organizeByProject();
      break;
    case 'find-duplicates':
      findDuplicates();
      break;
  }
}

// Organize files by type
async function organizeByType() {
  if (!window.electronAPI?.organizeFiles) {
    console.error('organizeFiles not available');
    return;
  }
  
  try {
    const organized = await window.electronAPI.organizeFiles(currentFiles, 
                                                              'by-type');
    
    let message = "I've analyzed your files and found:\n\n";
    for (const [ext, files] of Object.entries(organized)) {
      message += `• ${ext}: ${files.length} files\n`;
    }
    message += "\nWould you like me to create folders and move these files?";
    
    addChatMessage(message, 'assistant');
  } catch (error) {
    console.error('Error organizing files:', error);
    addChatMessage('Error: Failed to organize files. ' + error.message, 
                   'assistant');
  }
}

// Organize by date
async function organizeByDate() {
  const filesByMonth = {};
  
  currentFiles.forEach(file => {
    if (!file.isDirectory) {
      const date = new Date(file.modified);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!filesByMonth[key]) {
        filesByMonth[key] = [];
      }
      filesByMonth[key].push(file);
    }
  });
  
  let message = "Files organized by month:\n\n";
  for (const [month, files] of Object.entries(filesByMonth)) {
    message += `• ${month}: ${files.length} files\n`;
  }
  
  addChatMessage(message, 'assistant');
}

// Organize by project using AI
async function organizeByProject() {
  if (!window.electronAPI?.detectProjects) {
    addChatMessage("AI features are not available. Please configure your " +
                   "OpenAI API key in the .env file.", 'assistant');
    return;
  }
  
  try {
    addChatMessage("Analyzing files to detect projects...", 'assistant');
    const projects = await window.electronAPI.detectProjects(currentFiles);
    
    if (Object.keys(projects).length === 0) {
      addChatMessage("I couldn't detect clear project groupings. Try " +
                     "organizing by type or date instead.", 'assistant');
      return;
    }
    
    let message = "I've detected the following projects:\n\n";
    for (const [project, files] of Object.entries(projects)) {
      message += `• ${project}: ${Array.isArray(files) ? files.length : 'various'} files\n`;
    }
    message += "\nWould you like me to create folders and organize these files?";
    
    addChatMessage(message, 'assistant');
  } catch (error) {
    console.error('Error detecting projects:', error);
    addChatMessage("I had trouble detecting projects. You can try organizing " +
                   "by type or date instead.", 'assistant');
  }
}

// Find duplicate files
function findDuplicates() {
  const sizeMap = {};
  const duplicates = [];
  
  currentFiles.forEach(file => {
    if (!file.isDirectory) {
      if (!sizeMap[file.size]) {
        sizeMap[file.size] = [];
      }
      sizeMap[file.size].push(file);
    }
  });
  
  for (const [size, files] of Object.entries(sizeMap)) {
    if (files.length > 1) {
      duplicates.push(files);
    }
  }
  
  if (duplicates.length > 0) {
    let message = `Found ${duplicates.length} groups of potential duplicates:\n\n`;
    duplicates.forEach((group, i) => {
      message += `Group ${i + 1} (${formatFileSize(group[0].size)}):\n`;
      group.forEach(file => {
        message += `  • ${file.name}\n`;
      });
    });
    addChatMessage(message, 'assistant');
  } else {
    addChatMessage("No duplicate files found based on file size.", 'assistant');
  }
}

// Find large files
function findLargeFiles() {
  const largeFiles = currentFiles
    .filter(f => !f.isDirectory)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  let message = "Top 10 largest files:\n\n";
  largeFiles.forEach((file, i) => {
    message += `${i + 1}. ${file.name} - ${formatFileSize(file.size)}\n`;
  });
  
  addChatMessage(message, 'assistant');
}

// Utility functions
function getFileIcon(file) {
  if (file.isDirectory) return '📁';
  
  const ext = file.extension?.toLowerCase();
  const iconMap = {
    '.txt': '📝', '.md': '📝', '.doc': '📄', '.docx': '📄',
    '.pdf': '📕', '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️',
    '.gif': '🖼️', '.mp4': '🎬', '.mov': '🎬', '.avi': '🎬',
    '.mp3': '🎵', '.wav': '🎵', '.zip': '📦', '.rar': '📦',
    '.js': '📜', '.py': '🐍', '.html': '🌐', '.css': '🎨',
    '.json': '📋', '.xml': '📋', '.exe': '⚙️', '.app': '⚙️'
  };
  
  return iconMap[ext] || '📄';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
