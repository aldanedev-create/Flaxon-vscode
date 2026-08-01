# Flaxon VS Code Extension

**Full IDE support for Flaxon - the async-first Python backend framework.**




[![Version](https://img.shields.io/visual-studio-marketplace/v/flaxon.flaxon-vscode)](https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/flaxon.flaxon-vscode)](https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/flaxon.flaxon-vscode)](https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Features

### 🔍 Route Explorer
Visual tree view of all your Flaxon routes. Click any route to jump directly to its definition.


Flaxon Routes
├── GET / app.py:12
├── GET /api/users users.py:8
│ ├── GET /api/users/<int:id> users.py:15
│ ├── POST /api/users users.py:22
│ └── DELETE /api/users/<int:id> users.py:30
├── WebSocket /ws/chat websocket.py:5
└── POST /api/auth/login auth.py:12

text

### 🏃 One-Click Run
Run your Flaxon application with a single click. Auto-reload enabled for development.

### 🐛 Integrated Debugging
Debug Flaxon applications with full breakpoint support, variable inspection, and call stack navigation.

### 📝 Code Snippets
Quick templates for common Flaxon patterns:

| Snippet | Trigger | Output |
|---------|---------|--------|
| `froute` | `froute` + Tab | Complete route with async handler |
| `fschema` | `fschema` + Tab | Full Schema class definition |
| `fvalidation` | `fvalidation` + Tab | Route with validation |
| `fws` | `fws` + Tab | WebSocket endpoint |
| `fmiddleware` | `fmiddleware` + Tab | Middleware boilerplate |
| `fplugin` | `fplugin` + Tab | Plugin class |
| `ftest` | `ftest` + Tab | Test case with client |

### 💡 Intelligent Completions
Auto-complete for:
- Route decorators (`@app.get`, `@app.post`, `@app.websocket`)
- Schema fields (`fields.String`, `fields.Integer`, `fields.Email`)
- HTTP Exceptions (`HTTPException(404)`, `HTTPException(422)`)
- Request methods (`request.json()`, `request.form()`, `request.body()`)

### 🔎 Hover Documentation
Hover over Flaxon APIs to see documentation, parameter types, and usage examples.

### ⚡ CodeLens
Run and debug tests directly from your code:
┌─────────────────────────────────────────────────────┐
│ @app.get("/users/<int:user_id>") │
│ ┌─────────────────────────────────────────────┐ │
│ │ ▶ Run Test │ 🐛 Debug Test │ 📍 3 Ref │ │
│ └─────────────────────────────────────────────┘ │
│ async def get_user(user_id: int): │
└─────────────────────────────────────────────────────┘

text

### 🔧 Project Scaffolding
Create new Flaxon projects, routes, schemas, and plugins with guided prompts.

---

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Flaxon: Create Project` | Scaffold a new Flaxon project | - |
| `Flaxon: Run App` | Run the Flaxon application | `Ctrl+Shift+F5` |
| `Flaxon: Debug App` | Debug the Flaxon application | - |
| `Flaxon: Generate Route` | Generate a new route | - |
| `Flaxon: Generate Schema` | Generate a new schema | - |
| `Flaxon: Generate Plugin` | Generate a new plugin | - |
| `Flaxon: Show Routes` | Open Route Explorer | `Ctrl+Shift+R` |
| `Flaxon: Open Documentation` | Open Flaxon documentation | - |
| `Flaxon: Restart Language Server` | Restart the language server | - |

---

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Flaxon"
4. Click **Install**

### From Command Line
```bash
code --install-extension flaxon.flaxon-vscode
From VSIX File
bash
code --install-extension flaxon-vscode-0.1.0.vsix
Requirements
Requirement	Version
VS Code	1.74.0+
Python	3.11+
Flaxon	0.1.5+
Python Extension	Latest
Configuration
Setting	Default	Description
flaxon.pythonPath	python3	Python interpreter path
flaxon.entryPoint	app:app	Application entry point
flaxon.enableRouteExplorer	true	Enable route explorer
flaxon.enableCodeLens	true	Enable CodeLens
flaxon.enableDiagnostics	true	Enable diagnostics
flaxon.enableCompletions	true	Enable completions
flaxon.trace.server	off	LSP trace level
flaxon.debug.reload	true	Auto-reload on save
flaxon.snippets.enable	true	Enable snippets
Development
Setup
bash
# Clone the repository
git clone https://github.com/aldanedev-create/flaxon-vscode.git
cd flaxon-vscode

# Install dependencies
npm install

# Build the extension
npm run compile

# Run tests
npm test
Debugging the Extension
Open the project in VS Code

Press F5 to start debugging

A new Extension Development Host window will open

Test the extension features

Packaging
bash
# Package as VSIX
npm run package

# Publish to marketplace
npm run publish
Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

License
MIT License - See LICENSE file for details.

Support
📚 Flaxon Documentation

🐛 Report Issues

💬 Discussions

🌐 Flaxon Website

Built with ❤️ for the Flaxon community
