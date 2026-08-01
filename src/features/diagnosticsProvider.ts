import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Diagnostics provider for Flaxon linting.
 * Provides real-time error checking.
 */
export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('flaxon');
        
        // Watch for changes on disk and in workspace
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        watcher.onDidChange((uri) => this.runDiagnostics(uri));
        watcher.onDidCreate((uri) => this.runDiagnostics(uri));
        vscode.workspace.onDidSaveTextDocument((doc) => this.runDiagnostics(doc.uri));        
        
        // Run diagnostics on active editor changes
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.languageId === 'python') {
                this.runDiagnostics(editor.document.uri);
            }
        });

        // Initial run for open documents
        vscode.workspace.textDocuments.forEach((doc) => {
            if (doc.languageId === 'python') {
                this.runDiagnostics(doc.uri);
            }
        });
    }

    /**
     * Run diagnostics on a Python file.
     */
    private async runDiagnostics(uri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            if (document.languageId !== 'python') {
                return;
            }

            const text = document.getText();
            const diagnostics: vscode.Diagnostic[] = [];

            // Check for Flaxon import issues
            if (text.includes('Flaxon(') || text.includes('from flaxon import')) {
                // Check if import exists
                if (!text.includes('from flaxon import')) {
                    diagnostics.push(this.createDiagnostic(
                        'Missing import: "from flaxon import Flaxon"',
                        new vscode.Range(0, 0, 0, 0),
                        vscode.DiagnosticSeverity.Warning,
                        'flaxon-missing-import'
                    ));
                }

                // Check for app instantiation
                if (!text.includes('Flaxon(')) {
                    diagnostics.push(this.createDiagnostic(
                        'Missing app instantiation: "app = Flaxon()"',
                        new vscode.Range(0, 0, 0, 0),
                        vscode.DiagnosticSeverity.Information,
                        'flaxon-missing-app'
                    ));
                }
            }

            // Check route decorators
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i;

                // Check for @app. decorator without an async function
                if (line.includes('@app.') && !line.includes('@app.websocket')) {
                    const nextLine = lines[i + 1] || '';
                    if (!nextLine.includes('async def') && !nextLine.includes('def')) {
                        diagnostics.push(this.createDiagnostic(
                            'Route handler should be async',
                            new vscode.Range(
                                new vscode.Position(lineNum, line.indexOf('@app.')),
                                new vscode.Position(lineNum, line.indexOf('@app.') + 5)
                            ),
                            vscode.DiagnosticSeverity.Warning,
                            'flaxon-async-handler'
                        ));
                    }
                }

                // Check for missing return in route
                if (line.includes('async def') || line.includes('def')) {
                    const funcLines = [];
                    let j = i;
                    while (j < lines.length && !lines[j].includes('@app.') && !lines[j].includes('class ')) {
                        funcLines.push(lines[j]);
                        j++;
                    }
                    const funcText = funcLines.join('\n');
                    if (funcText.includes('@app.') && !funcText.includes('return') && !funcText.includes('yield')) {
                        diagnostics.push(this.createDiagnostic(
                            'Route handler should return a response',
                            new vscode.Range(
                                new vscode.Position(i, 0),
                                new vscode.Position(i, 10)
                            ),
                            vscode.DiagnosticSeverity.Warning,
                            'flaxon-missing-return'
                        ));
                    }
                }

                // Check for validation schema usage
                if (line.includes('fields.') && !line.includes('from flaxon.validation import')) {
                    const importLines = text.slice(0, i).split('\n');
                    const hasImport = importLines.some(l => l.includes('from flaxon.validation import'));
                    if (!hasImport) {
                        diagnostics.push(this.createDiagnostic(
                            'Missing import: "from flaxon.validation import Schema, fields"',
                            new vscode.Range(
                                new vscode.Position(i, line.indexOf('fields.')),
                                new vscode.Position(i, line.indexOf('fields.') + 7)
                            ),
                            vscode.DiagnosticSeverity.Warning,
                            'flaxon-missing-validation-import'
                        ));
                    }
                }

                // Check for HTTPException usage
                if (line.includes('HTTPException(') && !text.includes('from flaxon.exceptions import HTTPException')) {
                    diagnostics.push(this.createDiagnostic(
                        'Missing import: "from flaxon.exceptions import HTTPException"',
                        new vscode.Range(
                            new vscode.Position(i, line.indexOf('HTTPException')),
                            new vscode.Position(i, line.indexOf('HTTPException') + 13)
                        ),
                        vscode.DiagnosticSeverity.Warning,
                        'flaxon-missing-exception-import'
                    ));
                }

                // Check for WebSocket
                if (line.includes('@app.websocket')) {
                    if (!line.includes('await socket.accept()') && !text.includes('await socket.accept()')) {
                        diagnostics.push(this.createDiagnostic(
                            'WebSocket route should call "await socket.accept()"',
                            new vscode.Range(
                                new vscode.Position(lineNum, line.indexOf('@app.websocket')),
                                new vscode.Position(lineNum, line.indexOf('@app.websocket') + 15)
                            ),
                            vscode.DiagnosticSeverity.Warning,
                            'flaxon-websocket-accept'
                        ));
                    }
                }
            }

            // Update diagnostics
            this.diagnosticCollection.set(uri, diagnostics);

        } catch (error) {
            logger.debug(`Diagnostics error for ${uri.fsPath}: ${error}`);
        }
    }

    /**
     * Create a diagnostic.
     */
    private createDiagnostic(
        message: string,
        range: vscode.Range,
        severity: vscode.DiagnosticSeverity,
        code: string
    ): vscode.Diagnostic {
        const diagnostic = new vscode.Diagnostic(range, message, severity);
        diagnostic.code = code;
        diagnostic.source = 'flaxon';
        return diagnostic;
    }

    /**
     * Clear diagnostics.
     */
    clear(): void {
        this.diagnosticCollection.clear();
    }

    /**
     * Dispose diagnostics provider.
     */
    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}