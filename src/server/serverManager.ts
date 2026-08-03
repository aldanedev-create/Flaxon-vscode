import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from 'vscode-languageclient/node';

/**
 * Server manager for Flaxon Language Server.
 * Handles server lifecycle using the official VS Code LanguageClient.
 */
export class ServerManager {
    private client: LanguageClient | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Flaxon Language Server');
    }

    /**
     * Start the language server.
     */
    async start(): Promise<void> {
        if (this.client && this.client.isRunning()) {
            return;
        }

        try {
            // 1. Get Python path setting
            const pythonPath = vscode.workspace.getConfiguration('flaxon').get<string>('pythonPath', 'python3');

            // 2. Resolve server script path safely using ExtensionContext
            const serverScript = this.context.asAbsolutePath(path.join('server', 'flaxon_lsp.py'));

            // Verify the Python script actually exists before spawning
            if (!fs.existsSync(serverScript)) {
                const msg = `LSP server script not found at: ${serverScript}`;
                this.outputChannel.appendLine(`[ERROR] ${msg}`);
                logger.error(msg);
                vscode.window.showErrorMessage(`Flaxon LSP Error: Server script missing from extension directory.`);
                return;
            }

            logger.info(`Starting language server with python: ${pythonPath}`);
            this.outputChannel.appendLine(`Executing: ${pythonPath} "${serverScript}"`);

            // 3. Define how to launch the LSP server
            const serverOptions: ServerOptions = {
                command: pythonPath,
                args: [serverScript],
                options: { env: process.env }
            };

            // 4. Define client options, registering it for Python files
            const clientOptions: LanguageClientOptions = {
                documentSelector: [{ scheme: 'file', language: 'python' }],
                outputChannel: this.outputChannel,
            };

            // 5. Create and start the language client
            this.client = new LanguageClient(
                'flaxonLanguageServer',
                'Flaxon Language Server',
                serverOptions,
                clientOptions
            );

            // Start the client. This will also launch the server
            await this.client.start();
            this.outputChannel.appendLine('Language server started successfully');

        } catch (error) {
            logger.error(`Failed to start language server: ${error}`);
            throw error;
        }
    }

    /**
     * Stop the language server.
     */
    async stop(): Promise<void> {
        if (!this.client) {
            return;
        }

        try {
            await this.client.stop();
            this.client = null;
            this.outputChannel.appendLine('Language server stopped');
        } catch (error) {
            logger.error(`Failed to stop language server: ${error}`);
            throw error;
        }
    }

    /**
     * Check if the server is running.
     */
    isRunning(): boolean {
        return this.client !== null && this.client.isRunning();
    }

    /**
     * Get the output channel.
     */
    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}