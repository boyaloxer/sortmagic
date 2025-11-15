const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
  moveFile: (source, destination) => ipcRenderer.invoke('move-file', source, destination),
  organizeFiles: (files, strategy) => ipcRenderer.invoke('organize-files', files, strategy),
  
  // AI operations
  suggestOrganization: (files, userQuery) => 
    ipcRenderer.invoke('ai-suggest-organization', files, userQuery),
  detectProjects: (files) => ipcRenderer.invoke('ai-detect-projects', files),
  suggestRenames: (files) => ipcRenderer.invoke('ai-suggest-renames', files),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close')
});
