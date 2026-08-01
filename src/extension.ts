import * as vscode from 'vscode';

// Commands
import { createProject } from './commands/createProject';
import { runApp } from './commands/runApp';
import { debugApp } from './commands/debugApp';
import { generateRoute } from './commands/generateRoute';
import { generateSchema } from './commands/generateSchema';

// Features
import { RouteExplorer } from './features/routeExplorer';
import { RouteProvider } from './features/routeProvider';
import { CodeLensProvider } from './features/codeLens';
import { HoverProvider } from './features/hoverProvider';
import { CompletionProvider } from './features/completionProvider';
import { DiagnosticsProvider } from './features/diagnosticsProvider';

// Language
import { configureLanguage } from './language/flaxonLanguage';
import { configureSyntax } from './language/flaxonSyntax';
import { registerSnippets } from './language/flaxonSnippets';

// Server
import { LanguageServer } from './server/languageServer';

// Utils
import { logger } from './utils/logger';

let outputChannel: vscode.OutputChannel;
let routeExplorer: RouteExplorer | null = null;
let codeLensProvider: CodeLensProvider | null = null;
let diagnosticsProvider: DiagnosticsProvider | null = null;
let languageServer: LanguageServer | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

/**
 * Called when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext): void {
    // 1. Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Flaxon');
    logger.setOutputChannel(outputChannel);
    logger.info('🚀 Flaxon extension activating...');

    // 2. Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(flame) Flaxon';
    statusBarItem.tooltip = 'Flaxon Extension';
    statusBarItem.command = 'flaxon.showRoutes';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 3. Register all commands
    registerCommands(context);

    // 4. Register all language features
    registerLanguageFeatures(context);

    // 5. Register all providers
    registerProviders(context);

    // 6. Start Language Server
    startLanguageServer(context);

    // 7. Setup file watchers
    setupFileWatchers(context);

    // 8. Listen for configuration changes
    setupConfigurationListener(context);

    // 9. Initial route scan
    scanWorkspace();

    logger.info('✅ Flaxon extension activated successfully');
}

/**
 * Register all commands.
 */
function registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
        { id: 'flaxon.createProject', handler: createProject },
        { id: 'flaxon.runApp', handler: runApp },
        { id: 'flaxon.debugApp', handler: debugApp },
        { id: 'flaxon.generateRoute', handler: generateRoute },
        { id: 'flaxon.generateSchema', handler: generateSchema },
        { id: 'flaxon.showRoutes', handler: showRoutes },
        { id: 'flaxon.openDocs', handler: openDocumentation },
        { id: 'flaxon.restartLanguageServer', handler: restartLanguageServer }
    ];

    commands.forEach((cmd) => {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
        logger.debug(`Registered command: ${cmd.id}`);
    });

    logger.info(`Registered ${commands.length} commands`);
}

/**
 * Register all language features.
 */
function registerLanguageFeatures(context: vscode.ExtensionContext): void {
    // Configure language
    configureLanguage(context);

    // Configure syntax highlighting
    configureSyntax(context);

    // Register snippets
    registerSnippets();

    logger.info('Language features registered');
}

/**
 * Register all providers.
 */
function registerProviders(context: vscode.ExtensionContext): void {
    // 1. Register Route Explorer
    const isRouteExplorerEnabled = vscode.workspace
        .getConfiguration('flaxon')
        .get('enableRouteExplorer', true);

    if (isRouteExplorerEnabled) {
        routeExplorer = new RouteExplorer(context);
        context.subscriptions.push(routeExplorer.getTreeView());
        logger.info('Route Explorer registered');
    }

    // 2. Register CodeLens Provider
    const isCodeLensEnabled = vscode.workspace
        .getConfiguration('flaxon')
        .get('enableCodeLens', true);

    if (isCodeLensEnabled) {
        codeLensProvider = new CodeLensProvider();
        const codeLensDisposable = vscode.languages.registerCodeLensProvider(
            { language: 'python' },
            codeLensProvider
        );
        context.subscriptions.push(codeLensDisposable);
        logger.info('CodeLens provider registered');
    }

    // 3. Register Completion Provider
    const isCompletionsEnabled = vscode.workspace
        .getConfiguration('flaxon')
        .get('enableCompletions', true);

    if (isCompletionsEnabled) {
        const completionProvider = new CompletionProvider();
        const completionDisposable = vscode.languages.registerCompletionItemProvider(
            { language: 'python' },
            completionProvider,
            '.', '('
        );
        context.subscriptions.push(completionDisposable);
        logger.info('Completion provider registered');
    }

    // 4. Register Hover Provider
    const hoverProvider = new HoverProvider();
    const hoverDisposable = vscode.languages.registerHoverProvider(
        { language: 'python' },
        hoverProvider
    );
    context.subscriptions.push(hoverDisposable);
    logger.info('Hover provider registered');

    // 5. Register Diagnostics Provider
    const isDiagnosticsEnabled = vscode.workspace
        .getConfiguration('flaxon')
        .get('enableDiagnostics', true);

    if (isDiagnosticsEnabled) {
        diagnosticsProvider = new DiagnosticsProvider();
        context.subscriptions.push(diagnosticsProvider);
        logger.info('Diagnostics provider registered');
    }
}

/**
 * Start the language server.
 */
function startLanguageServer(context: vscode.ExtensionContext): void {
    try {
        languageServer = new LanguageServer();
        languageServer.start();

        // Update status bar
        if (statusBarItem) {
            statusBarItem.text = '$(flame) Flaxon ✓';
            statusBarItem.tooltip = 'Flaxon Language Server: Running';
        }

        logger.info('Language server started');
    } catch (error) {
        logger.error(`Failed to start language server: ${error}`);
        if (statusBarItem) {
            statusBarItem.text = '$(flame) Flaxon ✗';
            statusBarItem.tooltip = 'Flaxon Language Server: Failed to start';
        }
        vscode.window.showErrorMessage('Failed to start Flaxon Language Server');
    }
}

/**
 * Setup file watchers for automatic route updates.
 */
function setupFileWatchers(context: vscode.ExtensionContext): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');

    watcher.onDidChange((uri) => {
        logger.debug(`File changed: ${uri.fsPath}`);
        refreshRouteExplorer();
    });

    watcher.onDidCreate((uri) => {
        logger.debug(`File created: ${uri.fsPath}`);
        refreshRouteExplorer();
    });

    watcher.onDidDelete((uri) => {
        logger.debug(`File deleted: ${uri.fsPath}`);
        refreshRouteExplorer();
    });

    context.subscriptions.push(watcher);
    logger.info('File watchers setup complete');
}

/**
 * Listen for configuration changes.
 */
function setupConfigurationListener(context: vscode.ExtensionContext): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('flaxon')) {
            logger.info('Flaxon configuration changed');
            
            // Update settings
            const enableRouteExplorer = vscode.workspace
                .getConfiguration('flaxon')
                .get('enableRouteExplorer', true);
            
            const enableCodeLens = vscode.workspace
                .getConfiguration('flaxon')
                .get('enableCodeLens', true);
            
            const enableDiagnostics = vscode.workspace
                .getConfiguration('flaxon')
                .get('enableDiagnostics', true);
            
            // Refresh providers if needed
            refreshRouteExplorer();
            
            if (codeLensProvider) {
                codeLensProvider.refresh();
            }
            
            logger.info('Configuration updated');
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Refresh the route explorer.
 */
function refreshRouteExplorer(): void {
    if (routeExplorer) {
        routeExplorer.refresh();
        logger.debug('Route explorer refreshed');
    }
}

/**
 * Scan the workspace for Flaxon files.
 */
function scanWorkspace(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        logger.info('No workspace folder open');
        return;
    }

    logger.info(`Scanning workspace: ${workspaceFolder.uri.fsPath}`);
    refreshRouteExplorer();
}

/**
 * Command: Show routes in explorer.
 */
function showRoutes(): void {
    // Focus the route explorer
    vscode.commands.executeCommand('workbench.view.explorer');
    
    // If route explorer is registered, focus it
    if (routeExplorer) {
        routeExplorer.getTreeView().reveal(undefined, { focus: true });
        vscode.window.showInformationMessage('Showing Flaxon routes');
    } else {
        vscode.window.showInformationMessage('Route explorer is disabled');
    }
}

/**
 * Command: Open Flaxon documentation.
 */
function openDocumentation(): void {
    const url = 'https://flaxon-website.vercel.app/docs';
    vscode.env.openExternal(vscode.Uri.parse(url));
    logger.info(`Opened documentation: ${url}`);
}

/**
 * Command: Restart the language server.
 */
async function restartLanguageServer(): Promise<void> {
    try {
        logger.info('Restarting language server...');
        
        if (languageServer) {
            await languageServer.restart();
            vscode.window.showInformationMessage('Flaxon Language Server restarted');
            
            // Update status bar
            if (statusBarItem) {
                statusBarItem.text = '$(flame) Flaxon ✓';
                statusBarItem.tooltip = 'Flaxon Language Server: Running';
            }
            
            logger.info('Language server restarted successfully');
        } else {
            // Create new server instance
            languageServer = new LanguageServer();
            await languageServer.start();
            vscode.window.showInformationMessage('Flaxon Language Server started');
        }
    } catch (error) {
        logger.error(`Failed to restart language server: ${error}`);
        vscode.window.showErrorMessage('Failed to restart Flaxon Language Server');
        
        if (statusBarItem) {
            statusBarItem.text = '$(flame) Flaxon ✗';
            statusBarItem.tooltip = 'Flaxon Language Server: Error';
        }
    }
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
    logger.info('🛑 Flaxon extension deactivating...');

    // Stop language server
    if (languageServer) {
        try {
            languageServer.stop();
            logger.info('Language server stopped');
        } catch (error) {
            logger.error(`Failed to stop language server: ${error}`);
        }
    }

    // Dispose diagnostics
    if (diagnosticsProvider) {
        try {
            diagnosticsProvider.dispose();
            logger.info('Diagnostics provider disposed');
        } catch (error) {
            logger.error(`Failed to dispose diagnostics: ${error}`);
        }
    }

    // Dispose output channel
    if (outputChannel) {
        outputChannel.dispose();
        logger.info('Output channel disposed');
    }

    logger.info('👋 Flaxon extension deactivated');
}