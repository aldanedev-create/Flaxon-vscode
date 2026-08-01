# Flaxon VS Code Extension

**Full IDE support for Flaxon - the async-first Python backend framework.**

<p align="center">
  <img src="https://raw.githubusercontent.com/aldanedev-create/Flaxon-Backend-Framework/main/assets/flaxon.png" alt="Flaxon Logo" width="200"/>
</p>

<p align="center">
  <a href="https://pypi.org/project/flaxon/"><img src="https://img.shields.io/pypi/v/flaxon.svg" alt="PyPI version"></a>
  <a href="https://github.com/aldanedev-create/Flaxon-Backend-Framework/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/badge/code%20style-ruff-000000.svg" alt="Code style: ruff"></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/flaxon.flaxon-vscode" alt="Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode"><img src="https://img.shields.io/visual-studio-marketplace/i/flaxon.flaxon-vscode" alt="Installs"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=flaxon.flaxon-vscode"><img src="https://img.shields.io/visual-studio-marketplace/r/flaxon.flaxon-vscode" alt="Rating"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## Features

### 🔍 Route Explorer
Visual tree view of all your Flaxon routes. Click any route to jump directly to its definition.

```text
Flaxon Routes
├── GET / app.py:12
├── GET /api/users users.py:8
│   ├── GET /api/users/<int:id> users.py:15
│   ├── POST /api/users users.py:22
│   └── DELETE /api/users/<int:id> users.py:30
├── WebSocket /ws/chat websocket.py:5
└── POST /api/auth/login auth.py:12
🏃 One-Click RunRun your Flaxon application with a single click. Auto-reload enabled for development.🐛 Integrated DebuggingDebug Flaxon applications with full breakpoint support, variable inspection, and call stack navigation.📝 Code SnippetsQuick templates for common Flaxon patterns:SnippetTriggerOutputfroutefroute + TabComplete route with async handlerfschemafschema + TabFull Schema class definitionfvalidationfvalidation + TabRoute with validationfwsfws + TabWebSocket endpointfmiddlewarefmiddleware + TabMiddleware boilerplatefpluginfplugin + TabPlugin classftestftest + TabTest case with client💡 Intelligent CompletionsAuto-complete for:Route decorators (@app.get, @app.post, @app.websocket)Schema fields (fields.String, fields.Integer, fields.Email)HTTP Exceptions (HTTPException(404), HTTPException(422))Request methods (request.json(), request.form(), request.body())🔎 Hover DocumentationHover over Flaxon APIs to see documentation, parameter types, and usage examples.⚡ CodeLensRun and debug tests directly from your code:Plaintext┌─────────────────────────────────────────────────────┐
│ @app.get("/users/<int:user_id>")                    │
│ ┌─────────────────────────────────────────────┐     │
│ │ ▶ Run Test │ 🐛 Debug Test │ 📍 3 Ref       │     │
│ └─────────────────────────────────────────────┘     │
│ async def get_user(user_id: int):                   │
└─────────────────────────────────────────────────────┘
🔧 Project ScaffoldingCreate new Flaxon projects, routes, schemas, and plugins with guided prompts.CommandsCommandDescriptionWindows / LinuxmacOSFlaxon: Create ProjectScaffold a new Flaxon project--Flaxon: Run AppRun the Flaxon applicationCtrl+Shift+F5Cmd+Shift+F5Flaxon: Debug AppDebug the Flaxon application--Flaxon: Generate RouteGenerate a new route--Flaxon: Generate SchemaGenerate a new schema--Flaxon: Generate PluginGenerate a new plugin--Flaxon: Show RoutesOpen Route ExplorerCtrl+Shift+RCmd+Shift+RFlaxon: Open DocumentationOpen Flaxon documentation--Flaxon: Restart Language ServerRestart the language server--InstallationFrom VS Code MarketplaceOpen VS CodeGo to Extensions (Ctrl+Shift+X or Cmd+Shift+X)Search for "Flaxon"Click InstallFrom Command LineBashcode --install-extension flaxon.flaxon-vscode
From VSIX FileBashcode --install-extension flaxon-vscode-0.1.0.vsix
RequirementsRequirementMinimum VersionVS Code1.74.0+Python3.11+Flaxon0.1.5+Python ExtensionLatestConfigurationSettingDefaultDescriptionflaxon.pythonPath"python3"Path to Python interpreter for Flaxon commandsflaxon.entryPoint"app:app"Application entry point (module:variable)flaxon.enableRouteExplorertrueEnable the Route Explorer tree viewflaxon.enableCodeLenstrueEnable CodeLens for routesflaxon.enableDiagnosticstrueEnable real-time diagnostics and lintingflaxon.enableCompletionstrueEnable intelligent code completionsflaxon.trace.server"off"Trace level for language server (off, messages, verbose)flaxon.debug.reloadtrueAuto-reload on save when debuggingflaxon.snippets.enabletrueEnable Flaxon code snippetsDevelopmentSetupBash# Clone the repository
git clone [https://github.com/aldanedev-create/flaxon-vscode.git](https://github.com/aldanedev-create/flaxon-vscode.git)
cd flaxon-vscode

# Install dependencies
npm install

# Build the extension
npm run compile

# Run tests
npm test
Debugging the ExtensionOpen the project in VS Code.Press F5 to start debugging.A new Extension Development Host window will open.Test the extension features in the new window.PackagingBash# Package as VSIX
npm run package

# Publish to marketplace
npm run publish
ContributingFork the repositoryCreate a feature branch (git checkout -b feature/amazing-feature)Commit your changes (git commit -m 'Add amazing feature')Push to the branch (git push origin feature/amazing-feature)Open a Pull RequestLicenseMIT License - See LICENSE file for details.Support📚 Flaxon Documentation🐛 Report Issues💬 DiscussionsBuilt with ❤️ for the Flaxon community.
