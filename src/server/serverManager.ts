import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Server manager for Flaxon Language Server.
 * Handles server lifecycle: start, stop, restart.
 */
export class ServerManager {
    private process: child_process.ChildProcess | null = null;
    private isServerRunning: boolean = false;
    private outputChannel: vscode.OutputChannel;
    private restartAttempts: number = 0;
    private readonly maxRestartAttempts: number = 3;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Flaxon Language Server');
    }

    /**
     * Start the language server.
     */
    async start(): Promise<void> {
        if (this.isServerRunning) {
            return;
        }

        try {
            // 1. Get Python path setting
            const pythonPath = vscode.workspace.getConfiguration('flaxon').get('pythonPath', 'python3');

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

            // 3. Spawn the server process
            this.process = child_process.spawn(pythonPath, [serverScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env
            });

            // Mark running state as soon as process spawns successfully
            this.isServerRunning = true;

            // Handle stdout
            this.process.stdout?.on('data', (data) => {
                const message = data.toString();
                this.outputChannel.appendLine(message);
                logger.debug(`LSP: ${message}`);
            });

            // Handle stderr
            this.process.stderr?.on('data', (data) => {
                const message = data.toString();
                this.outputChannel.appendLine(`[ERROR] ${message}`);
                logger.error(`LSP Error: ${message}`);
            });

            // Handle process exit
            this.process.on('exit', (code) => {
                this.isServerRunning = false;
                this.process = null;
                logger.info(`Language server exited with code ${code}`);
                this.outputChannel.appendLine(`Server exited with code ${code}`);

                // Prevent infinite auto-restart loops if crash occurs repeatedly
                if (code !== 0 && code !== null) {
                    if (this.restartAttempts < this.maxRestartAttempts) {
                        this.restartAttempts++;
                        vscode.window.showWarningMessage(
                            `Flaxon Language Server crashed (Attempt ${this.restartAttempts}/${this.maxRestartAttempts}). Restarting...`
                        );
                        setTimeout(() => this.start(), 3000);
                    } else {
                        vscode.window.showErrorMessage('Flaxon Language Server crashed repeatedly and was stopped.');
                    }
                }
            });

            // Reset restart counter on successful startup timeout window
            setTimeout(() => {
                if (this.isServerRunning) {
                    this.restartAttempts = 0;
                }
            }, 10000);

            this.outputChannel.appendLine('Language server started successfully');

        } catch (error) {
            this.isServerRunning = false;
            logger.error(`Failed to start language server: ${error}`);
            throw error;
        }
    }

    /**
     * Stop the language server.
     */
    async stop(): Promise<void> {
        if (!this.process) {
            this.isServerRunning = false;
            return;
        }

        try {
            this.process.kill('SIGTERM');

            await new Promise((resolve) => {
                setTimeout(resolve, 500);
            });

            if (this.process && !this.process.killed) {
                this.process.kill('SIGKILL');
            }

            this.isServerRunning = false;
            this.process = null;
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
        return this.isServerRunning && this.process !== null && !this.process.killed;
    }

    /**
     * Get the output channel.
     */
    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}