import * as vscode from 'vscode';

/**
 * Language configuration for Flaxon.
 * Defines language features like comments, brackets, etc.
 */
export function configureLanguage(context: vscode.ExtensionContext): void {
    // Python's built-in language configuration already provides these rules.
    // Do not replace it globally for every Python project.
    void context;
}