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
                if (route.line) {
                    const range = new vscode.Range(
                        new vscode.Position(route.line - 1, 0),
                        new vscode.Position(route.line - 1, 100)
                    );

                    // Run test CodeLens
                    const runCommand: vscode.CodeLens = new vscode.CodeLens(range, {
                        title: '▶ Run',
                        command: 'flaxon.runApp',
                        arguments: [route]
                    });

                    // Debug test CodeLens
                    const debugCommand: vscode.CodeLens = new vscode.CodeLens(range, {
                        title: '🐛 Debug',
                        command: 'flaxon.debugApp',
                        arguments: [route]
                    });

                    codeLenses.push(runCommand);
                    codeLenses.push(debugCommand);

                    // Show route references count
                    const refCommand: vscode.CodeLens = new vscode.CodeLens(range, {
                        title: `📍 ${route.references || 0} refs`,
                        command: 'editor.action.showReferences',
                        arguments: [document.uri, range.start, []]
                    });
                    codeLenses.push(refCommand);
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
}