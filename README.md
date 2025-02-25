# KeyForest

KeyForest is a keyboard shortcut visualizer and manager built with Electron. It helps you organize, visualize, and manage keyboard shortcuts for different applications.

## Features

- **Visual Keyboard Layout**: See your keyboard shortcuts on a virtual keyboard
- **Multiple Modifier Support**: View shortcuts for different modifier combinations (Ctrl, Alt, Ctrl+Shift, etc.)
- **Application Switching**: Manage shortcuts for multiple applications
- **Import/Export**: Share your shortcut configurations between computers
- **Responsive Design**: Works on different screen sizes
- **Keyboard Navigation**: Use keyboard shortcuts to navigate the app itself

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Add new application |
| `Ctrl+E` | Edit current application |
| `Ctrl+I` | Import shortcuts |
| `Ctrl+O` | Export shortcuts |
| `Alt+M` | Cycle through modifier views |

## Development

### Prerequisites

- Node.js (v14 or later recommended)
- npm (v6 or later)

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/keyforest.git
cd keyforest
```

2. Install dependencies
```bash
npm install
```

3. Run the application
```bash
npm start
```

### Building for Distribution

To build the app for distribution:

```bash
npm run build
```

## License

MIT 