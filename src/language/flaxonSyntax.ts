import * as vscode from 'vscode';

/**
 * Syntax highlighting configuration for Flaxon.
 * Injects additional syntax rules into Python files.
 */
export function configureSyntax(context: vscode.ExtensionContext): vscode.Disposable {
    // Syntax highlighting is defined in syntaxes/flaxon.tmLanguage.json
    // This file contains runtime configuration for syntax features
    
    // Register semantic tokens provider for enhanced highlighting
    const provider = new FlaxonSemanticTokensProvider();
    
    const disposable = vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'python', scheme: 'file' },
        provider,
        provider.legend
    );
    
    context.subscriptions.push(disposable);
    return disposable;
}

/**
 * Semantic tokens provider for Flaxon.
 */
class FlaxonSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    private readonly tokenTypes = ['class', 'function', 'method', 'keyword', 'decorator', 'parameter', 'variable'];
    private readonly tokenModifiers = ['declaration', 'readonly'];

    public readonly legend: vscode.SemanticTokensLegend = new vscode.SemanticTokensLegend(
        this.tokenTypes,
        this.tokenModifiers
    );

    async provideDocumentSemanticTokens(
        document: vscode.TextDocument
    ): Promise<vscode.SemanticTokens> {
        const builder = new vscode.SemanticTokensBuilder(this.legend);
        const text = document.getText();

        if (!/(?:@app\.|from\s+flaxon\b|import\s+flaxon\b|fields\.|class\s+\w+\s*\(\s*Schema\s*\))/.test(text)) {
            return builder.build();
        }

        // Helper to safely push tokens by resolving string type/modifiers to numerical indices
        const addToken = (
            line: number,
            char: number,
            length: number,
            tokenTypeStr: string,
            tokenModifierStrs: string[] = []
        ) => {
            const tokenTypeIndex = this.tokenTypes.indexOf(tokenTypeStr);
            if (tokenTypeIndex === -1) {
                return;
            }

            // Convert array of modifier strings into bitmask
            let modifierBitmask = 0;
            for (const mod of tokenModifierStrs) {
                const modIndex = this.tokenModifiers.indexOf(mod);
                if (modIndex !== -1) {
                    modifierBitmask |= (1 << modIndex);
                }
            }

            builder.push(line, char, length, tokenTypeIndex, modifierBitmask);
        };

        // Find Flaxon decorators
        const decoratorRegex = /@app\.(get|post|put|delete|patch|websocket)/g;
        let match: RegExpExecArray | null;
        while ((match = decoratorRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            if (!isCodePosition(document, match.index)) {
                continue;
            }
            addToken(
                pos.line,
                pos.character,
                match[0].length,
                'decorator',
                []
            );
        }

        // Find schema classes
        const schemaRegex = /class\s+(\w+)\s*\(\s*Schema\s*\)/g;
        while ((match = schemaRegex.exec(text)) !== null) {
            if (!isCodePosition(document, match.index)) {
                continue;
            }
            const pos = document.positionAt(match.index + match[0].indexOf(match[1]));
            addToken(
                pos.line,
                pos.character,
                match[1].length,
                'class',
                ['declaration']
            );
        }

        // Find HTTPException
        const exceptionRegex = /HTTPException/g;
        while ((match = exceptionRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            if (!isCodePosition(document, match.index)) {
                continue;
            }
            addToken(
                pos.line,
                pos.character,
                match[0].length,
                'keyword',
                []
            );
        }

        // Find fields
        const fieldRegex = /fields\.(String|Integer|Float|Boolean|Email|Choice|UUID|DateTime)/g;
        while ((match = fieldRegex.exec(text)) !== null) {
            if (!isCodePosition(document, match.index)) {
                continue;
            }
            const pos = document.positionAt(match.index + match[0].indexOf(match[1]));
            addToken(
                pos.line,
                pos.character,
                match[1].length,
                'method',
                []
            );
        }

        return builder.build();
    }
}

function isCodePosition(document: vscode.TextDocument, offset: number): boolean {
    const position = document.positionAt(offset);
    const line = document.lineAt(position.line).text;
    const before = line.slice(0, position.character);
    if (before.trimStart().startsWith('#')) {
        return false;
    }

    let singleQuotes = 0;
    let doubleQuotes = 0;
    for (let i = 0; i < before.length; i++) {
        if (before[i] === "'" && before[i - 1] !== '\\') {
            singleQuotes++;
        } else if (before[i] === '"' && before[i - 1] !== '\\') {
            doubleQuotes++;
        }
    }
    return singleQuotes % 2 === 0 && doubleQuotes % 2 === 0;
}