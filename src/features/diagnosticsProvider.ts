import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Diagnostics provider for Flaxon linting.
 * Provides real-time error checking.
 */
export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly pendingDiagnostics = new Map<string, ReturnType<typeof setTimeout>>();

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('flaxon');
        this.disposables.push(this.diagnosticCollection);
        
        // Watch for changes on disk and in workspace
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        this.disposables.push(watcher);
        this.disposables.push(watcher.onDidChange((uri) => this.scheduleDiagnostics(uri)));
        this.disposables.push(watcher.onDidCreate((uri) => this.scheduleDiagnostics(uri)));
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => this.scheduleDiagnostics(doc.uri, doc))
        );
        
        // Run diagnostics on active editor changes
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.languageId === 'python') {
                this.scheduleDiagnostics(editor.document.uri, editor.document);
            }
        }));

        // Initial run for open documents
        vscode.workspace.textDocuments.forEach((doc) => {
            if (doc.languageId === 'python') {
                this.scheduleDiagnostics(doc.uri, doc);
            }
        });
    }

    private scheduleDiagnostics(uri: vscode.Uri, document?: vscode.TextDocument): void {
        const key = uri.toString();
        const pending = this.pendingDiagnostics.get(key);
        if (pending) {
            clearTimeout(pending);
        }
        this.pendingDiagnostics.set(key, setTimeout(() => {
            this.pendingDiagnostics.delete(key);
            void this.runDiagnostics(uri, document);
        }, 150));
    }

    /**
     * Run diagnostics on a Python file.
     */
    private async runDiagnostics(uri: vscode.Uri, currentDocument?: vscode.TextDocument): Promise<void> {
        try {
            const document = currentDocument
                || vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString())
                || await vscode.workspace.openTextDocument(uri);
            if (document.languageId !== 'python') {
                this.diagnosticCollection.delete(uri);
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
                    if (!nextLine.includes('async def')) {
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
                if ((line.includes('async def') || /^\s*def\s+/.test(line))
                    && i > 0
                    && lines[i - 1].includes('@app.')) {
                    const indent = line.match(/^\s*/)?.[0].length ?? 0;
                    let j = i + 1;
                    const bodyLines: string[] = [];
                    while (j < lines.length) {
                        const next = lines[j];
                        const nextIndent = next.match(/^\s*/)?.[0].length ?? 0;
                        if (next.trim() && nextIndent <= indent) {
                            break;
                        }
                        bodyLines.push(next);
                        j++;
                    }
                    const funcText = bodyLines.join('\n');
                    if (!funcText.includes('return') && !funcText.includes('yield')) {
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
                    const routeBody = lines.slice(lineNum, lineNum + 30).join('\n');
                    if (!routeBody.includes('await socket.accept()')) {
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
        for (const timer of this.pendingDiagnostics.values()) {
            clearTimeout(timer);
        }
        this.pendingDiagnostics.clear();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }
}