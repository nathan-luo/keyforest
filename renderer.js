// DOM Elements
const keyboardContainer = document.getElementById('keyboard-container');
const modifierButtons = document.querySelectorAll('.modifier-btn');
const actionModal = document.getElementById('action-modal');
const modalKey = document.getElementById('modal-key');
const actionNameInput = document.getElementById('action-name');
const saveActionBtn = document.getElementById('save-action');
const clearActionBtn = document.getElementById('clear-action');
const cancelActionBtn = document.getElementById('cancel-action');
const tooltip = document.getElementById('tooltip');

// App selector elements
const appSelect = document.getElementById('app-select');
const addAppBtn = document.getElementById('add-app-btn');
const editAppBtn = document.getElementById('edit-app-btn');
const deleteAppBtn = document.getElementById('delete-app-btn');

// App modal elements
const appModal = document.getElementById('app-modal');
const appModalTitle = document.getElementById('app-modal-title');
const appNameInput = document.getElementById('app-name');
const saveAppBtn = document.getElementById('save-app');
const cancelAppBtn = document.getElementById('cancel-app');

// Current state
let currentModifier = 'plain'; // plain, ctrl, alt, ctrl_shift, ctrl_alt, ctrl_alt_shift
let activeButton = null; // Track active button, null means plain mode
let shortcuts = {
  plain: {},
  ctrl: {},
  alt: {},
  ctrl_shift: {},
  ctrl_alt: {},
  ctrl_alt_shift: {}
};
let currentKey = null;
let currentAppId = 'default';
let apps = [];
let isEditingApp = false; // Flag to track if we're editing an existing app

// Keyboard layout definition
const keyboardLayout = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Delete'],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace', 'Home'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'PageUp'],
  ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter', 'PageDown'],
  ['ShiftLeft', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight', 'ArrowUp', 'End'],
  ['ControlLeft', 'Meta', 'AltLeft', 'Space', 'AltRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight']
];

// Mapping for display labels
const keyLabels = {
  'Escape': 'Esc',
  'Backspace': '⌫',
  'Tab': 'Tab ↹',
  'CapsLock': 'Caps',
  'Enter': 'Enter ↵',
  'ShiftLeft': 'Shift ⇧',
  'ShiftRight': 'Shift ⇧',
  'ControlLeft': 'Ctrl',
  'ControlRight': 'Ctrl',
  'AltLeft': 'Alt',
  'AltRight': 'Alt',
  'Meta': 'Win',
  'Space': 'Space',
  // Labels for new keys
  'Insert': 'Ins',
  'Home': 'Home',
  'PageUp': 'PgUp',
  'Delete': 'Del',
  'End': 'End',
  'PageDown': 'PgDn',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→'
};

// Map CSS classes to keys
const keyClasses = {
  'Escape': '',
  'Backspace': 'backspace',
  'Tab': 'tab',
  'CapsLock': 'caps',
  'Enter': 'enter',
  'ShiftLeft': 'shift-left',
  'ShiftRight': 'shift-right',
  'ControlLeft': 'ctrl',
  'ControlRight': 'ctrl',
  'AltLeft': 'alt',
  'AltRight': 'alt',
  'Meta': 'win',
  'Space': 'space',
  // Classes for new keys
  'Insert': 'nav-key',
  'Home': 'nav-key',
  'PageUp': 'nav-key',
  'Delete': 'nav-key',
  'End': 'nav-key',
  'PageDown': 'nav-key',
  'ArrowUp': 'arrow-key',
  'ArrowDown': 'arrow-key',
  'ArrowLeft': 'arrow-key',
  'ArrowRight': 'arrow-key'
};

// Map modifiers to CSS mode classes
const modifierClasses = {
  'plain': 'plain-mode',
  'ctrl': 'ctrl-mode',
  'alt': 'alt-mode',
  'ctrl_shift': 'ctrl-shift-mode',
  'ctrl_alt': 'ctrl-alt-mode',
  'ctrl_alt_shift': 'ctrl-alt-shift-mode'
};

// Get IPC access - fallback for backward compatibility
const ipcRenderer = window.electronAPI?.legacyIpcRenderer || window.ipcRenderer;

// Initialize the keyboard
function initKeyboard() {
  const keyboardEl = document.createElement('div');
  keyboardEl.className = 'keyboard';

  keyboardLayout.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';

    row.forEach(key => {
      const keyEl = document.createElement('div');
      keyEl.className = 'key';
      
      if (keyClasses[key]) {
        keyEl.classList.add(keyClasses[key]);
      }

      keyEl.dataset.key = key;

      const labelEl = document.createElement('div');
      labelEl.className = 'key-label';
      labelEl.textContent = keyLabels[key] || key;
      keyEl.appendChild(labelEl);

      const actionEl = document.createElement('div');
      actionEl.className = 'key-action';
      keyEl.appendChild(actionEl);

      // Add event listeners with safeguards for input fields
      keyEl.addEventListener('click', (e) => {
        // Don't process if we're typing in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }
        openActionModal(key);
      });
      
      // Add hover events for tooltip with safeguards
      keyEl.addEventListener('mouseenter', (e) => {
        // Don't show tooltip if we're interacting with an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }
        showTooltip(e, key);
      });
      
      keyEl.addEventListener('mouseleave', hideTooltip);
      
      keyEl.addEventListener('mousemove', (e) => {
        // Don't process if we're typing in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          hideTooltip();
          return;
        }
        moveTooltip(e);
      });
      
      rowEl.appendChild(keyEl);
    });

    keyboardEl.appendChild(rowEl);
  });

  keyboardContainer.innerHTML = '';
  keyboardContainer.appendChild(keyboardEl);
}

// Update keyboard display based on current modifier
function updateKeyboardDisplay() {
  const keys = document.querySelectorAll('.key');
  
  // First remove all highlighted-modifier classes
  keys.forEach(keyEl => {
    keyEl.classList.remove('highlighted-modifier');
  });
  
  // Then highlight the appropriate physical modifier keys based on current modifier state
  if (currentModifier.includes('ctrl')) {
    document.querySelectorAll('.key.ctrl').forEach(key => {
      key.classList.add('highlighted-modifier');
    });
  }
  
  if (currentModifier.includes('shift')) {
    document.querySelectorAll('.key.shift-left, .key.shift-right').forEach(key => {
      key.classList.add('highlighted-modifier');
    });
  }
  
  if (currentModifier.includes('alt')) {
    document.querySelectorAll('.key.alt').forEach(key => {
      key.classList.add('highlighted-modifier');
    });
  }
  
  // Now update the key actions display
  keys.forEach(keyEl => {
    const key = keyEl.dataset.key;
    const actionEl = keyEl.querySelector('.key-action');
    const action = shortcuts[currentModifier][key];

    // Remove all modifier-specific classes
    Object.values(modifierClasses).forEach(cls => {
      keyEl.classList.remove(cls);
    });

    if (action) {
      keyEl.classList.add('has-action');
      keyEl.classList.add(modifierClasses[currentModifier]);
      
      // Improved truncation logic based on key size
      let maxLength = 12; // Default
      
      if (keyEl.classList.contains('space')) {
        maxLength = 50; // Much longer for spacebar
      } else if (keyEl.classList.contains('backspace') || 
                keyEl.classList.contains('enter')) {
        maxLength = 25; // Longer for wider keys
      } else if (keyEl.classList.contains('shift-left') || 
                keyEl.classList.contains('shift-right')) {
        maxLength = 18; // Longer for shift keys
      } else if (currentModifier === 'ctrl_shift' || currentModifier === 'ctrl_alt_shift') {
        // Slightly shorter for more complex modifier modes to prevent overflow
        maxLength = 10;
      }
      
      actionEl.textContent = truncateText(action, maxLength);
      
      // For very long text, add a data attribute for tooltip display
      if (action.length > maxLength) {
        keyEl.setAttribute('data-full-action', action);
      } else {
        keyEl.removeAttribute('data-full-action');
      }
    } else {
      keyEl.classList.remove('has-action');
      actionEl.textContent = '';
      keyEl.removeAttribute('data-full-action');
    }
  });
}

// Truncate text with ellipsis if it's too long
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

// Show tooltip with full action - fixed to avoid interfering with inputs
function showTooltip(event, key) {
  // Don't show tooltips when a modal is open
  if (actionModal.classList.contains('show') || appModal.classList.contains('show')) {
    return;
  }
  
  const action = shortcuts[currentModifier][key];
  
  if (!action) return;
  
  // Get the position of the key element
  const rect = event.target.closest('.key').getBoundingClientRect();
  
  // Set tooltip content - just show the action, not the keystroke
  tooltip.textContent = action;
  
  // Position tooltip above the key
  tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
  
  // Make sure tooltip stays within viewport
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.left < 10) {
    tooltip.style.left = '10px';
  } else if (tooltipRect.right > window.innerWidth - 10) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
  }
  
  if (tooltipRect.top < 10) {
    tooltip.style.top = `${rect.bottom + 10}px`;
    tooltip.classList.add('bottom');
  } else {
    tooltip.classList.remove('bottom');
  }
  
  // Show tooltip
  tooltip.style.display = 'block';
}

// Hide tooltip - ensure it's properly hidden for input focus
function hideTooltip() {
  tooltip.style.display = 'none';
}

// Move tooltip with mouse - fixed to avoid interference with inputs
function moveTooltip(event) {
  // Don't process when a modal is open
  if (actionModal.classList.contains('show') || appModal.classList.contains('show')) {
    hideTooltip();
    return;
  }
  
  if (tooltip.style.display === 'block') {
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    
    // Ensure tooltip stays within viewport
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.left < 10) {
      tooltip.style.left = '10px';
    } else if (tooltipRect.right > window.innerWidth - 10) {
      tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
    }
  }
}

// Open the action modal for a key
function openActionModal(key) {
  currentKey = key;
  const displayKey = keyLabels[key] || key;
  
  let modifierPrefix = '';
  if (currentModifier === 'ctrl') {
    modifierPrefix = 'Ctrl + ';
  } else if (currentModifier === 'alt') {
    modifierPrefix = 'Alt + ';
  } else if (currentModifier === 'ctrl_shift') {
    modifierPrefix = 'Ctrl + Shift + ';
  } else if (currentModifier === 'ctrl_alt') {
    modifierPrefix = 'Ctrl + Alt + ';
  } else if (currentModifier === 'ctrl_alt_shift') {
    modifierPrefix = 'Ctrl + Alt + Shift + ';
  }
  
  modalKey.textContent = modifierPrefix + displayKey;
  actionNameInput.value = shortcuts[currentModifier][key] || '';
  actionModal.classList.add('show');
  actionNameInput.focus();
}

// Save the action for the current key
function saveAction() {
  const action = actionNameInput.value.trim();
  
  if (action) {
    shortcuts[currentModifier][currentKey] = action;
  } else {
    delete shortcuts[currentModifier][currentKey];
  }
  
  updateKeyboardDisplay();
  saveShortcuts();
  closeModal();
}

// Clear the action for the current key
function clearAction() {
  delete shortcuts[currentModifier][currentKey];
  updateKeyboardDisplay();
  saveShortcuts();
  closeModal();
}

// Close the modal
function closeModal() {
  actionModal.classList.remove('show');
  currentKey = null;
  
  // Force tooltip to hide when modal closes
  hideTooltip();
}

// Additional fix for input focus issues
document.addEventListener('focusin', (e) => {
  // When focusing on an input, ensure tooltips are hidden
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    hideTooltip();
  }
});

// Additional safety measure to prevent event propagation issues
document.addEventListener('keydown', (e) => {
  // If we're in an input field or modal, don't let keyboard events propagate
  // to the main window which could trigger other actions
  if (document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA' || 
      actionModal.classList.contains('show') || 
      appModal.classList.contains('show')) {
    // Don't stop propagation for Enter and Escape which are handled normally
    if (e.key !== 'Enter' && e.key !== 'Escape') {
      e.stopPropagation();
    }
  }
}, true);

// Switch to a different modifier view
function switchModifier(modifier) {
  // Validate modifier
  const validModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
  if (!validModifiers.includes(modifier)) {
    console.error(`Invalid modifier: ${modifier}`);
    modifier = 'plain'; // Default to plain if invalid
  }

  // If clicking the already active button, deactivate it and go to plain mode
  if (modifier === currentModifier && activeButton) {
    currentModifier = 'plain';
    activeButton.classList.remove('active');
    activeButton = null;
    updateKeyboardDisplay();
    return;
  }
  
  // Otherwise, switch to the new modifier
  currentModifier = modifier;
  
  // Remove active class from all buttons
  modifierButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to the clicked button
  // Convert underscores to dashes for DOM ID format
  const buttonId = `${modifier.split('_').join('-')}-view`;
  activeButton = document.getElementById(buttonId);
  
  if (activeButton) {
    activeButton.classList.add('active');
  } else {
    console.warn(`Button not found for modifier: ${modifier}`);
  }
  
  updateKeyboardDisplay();
}

// Save shortcuts to localStorage and via IPC
function saveShortcuts() {
  try {
    // Ensure all required modifier categories exist
    const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
    requiredModifiers.forEach(modifier => {
      if (!shortcuts[modifier]) {
        shortcuts[modifier] = {};
      }
    });
    
    // Save to localStorage as backup with app ID prefix
    localStorage.setItem(`keyforest-shortcuts-${currentAppId}`, JSON.stringify(shortcuts));
    
    // Save to file via IPC - use new API if available
    if (window.electronAPI?.saveShortcuts) {
      window.electronAPI.saveShortcuts({ appId: currentAppId, shortcuts })
        .then(result => {
          if (!result.success) {
            console.error('Error saving shortcuts:', result.error);
          }
        })
        .catch(error => {
          console.error('Error saving shortcuts:', error);
        });
    } else {
      // Fallback to legacy method (won't support multiple apps)
      ipcRenderer.send('save-shortcuts', shortcuts);
    }
  } catch (error) {
    console.error('Error saving shortcuts:', error);
  }
}

// Load shortcuts from storage
function loadShortcuts() {
  try {
    // Try to load from localStorage first (faster)
    const storedShortcuts = localStorage.getItem(`keyforest-shortcuts-${currentAppId}`);
    if (storedShortcuts) {
      try {
        const parsedShortcuts = JSON.parse(storedShortcuts);
        
        // Validate structure
        if (parsedShortcuts && typeof parsedShortcuts === 'object') {
          shortcuts = parsedShortcuts;
          
          // Ensure all required modifier categories exist
          const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
          requiredModifiers.forEach(modifier => {
            if (!shortcuts[modifier]) {
              shortcuts[modifier] = {};
            }
          });
          
          updateKeyboardDisplay();
        }
      } catch (e) {
        console.error('Error parsing shortcuts from localStorage:', e);
      }
    }
    
    // Then load from file (more reliable/permanent)
    if (window.electronAPI?.loadShortcuts) {
      window.electronAPI.loadShortcuts(currentAppId)
        .then(data => {
          if (data.success && data.shortcuts) {
            shortcuts = data.shortcuts;
            
            // Ensure all required modifier categories exist
            const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
            requiredModifiers.forEach(modifier => {
              if (!shortcuts[modifier]) {
                shortcuts[modifier] = {};
              }
            });
            
            // Save to localStorage as backup
            localStorage.setItem(`keyforest-shortcuts-${currentAppId}`, JSON.stringify(shortcuts));
            
            updateKeyboardDisplay();
          } else if (data.error) {
            console.error('Error loading shortcuts:', data.error);
          }
        })
        .catch(error => {
          console.error('Error loading shortcuts:', error);
        });
    } else {
      // Fallback to legacy method
      ipcRenderer.send('load-shortcuts');
    }
  } catch (error) {
    console.error('Error in loadShortcuts:', error);
  }
}

// Load applications
function loadApps() {
  if (window.electronAPI?.getApps) {
    window.electronAPI.getApps()
      .then(data => {
        if (data.success && data.apps) {
          apps = data.apps;
          updateAppSelector();
        } else if (data.error) {
          console.error('Error loading apps:', data.error);
        }
      })
      .catch(error => {
        console.error('Error loading apps:', error);
      });
  }
}

// Update app selector dropdown
function updateAppSelector() {
  // Clear existing options
  appSelect.innerHTML = '';
  
  // Add options for each app
  apps.forEach(app => {
    const option = document.createElement('option');
    option.value = app.id;
    option.textContent = app.name;
    appSelect.appendChild(option);
  });
  
  // Set current app
  appSelect.value = currentAppId;
}

// Open app modal for adding/editing an app
function openAppModal(isEdit = false) {
  isEditingApp = isEdit;
  
  if (isEdit) {
    // Get current app
    const currentApp = apps.find(app => app.id === currentAppId);
    if (!currentApp) return;
    
    appModalTitle.textContent = 'Edit Application';
    appNameInput.value = currentApp.name;
  } else {
    appModalTitle.textContent = 'Add Application';
    appNameInput.value = '';
  }
  
  appModal.classList.add('show');
  appNameInput.focus();
}

// Close app modal
function closeAppModal() {
  appModal.classList.remove('show');
}

// Save app
function saveApp() {
  const name = appNameInput.value.trim();
  
  if (!name) {
    alert('Please enter an application name');
    return;
  }
  
  if (window.electronAPI?.saveApp) {
    const app = {
      id: isEditingApp ? currentAppId : `app_${Date.now()}`,
      name
    };
    
    window.electronAPI.saveApp(app)
      .then(result => {
        if (result.success) {
          loadApps();
          if (!isEditingApp) {
            // Select the new app if we just created it
            currentAppId = app.id;
            setTimeout(() => {
              appSelect.value = app.id;
              loadShortcuts();
            }, 100);
          }
          closeAppModal();
        } else if (result.error) {
          console.error('Error saving app:', result.error);
          alert(`Error saving app: ${result.error}`);
        }
      })
      .catch(error => {
        console.error('Error saving app:', error);
        alert(`Error saving app: ${error.message}`);
      });
  }
}

// Delete current app
function deleteApp() {
  if (currentAppId === 'default') {
    alert('Cannot delete the default application');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete "${apps.find(a => a.id === currentAppId)?.name}"? This will permanently delete all shortcuts for this application.`)) {
    return;
  }
  
  if (window.electronAPI?.deleteApp) {
    window.electronAPI.deleteApp(currentAppId)
      .then(result => {
        if (result.success) {
          currentAppId = 'default';
          loadApps();
          loadShortcuts();
        } else if (result.error) {
          console.error('Error deleting app:', result.error);
          alert(`Error deleting app: ${result.error}`);
        }
      })
      .catch(error => {
        console.error('Error deleting app:', error);
        alert(`Error deleting app: ${error.message}`);
      });
  }
}

// Make keyboard draggable for mobile/tablet
function makeKeyboardDraggable() {
  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;
  const keyboard = document.getElementById('keyboard-container');

  keyboard.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('key')) return;
    
    isDragging = true;
    startX = e.pageX - keyboard.offsetLeft;
    startY = e.pageY - keyboard.offsetTop;
    scrollLeft = keyboard.scrollLeft;
    scrollTop = keyboard.scrollTop;
  });

  keyboard.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  keyboard.addEventListener('mouseup', () => {
    isDragging = false;
  });

  keyboard.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const x = e.pageX - keyboard.offsetLeft;
    const y = e.pageY - keyboard.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    
    keyboard.scrollLeft = scrollLeft - walkX;
    keyboard.scrollTop = scrollTop - walkY;
  });
}

// Adjust keyboard size to fit container
function adjustKeyboardSize() {
  const container = document.getElementById('keyboard-container');
  const keyboard = container.querySelector('.keyboard');
  
  if (!keyboard) return;
  
  // Calculate the ideal key size based on container dimensions
  const containerWidth = container.clientWidth - 60; // Accounting for padding
  const containerHeight = container.clientHeight - 60;
  
  // Get current keyboard dimensions
  const keyboardWidth = keyboard.clientWidth;
  const keyboardHeight = keyboard.clientHeight;
  
  // Calculate scale needed to fit
  const widthScale = containerWidth / keyboardWidth;
  const heightScale = containerHeight / keyboardHeight;
  
  // Use the smaller scale to ensure it fits both dimensions
  let scale = Math.min(widthScale, heightScale, 1); // Don't scale up beyond original size
  
  // Apply scale transformation
  keyboard.style.transform = `scale(${scale})`;
}

// Event Listeners
saveActionBtn.addEventListener('click', saveAction);
clearActionBtn.addEventListener('click', clearAction);
cancelActionBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
actionModal.addEventListener('click', (e) => {
  if (e.target === actionModal) {
    closeModal();
  }
});

// Keyboard shortcuts for the modal
actionNameInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    saveAction();
  } else if (e.key === 'Escape') {
    closeModal();
  }
});

// Set up modifier buttons
modifierButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Fix: Replace all dashes with underscores for multi-part modifiers like ctrl-alt-shift
    const modifier = btn.id.replace('-view', '').split('-').join('_');
    switchModifier(modifier);
  });
});

// Handle IPC responses (legacy)
if (ipcRenderer) {
  ipcRenderer.on('load-shortcuts-reply', (event, data) => {
    if (data.success && data.shortcuts) {
      shortcuts = data.shortcuts;
      
      // Ensure all required modifier categories exist
      const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
      requiredModifiers.forEach(modifier => {
        if (!shortcuts[modifier]) {
          shortcuts[modifier] = {};
        }
      });
      
      // Save to localStorage as backup
      localStorage.setItem('keyforest-shortcuts', JSON.stringify(shortcuts));
      
      updateKeyboardDisplay();
    } else if (data.error) {
      console.error('Error loading shortcuts:', data.error);
    }
  });

  ipcRenderer.on('save-shortcuts-reply', (event, data) => {
    if (!data.success && data.error) {
      console.error('Error saving shortcuts:', data.error);
    }
  });
}

// Setup new API event handlers if available
if (window.electronAPI) {
  window.electronAPI.onLoadShortcutsReply(data => {
    if (data.success && data.shortcuts) {
      shortcuts = data.shortcuts;
      
      // Ensure all required modifier categories exist
      const requiredModifiers = ['plain', 'ctrl', 'alt', 'ctrl_shift', 'ctrl_alt', 'ctrl_alt_shift'];
      requiredModifiers.forEach(modifier => {
        if (!shortcuts[modifier]) {
          shortcuts[modifier] = {};
        }
      });
      
      // Save to localStorage as backup
      localStorage.setItem('keyforest-shortcuts', JSON.stringify(shortcuts));
      
      updateKeyboardDisplay();
    } else if (data.error) {
      console.error('Error loading shortcuts:', data.error);
    }
  });

  window.electronAPI.onSaveShortcutsReply(data => {
    if (!data.success && data.error) {
      console.error('Error saving shortcuts:', data.error);
    }
  });
}

// Add window resize handler for responsive adjustments
window.addEventListener('resize', () => {
  hideTooltip();
  adjustKeyboardSize();
});

// Event Listeners for app-related features
appSelect.addEventListener('change', () => {
  currentAppId = appSelect.value;
  loadShortcuts();
});

addAppBtn.addEventListener('click', () => openAppModal(false));
editAppBtn.addEventListener('click', () => openAppModal(true));
deleteAppBtn.addEventListener('click', deleteApp);

saveAppBtn.addEventListener('click', saveApp);
cancelAppBtn.addEventListener('click', closeAppModal);

// Close app modal when clicking outside
appModal.addEventListener('click', (e) => {
  if (e.target === appModal) {
    closeAppModal();
  }
});

// Handle key events in app modal
appNameInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    saveApp();
  } else if (e.key === 'Escape') {
    closeAppModal();
  }
});

// Export shortcuts to a JSON file
function exportShortcuts() {
  if (!window.electronAPI?.exportShortcuts) {
    alert('Export functionality not available in this version');
    return;
  }

  const data = {
    appId: currentAppId,
    appName: apps.find(a => a.id === currentAppId)?.name || 'Default',
    shortcuts: shortcuts,
    exportDate: new Date().toISOString()
  };

  window.electronAPI.exportShortcuts(data)
    .then(result => {
      if (result.success) {
        alert(`Shortcuts exported successfully to ${result.filePath}`);
      } else {
        alert(`Error exporting shortcuts: ${result.error}`);
      }
    })
    .catch(error => {
      alert(`Error exporting shortcuts: ${error.message}`);
    });
}

// Import shortcuts from a JSON file
function importShortcuts() {
  if (!window.electronAPI?.importShortcuts) {
    alert('Import functionality not available in this version');
    return;
  }

  window.electronAPI.importShortcuts()
    .then(result => {
      if (result.success && result.data) {
        // Ask for confirmation before overwriting
        if (confirm(`Import shortcuts from "${result.data.appName}"? This will replace your current shortcuts for the selected application.`)) {
          shortcuts = result.data.shortcuts;
          updateKeyboardDisplay();
          saveShortcuts();
          alert('Shortcuts imported successfully');
        }
      } else if (result.error) {
        alert(`Error importing shortcuts: ${result.error}`);
      }
    })
    .catch(error => {
      alert(`Error importing shortcuts: ${error.message}`);
    });
}

// Global keyboard shortcuts handler
function setupGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only process if we're not in an input field or modal
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        actionModal.classList.contains('show') || 
        appModal.classList.contains('show')) {
      return;
    }
    
    // Ctrl+N: Add new app
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openAppModal(false);
    }
    
    // Ctrl+E: Edit current app
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (currentAppId !== 'default') {
        openAppModal(true);
      } else {
        alert('Cannot edit the default application');
      }
    }
    
    // Ctrl+I: Import shortcuts
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      importShortcuts();
    }
    
    // Ctrl+O: Export shortcuts
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      exportShortcuts();
    }
    
    // Alt+M: Toggle modifier views
    if (e.altKey && e.key === 'm') {
      e.preventDefault();
      // Cycle through modifier views
      const modifiers = ['plain', 'ctrl', 'alt', 'ctrl_alt', 'ctrl_shift', 'ctrl_alt_shift'];
      const currentIndex = modifiers.indexOf(currentModifier);
      const nextIndex = (currentIndex + 1) % modifiers.length;
      switchModifier(modifiers[nextIndex]);
    }
  });
}

// Add status message to show feedback to users
function showStatusMessage(message, type = 'info') {
  // Create status element if it doesn't exist
  let statusEl = document.getElementById('status-message');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'status-message';
    document.querySelector('.container').appendChild(statusEl);
  }
  
  // Set message and type
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  
  // Show the message
  statusEl.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Run migration to remove icon data if needed
  if (window.electronAPI?.migrateAppsData) {
    window.electronAPI.migrateAppsData()
      .catch(error => {
        console.error('Migration error:', error);
      });
  }
  
  initKeyboard();
  loadApps(); // First load apps
  loadShortcuts(); // Then load shortcuts for default app
  makeKeyboardDraggable();
  setupGlobalShortcuts(); // Setup global keyboard shortcuts
  
  // Adjust keyboard size after a short delay to ensure everything has rendered
  setTimeout(adjustKeyboardSize, 100);
  
  // Show welcome message
}); 