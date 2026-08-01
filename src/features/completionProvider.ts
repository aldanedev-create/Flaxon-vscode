import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Completion provider for Flaxon APIs.
 * Provides intelligent auto-completions.
 */
export class CompletionProvider implements vscode.CompletionItemProvider {
    /**
     * Provide completion items for a document.
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | Thenable<vscode.CompletionItem[]> {
        const line = document.lineAt(position.line).text;
        const textBeforeCursor = line.substring(0, position.character);

        const completions: vscode.CompletionItem[] = [];

        // Route decorator completions
        if (textBeforeCursor.includes('@app.')) {
            const decorators = [
                { label: 'get', detail: '@app.get("/path")', documentation: 'GET route decorator' },
                { label: 'post', detail: '@app.post("/path")', documentation: 'POST route decorator' },
                { label: 'put', detail: '@app.put("/path")', documentation: 'PUT route decorator' },
                { label: 'delete', detail: '@app.delete("/path")', documentation: 'DELETE route decorator' },
                { label: 'patch', detail: '@app.patch("/path")', documentation: 'PATCH route decorator' },
                { label: 'websocket', detail: '@app.websocket("/ws/path")', documentation: 'WebSocket route decorator' }
            ];

            for (const dec of decorators) {
                const item = new vscode.CompletionItem(dec.label, vscode.CompletionItemKind.Function);
                item.detail = dec.detail;
                item.documentation = new vscode.MarkdownString(dec.documentation);
                item.insertText = `${dec.label}("")`;
                item.sortText = `0${dec.label}`;
                completions.push(item);
            }
        }

        // Schema field completions
        if (textBeforeCursor.includes('fields.')) {
            const fields = [
                { label: 'String', detail: 'fields.String(required=True)', documentation: 'String field' },
                { label: 'Integer', detail: 'fields.Integer(required=True)', documentation: 'Integer field' },
                { label: 'Float', detail: 'fields.Float(required=True)', documentation: 'Float field' },
                { label: 'Boolean', detail: 'fields.Boolean(required=False)', documentation: 'Boolean field' },
                { label: 'Email', detail: 'fields.Email(required=True)', documentation: 'Email field with validation' },
                { label: 'Choice', detail: 'fields.Choice(choices=[...])', documentation: 'Choice field' },
                { label: 'UUID', detail: 'fields.UUID(required=True)', documentation: 'UUID field' },
                { label: 'DateTime', detail: 'fields.DateTime(required=True)', documentation: 'DateTime field' }
            ];

            for (const field of fields) {
                const item = new vscode.CompletionItem(field.label, vscode.CompletionItemKind.Field);
                item.detail = field.detail;
                item.documentation = new vscode.MarkdownString(field.documentation);
                item.insertText = `${field.label}(required=True)`;
                item.sortText = `0${field.label}`;
                completions.push(item);
            }
        }

        // HTTP Exception completions
        if (textBeforeCursor.includes('HTTPException(')) {
            const exceptions = [
                { label: '400', detail: 'HTTPException(400, "Bad Request")' },
                { label: '401', detail: 'HTTPException(401, "Unauthorized")' },
                { label: '403', detail: 'HTTPException(403, "Forbidden")' },
                { label: '404', detail: 'HTTPException(404, "Not Found")' },
                { label: '422', detail: 'HTTPException(422, "Validation Error")' },
                { label: '500', detail: 'HTTPException(500, "Internal Server Error")' }
            ];

            for (const exc of exceptions) {
                const item = new vscode.CompletionItem(exc.label, vscode.CompletionItemKind.Constant);
                item.detail = exc.detail;
                item.insertText = `${exc.label}, "${exc.detail.split('"')[1]}"`;
                item.sortText = `0${exc.label}`;
                completions.push(item);
            }
        }

        // Request method completions
        if (textBeforeCursor.includes('request.')) {
            const methods = [
                { label: 'json()', detail: 'await request.json()', documentation: 'Parse JSON body' },
                { label: 'form()', detail: 'await request.form()', documentation: 'Parse form data' },
                { label: 'body()', detail: 'await request.body()', documentation: 'Get raw body' },
                { label: 'headers', detail: 'request.headers', documentation: 'Request headers' },
                { label: 'query_params', detail: 'request.query_params', documentation: 'Query parameters' },
                { label: 'path_params', detail: 'request.path_params', documentation: 'Path parameters' },
                { label: 'cookies', detail: 'request.cookies', documentation: 'Request cookies' }
            ];

            for (const method of methods) {
                const item = new vscode.CompletionItem(method.label, vscode.CompletionItemKind.Method);
                item.detail = method.detail;
                item.documentation = new vscode.MarkdownString(method.documentation);
                item.sortText = `0${method.label}`;
                completions.push(item);
            }
        }

        // Schema class completions
        if (textBeforeCursor.includes('class ') && textBeforeCursor.includes('(Schema)')) {
            const item = new vscode.CompletionItem('Schema', vscode.CompletionItemKind.Class);
            item.detail = 'from flaxon.validation import Schema, fields';
            item.documentation = new vscode.MarkdownString('**Schema class**\n\n```python\nclass MySchema(Schema):\n    name = fields.String(required=True)\n```');
            item.insertText = `Schema`;
            completions.push(item);
        }

        return completions;
    }
}