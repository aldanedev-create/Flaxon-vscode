import * as vscode from 'vscode';
import { parseFlaxonApp } from '../utils/flaxonParser';
import { logger } from '../utils/logger';

/**
 * CodeLens provider for Flaxon routes.
 * Shows run/debug buttons on route definitions.
 */
export class CodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    /**
     * Provide CodeLens for a document.
     */
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();

        if (!text.includes('@app.') && !text.includes('@app.websocket')) {
            return codeLenses;
        }

        try {
            const routes = parseFlaxonApp(text);
            
            for (const route of routes) {
                if (Number.isInteger(route.line) && route.line >= 0) {
                    const lineIndex = Math.min(route.line - 1, Math.max(0, document.lineCount - 1));
                    const lineLength = document.lineAt(lineIndex).text.length;
                    const range = new vscode.Range(
                        new vscode.Position(lineIndex, 0),
                        new vscode.Position(lineIndex, lineLength)
                    );

                    // Run test CodeLens
                    const runCommand: vscode.CodeLens = new vscode.CodeLens(range, {
                        title: '▶ Run App',
                        command: 'flaxon.runApp',
                        arguments: []
                    });

                    // Debug test CodeLens
                    const debugCommand: vscode.CodeLens = new vscode.CodeLens(range, {
                        title: '🔍 Debug App',
                        command: 'flaxon.debugApp',
                        arguments: []
                    });

                    codeLenses.push(runCommand);
                    codeLenses.push(debugCommand);

                }
            }
        } catch (error) {
            logger.debug(`CodeLens parse error: ${error}`);
        }

        return codeLenses;
    }

    /**
     * Refresh CodeLens.
     */
    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    dispose(): void {
        this._onDidChangeCodeLenses.dispose();
    }
}