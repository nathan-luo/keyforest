const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    saveShortcuts: (data) => {
      return ipcRenderer.invoke('save-shortcuts', data);
    },
    loadShortcuts: (appId) => {
      return ipcRenderer.invoke('load-shortcuts', { appId });
    },
    getApps: () => {
      return ipcRenderer.invoke('get-apps');
    },
    saveApp: (app) => {
      return ipcRenderer.invoke('save-app', app);
    },
    deleteApp: (appId) => {
      return ipcRenderer.invoke('delete-app', appId);
    },
    // Export/Import functionality
    exportShortcuts: (data) => {
      return ipcRenderer.invoke('export-shortcuts', data);
    },
    importShortcuts: () => {
      return ipcRenderer.invoke('import-shortcuts');
    },
    // Migration for icon removal
    migrateAppsData: () => {
      return ipcRenderer.invoke('migrate-apps-data');
    },
    onLoadShortcutsReply: (callback) => {
      ipcRenderer.on('load-shortcuts-reply', (event, ...args) => callback(...args));
    },
    onSaveShortcutsReply: (callback) => {
      ipcRenderer.on('save-shortcuts-reply', (event, ...args) => callback(...args));
    },
    // For backward compatibility until renderer code is updated
    legacyIpcRenderer: {
      send: (channel, data) => {
        // Only allow specific channels
        const validChannels = ['save-shortcuts', 'load-shortcuts'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      on: (channel, func) => {
        const validChannels = ['load-shortcuts-reply', 'save-shortcuts-reply'];
        if (validChannels.includes(channel)) {
          // Strip event as it includes `sender` 
          ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
        }
      }
    }
  }
); 