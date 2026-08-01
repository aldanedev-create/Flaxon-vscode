import * as vscode from 'vscode';

/**
 * Language configuration for Flaxon.
 * Defines language features like comments, brackets, etc.
 */
export function configureLanguage(context: vscode.ExtensionContext): void {
    // Language configuration is loaded from package.json
    // This file contains additional runtime configuration
    
    const disposable = vscode.languages.setLanguageConfiguration('python', {
        comments: {
            lineComment: '#',
            blockComment: ['"""', '"""']
        },
        brackets: [
            ['(', ')'],
            ['[', ']'],
            ['{', '}']
        ],
        autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '{', close: '}' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '"""', close: '"""' },
            { open: "'''", close: "'''" }
        ],
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
    });

    // Push to subscriptions to clean up memory when deactivated
    context.subscriptions.push(disposable);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(() => {
            // Reload configuration if needed
        })
    );
}