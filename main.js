const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to avoid it being garbage collected
let mainWindow;

// Path to our shortcuts data file
const userDataPath = app.getPath('userData');
const shortcutsFilePath = path.join(userDataPath, 'shortcuts.json');
const appsFilePath = path.join(userDataPath, 'apps.json'); // New file for apps list

// Set to true for development, false for production
const isDev = process.env.NODE_ENV === 'development' || false;

function createWindow() {
  // Get screen dimensions
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: Math.min(1600, width * 0.9),
    height: Math.min(1000, height * 0.9),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add an icon when you have one
    title: 'KeyForest - Keyboard Shortcut Visualizer',
    show: false, // Don't show until ready
    center: true // Center on screen
  });

  // Maximize the window
  mainWindow.maximize();

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools during development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // When the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Create the window when Electron has finished initializing
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS re-create a window when the dock icon is clicked and no other windows are open
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle saving shortcuts to file - new invoke style
ipcMain.handle('save-shortcuts', async (event, data) => {
  try {
    // Create user data directory if it doesn't exist
    if (!fs.existsSync(path.dirname(shortcutsFilePath))) {
      fs.mkdirSync(path.dirname(shortcutsFilePath), { recursive: true });
    }
    
    // Validate the shortcuts object before saving
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid shortcuts data');
    }
    
    // Extract app and shortcuts data
    const { appId, shortcuts } = data;
    
    if (!appId || typeof appId !== 'string') {
      throw new Error('Invalid application ID');
    }
    
    // Ensure all required modifier categories exist
    const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
    requiredModifiers.forEach(modifier => {
      if (!shortcuts[modifier]) {
        shortcuts[modifier] = {};
      }
    });
    
    // Load existing shortcuts
    let allShortcuts = {};
    if (fs.existsSync(shortcutsFilePath)) {
      try {
        const fileData = fs.readFileSync(shortcutsFilePath, 'utf8');
        allShortcuts = JSON.parse(fileData);
      } catch (error) {
        console.error('Error reading shortcuts file:', error);
        // Continue with empty object if file exists but can't be parsed
      }
    }
    
    // Update with new shortcuts for the app
    allShortcuts[appId] = shortcuts;
    
    fs.writeFileSync(shortcutsFilePath, JSON.stringify(allShortcuts, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving shortcuts:', error);
    return { success: false, error: error.message };
  }
});

// Handle loading shortcuts from file - new invoke style
ipcMain.handle('load-shortcuts', async (event, { appId }) => {
  try {
    if (fs.existsSync(shortcutsFilePath)) {
      const data = fs.readFileSync(shortcutsFilePath, 'utf8');
      const allShortcuts = JSON.parse(data);
      
      let shortcuts = allShortcuts[appId] || {};
      
      // Ensure all required modifier categories exist
      const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
      requiredModifiers.forEach(modifier => {
        if (!shortcuts[modifier]) {
          shortcuts[modifier] = {};
        }
      });
      
      return { success: true, shortcuts };
    } else {
      // If file doesn't exist yet, return default structure
      return { 
        success: true, 
        shortcuts: {
          plain: {},
          ctrl: {},
          alt: {},
          ctrl_shift: {},
          ctrl_alt: {},
          ctrl_alt_shift: {}
        } 
      };
    }
  } catch (error) {
    console.error('Error loading shortcuts:', error);
    return { success: false, error: error.message };
  }
});

// New handler to get all applications
ipcMain.handle('get-apps', async (event) => {
  try {
    let apps = [];
    
    // Load apps list if exists
    if (fs.existsSync(appsFilePath)) {
      const data = fs.readFileSync(appsFilePath, 'utf8');
      apps = JSON.parse(data);
    } else {
      // Create default app if no file exists
      apps = [
        { id: 'default', name: 'Default', icon: 'far fa-keyboard' }
      ];
      // Save the default apps
      fs.writeFileSync(appsFilePath, JSON.stringify(apps, null, 2));
    }
    
    return { success: true, apps };
  } catch (error) {
    console.error('Error getting apps:', error);
    return { success: false, error: error.message };
  }
});

// New handler to add/update an application
ipcMain.handle('save-app', async (event, app) => {
  try {
    if (!app || !app.id || !app.name) {
      throw new Error('Invalid app data');
    }
    
    // Load existing apps
    let apps = [];
    if (fs.existsSync(appsFilePath)) {
      const data = fs.readFileSync(appsFilePath, 'utf8');
      apps = JSON.parse(data);
    }
    
    // Check if app exists and update it, or add a new one
    const existingAppIndex = apps.findIndex(a => a.id === app.id);
    if (existingAppIndex >= 0) {
      apps[existingAppIndex] = app;
    } else {
      apps.push(app);
    }
    
    fs.writeFileSync(appsFilePath, JSON.stringify(apps, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving app:', error);
    return { success: false, error: error.message };
  }
});

// New handler to delete an application
ipcMain.handle('delete-app', async (event, appId) => {
  try {
    if (!appId) {
      throw new Error('Invalid app ID');
    }
    
    // Don't allow deleting the default app
    if (appId === 'default') {
      throw new Error('Cannot delete the default app');
    }
    
    // Load existing apps
    if (fs.existsSync(appsFilePath)) {
      const data = fs.readFileSync(appsFilePath, 'utf8');
      let apps = JSON.parse(data);
      
      // Remove the app
      apps = apps.filter(a => a.id !== appId);
      
      fs.writeFileSync(appsFilePath, JSON.stringify(apps, null, 2));
      
      // Also remove the app's shortcuts
      if (fs.existsSync(shortcutsFilePath)) {
        const shortcutsData = fs.readFileSync(shortcutsFilePath, 'utf8');
        let allShortcuts = JSON.parse(shortcutsData);
        
        // Remove the app's shortcuts
        delete allShortcuts[appId];
        
        fs.writeFileSync(shortcutsFilePath, JSON.stringify(allShortcuts, null, 2));
      }
      
      return { success: true };
    } else {
      return { success: false, error: 'No apps file found' };
    }
  } catch (error) {
    console.error('Error deleting app:', error);
    return { success: false, error: error.message };
  }
});

// For backward compatibility - keep the old handlers
// Handle saving shortcuts to file
ipcMain.on('save-shortcuts', (event, shortcuts) => {
  try {
    // Create user data directory if it doesn't exist
    if (!fs.existsSync(path.dirname(shortcutsFilePath))) {
      fs.mkdirSync(path.dirname(shortcutsFilePath), { recursive: true });
    }
    
    // Validate the shortcuts object before saving
    if (!shortcuts || typeof shortcuts !== 'object') {
      throw new Error('Invalid shortcuts data');
    }
    
    // Ensure all required modifier categories exist
    const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
    requiredModifiers.forEach(modifier => {
      if (!shortcuts[modifier]) {
        shortcuts[modifier] = {};
      }
    });
    
    fs.writeFileSync(shortcutsFilePath, JSON.stringify(shortcuts, null, 2));
    event.reply('save-shortcuts-reply', { success: true });
  } catch (error) {
    console.error('Error saving shortcuts:', error);
    event.reply('save-shortcuts-reply', { success: false, error: error.message });
  }
});

// Handle loading shortcuts from file
ipcMain.on('load-shortcuts', (event) => {
  try {
    if (fs.existsSync(shortcutsFilePath)) {
      const data = fs.readFileSync(shortcutsFilePath, 'utf8');
      const shortcuts = JSON.parse(data);
      
      // Ensure all required modifier categories exist
      const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
      requiredModifiers.forEach(modifier => {
        if (!shortcuts[modifier]) {
          shortcuts[modifier] = {};
        }
      });
      
      event.reply('load-shortcuts-reply', { success: true, shortcuts });
    } else {
      // If file doesn't exist yet, return default structure
      event.reply('load-shortcuts-reply', { 
        success: true, 
        shortcuts: {
          plain: {},
          ctrl: {},
          alt: {},
          ctrl_shift: {},
          ctrl_alt: {},
          ctrl_alt_shift: {}
        } 
      });
    }
  } catch (error) {
    console.error('Error loading shortcuts:', error);
    event.reply('load-shortcuts-reply', { success: false, error: error.message });
  }
});

// New handler to export shortcuts to a file
ipcMain.handle('export-shortcuts', async (event, data) => {
  try {
    if (!data || !data.shortcuts || !data.appId || !data.appName) {
      throw new Error('Invalid export data');
    }
    
    // Open save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Shortcuts',
      defaultPath: path.join(app.getPath('downloads'), `keyforest-${data.appName.toLowerCase().replace(/\s+/g, '-')}.json`),
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export canceled' };
    }
    
    // Write the data to the file
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Error exporting shortcuts:', error);
    return { success: false, error: error.message };
  }
});

// New handler to import shortcuts from a file
ipcMain.handle('import-shortcuts', async (event) => {
  try {
    // Open file dialog
    const result = await dialog.showOpenDialog({
      title: 'Import Shortcuts',
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Import canceled' };
    }
    
    // Read the file
    const filePath = result.filePaths[0];
    const fileData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileData);
    
    // Validate the imported data
    if (!data || !data.shortcuts || !data.appId || !data.appName) {
      throw new Error('Invalid import file format');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error importing shortcuts:', error);
    return { success: false, error: error.message };
  }
});

// Fix potential compatibility issues with older apps.json files that include icons
ipcMain.handle('migrate-apps-data', async (event) => {
  try {
    if (fs.existsSync(appsFilePath)) {
      const data = fs.readFileSync(appsFilePath, 'utf8');
      let apps = JSON.parse(data);
      
      // Remove icon property from all apps if it exists
      let hasChanged = false;
      apps.forEach(app => {
        if (app.hasOwnProperty('icon')) {
          delete app.icon;
          hasChanged = true;
        }
      });
      
      // Only write back if changes were made
      if (hasChanged) {
        fs.writeFileSync(appsFilePath, JSON.stringify(apps, null, 2));
      }
      
      return { success: true };
    }
    return { success: true, message: 'No apps file to migrate' };
  } catch (error) {
    console.error('Error migrating apps data:', error);
    return { success: false, error: error.message };
  }
}); 