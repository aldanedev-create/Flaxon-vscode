import * as vscode from 'vscode';
import { ServerManager } from './serverManager';
import { logger } from '../utils/logger';

/**
 * Language Server for Flaxon.
 * Provides advanced language features like diagnostics, completions, etc.
 */
export class LanguageServer {
    private serverManager: ServerManager;

    constructor() {
        this.serverManager = new ServerManager();
    }

    /**
     * Start the language server.
     */
    async start(): Promise<void> {
        try {
            await this.serverManager.start();
            logger.info('Flaxon Language Server started');
        } catch (error) {
            logger.error(`Failed to start language server: ${error}`);
            vscode.window.showErrorMessage('Failed to start Flaxon Language Server');
        }
    }

    /**
     * Stop the language server.
     */
    async stop(): Promise<void> {
        try {
            await this.serverManager.stop();
            logger.info('Flaxon Language Server stopped');
        } catch (error) {
            logger.error(`Failed to stop language server: ${error}`);
        }
    }

    /**
     * Restart the language server.
     */
    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    /**
     * Check if the server is running.
     */
    isRunning(): boolean {
        return this.serverManager.isRunning();
    }
}