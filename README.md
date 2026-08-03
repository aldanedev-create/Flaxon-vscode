# Flaxon VS Code Extension

<p align="center">
  <img src="https://raw.githubusercontent.com/aldanedev-create/Flaxon-Backend-Framework/main/assets/flaxon.png" width="180" alt="Flaxon Logo">
</p>

<h3 align="center">
The official Visual Studio Code extension for the Flaxon Framework
</h3>

<p align="center">
Build Python APIs faster with intelligent completions, route navigation, debugging tools, snippets, diagnostics, and project generators.
</p>

<p align="center">

<a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode">
<img src="https://img.shields.io/visual-studio-marketplace/v/flaxon.flaxon-vscode" />
</a>

<a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode">
<img src="https://img.shields.io/visual-studio-marketplace/i/flaxon.flaxon-vscode" />
</a>

<a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode">
<img src="https://img.shields.io/visual-studio-marketplace/r/flaxon.flaxon-vscode" />
</a>

<a href="https://github.com/aldanedev-create/Flaxon-Backend-Framework/blob/main/LICENSE">
<img src="https://img.shields.io/badge/license-MIT-blue.svg" />
</a>

<a href="https://pypi.org/project/flaxon/">
<img src="https://img.shields.io/pypi/v/flaxon.svg" />
</a>

</p>

---

# 🚀 Why Flaxon VS Code?

Flaxon VS Code transforms Visual Studio Code into a complete IDE for Flaxon development.

Whether you're building a small REST API or a large production backend, the extension provides everything you need without leaving your editor.

✔ Intelligent Python support

✔ Route Explorer

✔ Code generation

✔ Snippets

✔ Debugging

✔ Diagnostics

✔ Testing

✔ Project scaffolding

✔ Documentation integration

---

# ✨ Features

## 🔍 Route Explorer

Instantly visualize every route in your application.

```
Flaxon Routes

GET /
GET /users
POST /users
DELETE /users/<id>
WebSocket /chat
```

Click any route to jump directly to its source.

---

## ⚡ Intelligent Autocomplete

Smart completion for:

- Route decorators
- Schemas
- Validation
- Middleware
- Request objects
- Response objects
- WebSockets
- Exceptions
- Plugins

---

## 📝 Snippets

Start coding instantly.

| Snippet | Description |
|----------|-------------|
| `froute` | Create Route |
| `fschema` | Schema Class |
| `fvalidation` | Validation Example |
| `fmiddleware` | Middleware |
| `fplugin` | Plugin |
| `fws` | WebSocket |
| `ftest` | Test Template |

---

## 🐛 Integrated Debugging

Launch and debug your Flaxon application directly inside VS Code.

Features include:

- Breakpoints
- Variable inspection
- Call stacks
- Auto Reload
- Debug Console

---

## 🔧 Project Generator

Generate complete Flaxon projects from the Command Palette.

Creates:

- Application
- Routes
- Schemas
- Middleware
- Plugins
- Tests

---

## 📚 Hover Documentation

Hover over any Flaxon API to see:

- Documentation
- Parameters
- Return Types
- Usage Examples

---

## ⚡ CodeLens

Run tests directly above your code.

```
▶ Run Test

🐞 Debug Test

3 References
```

---

## 🚀 Commands

Open the Command Palette (`Ctrl+Shift+P`) and run:

| Command | Description |
|----------|-------------|
| Flaxon: Create Project | Generate a new project |
| Flaxon: Run App | Start development server |
| Flaxon: Debug App | Launch debugger |
| Flaxon: Generate Route | Create route |
| Flaxon: Generate Schema | Create schema |
| Flaxon: Generate Plugin | Create plugin |
| Flaxon: Show Routes | Open Route Explorer |
| Flaxon: Restart Language Server | Restart extension |
| Flaxon: Open Documentation | Open documentation |

---

# 📦 Installation

## VS Code Marketplace

Open Extensions (`Ctrl+Shift+X`)

Search for

```
Flaxon
```

Click

```
Install
```

---

## Command Line

```bash
code --install-extension flaxon.flaxon-vscode
```

---

## VSIX

```bash
code --install-extension flaxon-vscode.vsix
```

---

# ⚙ Requirements

| Requirement | Version |
|-------------|----------|
| VS Code | 1.74+ |
| Python | 3.11+ |
| Flaxon | Latest |
| Python Extension | Latest |

---

# ⚙ Configuration

| Setting | Default |
|----------|---------|
| flaxon.pythonPath | python |
| flaxon.entryPoint | app:app |
| flaxon.enableRouteExplorer | true |
| flaxon.enableDiagnostics | true |
| flaxon.enableCompletions | true |
| flaxon.enableCodeLens | true |
| flaxon.debug.reload | true |

---

# 🚀 Quick Start

Install Flaxon

```bash
pip install flaxon
```

Create an application.

```python
from flaxon import Flaxon

app = Flaxon("demo")

@app.get("/")
async def home():
    return {"message": "Hello Flaxon"}
```

Run

```bash
flaxon run app:app --reload
```

Open VS Code.

The extension automatically detects your Flaxon project and enables all development features.

---

# 🌐 Documentation

Official Website

https://flaxon-website.vercel.app/

Framework Repository

https://github.com/aldanedev-create/Flaxon-Backend-Framework

PyPI

https://pypi.org/project/flaxon/

---

# 🛠 Development

Clone

```bash
git clone https://github.com/aldanedev-create/flaxon-vscode.git

cd flaxon-vscode
```

Install

```bash
npm install
```

Compile

```bash
npm run compile
```

Run tests

```bash
npm test
```

Launch Extension Host

Press

```
F5
```

inside VS Code.

---

# 📦 Packaging

```bash
npm run package
```

Publish

```bash
npm run publish
```

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push branch
5. Open a Pull Request

---

# 📄 License

MIT License

---

# ❤️ Community

🌐 Website

https://flaxon-website.vercel.app/

🐛 Report Issues

https://github.com/aldanedev-create/Flaxon-Backend-Framework/issues

⭐ Star the Flaxon repository if you enjoy using it.

---

<p align="center">

Made with ❤️ for Python developers using Flaxon.

</p>