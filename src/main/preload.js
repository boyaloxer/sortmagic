const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations (read)
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
  
  // File operations (write)
  moveFile: (source, destination) => 
    ipcRenderer.invoke('move-file', source, destination),
  copyFile: (source, destination) => 
    ipcRenderer.invoke('copy-file', source, destination),
  deleteFile: (filePath) => 
    ipcRenderer.invoke('delete-file', filePath),
  renameFile: (oldPath, newPath) => 
    ipcRenderer.invoke('rename-file', oldPath, newPath),
  createFolder: (folderPath) => 
    ipcRenderer.invoke('create-folder', folderPath),
  createFile: (filePath, content) => 
    ipcRenderer.invoke('create-file', filePath, content),
  writeFile: (filePath, content) => 
    ipcRenderer.invoke('write-file', filePath, content),
  
  // Batch operations
  batchOperations: (operations) => 
    ipcRenderer.invoke('batch-operations', operations),
  
  // Organization
  organizeFiles: (files, strategy) => 
    ipcRenderer.invoke('organize-files', files, strategy),
  
  // AI operations
  suggestOrganization: (files, userQuery) => 
    ipcRenderer.invoke('ai-suggest-organization', files, userQuery),
  detectProjects: (files) => 
    ipcRenderer.invoke('ai-detect-projects', files),
  suggestRenames: (files) => 
    ipcRenderer.invoke('ai-suggest-renames', files),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close')
});
