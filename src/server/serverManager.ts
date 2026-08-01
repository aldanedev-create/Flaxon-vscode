import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Server manager for Flaxon Language Server.
 * Handles server lifecycle: start, stop, restart.
 */
export class ServerManager {
    private process: child_process.ChildProcess | null = null;
    private isServerRunning: boolean = false;
    private outputChannel: vscode.OutputChannel;

    constructor() {
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
            // Get Python path
            const pythonPath = vscode.workspace.getConfiguration('flaxon').get('pythonPath', 'python3');

            // Build server command
            // This would point to the actual Flaxon language server implementation
            const serverScript = path.join(__dirname, '..', '..', 'server', 'flaxon_lsp.py');
            const command = `${pythonPath} ${serverScript}`;

            logger.info(`Starting language server: ${command}`);

            // Spawn the server process
            this.process = child_process.spawn(command, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                env: process.env
            });

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
                
                // Auto-restart if it crashed
                if (code !== 0) {
                    vscode.window.showWarningMessage('Flaxon Language Server crashed. Attempting to restart...');
                    setTimeout(() => this.start(), 2000);
                }
            });

            // Wait for server to be ready
            await this.waitForReady(5000);
            this.isServerRunning = true;
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
        if (!this.isServerRunning || !this.process) {
            return;
        }

        try {
            // Send SIGTERM
            this.process.kill('SIGTERM');
            
            // Wait for it to exit
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });

            // Force kill if it's still running
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
     * Wait for the server to be ready.
     */
    private waitForReady(timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (this.isServerRunning) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Language server startup timed out'));
                }
            }, 100);
        });
    }

    /**
     * Get the output channel.
     */
    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}