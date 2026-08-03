import * as vscode from 'vscode';

/**
 * Hover provider for Flaxon APIs.
 * Shows documentation on hover.
 */
export class HoverProvider implements vscode.HoverProvider {
    private docs: Map<string, string> = new Map();

    constructor() {
        this.loadDocumentation();
    }

    /**
     * Load Flaxon API documentation.
     */
    private loadDocumentation(): void {
        // Route decorators
        this.docs.set('@app.get', `**Flaxon GET route**
\`\`\`python
@app.get("/path")
async def handler(request):
    return {"message": "Hello"}
\`\`\`
**Parameters:**
- \`path\`: Route path (e.g., \`"/users/<int:id>"\`)
- \`name\`: Optional route name`);

        this.docs.set('@app.post', `**Flaxon POST route**
\`\`\`python
@app.post("/path")
async def handler(request):
    data = await request.json()
    return {"status": "created"}
\`\`\`
**Parameters:**
- \`path\`: Route path
- \`name\`: Optional route name`);

        this.docs.set('@app.put', this.docs.get('@app.post')!);
        this.docs.set('@app.delete', this.docs.get('@app.get')!);
        this.docs.set('@app.patch', this.docs.get('@app.post')!);

        this.docs.set('@app.websocket', `**Flaxon WebSocket route**
\`\`\`python
@app.websocket("/ws/chat")
async def handler(socket):
    await socket.accept()
    async for message in socket.iter_json():
        await socket.send_json({"echo": message})
\`\`\`
**Parameters:**
- \`path\`: WebSocket path
- \`name\`: Optional route name`);

        this.docs.set('HTTPException', `**Flaxon HTTPException**
\`\`\`python
from flaxon.exceptions import HTTPException

raise HTTPException(404, "Not found")
raise HTTPException(422, "Validation failed")
\`\`\`
**Common status codes:**
- \`400\`: Bad Request
- \`401\`: Unauthorized
- \`403\`: Forbidden
- \`404\`: Not Found
- \`422\`: Validation Error
- \`500\`: Internal Server Error`);

        // Schema fields
        this.docs.set('fields.String', `**Flaxon String Field**
\`\`\`python
name = fields.String(
    required=True,
    min_length=2,
    max_length=80
)
\`\`\`
**Parameters:**
- \`required\`: Whether field is required
- \`min_length\`: Minimum string length
- \`max_length\`: Maximum string length
- \`pattern\`: Regex pattern to match`);

        this.docs.set('fields.Integer', `**Flaxon Integer Field**
\`\`\`python
age = fields.Integer(
    required=True,
    minimum=0,
    maximum=120
)
\`\`\`
**Parameters:**
- \`required\`: Whether field is required
- \`minimum\`: Minimum value
- \`maximum\`: Maximum value`);

        this.docs.set('fields.Email', `**Flaxon Email Field**
\`\`\`python
email = fields.Email(
    required=True
)
\`\`\`
**Parameters:**
- \`required\`: Whether field is required
- \`allow_empty\`: Allow empty string`);

        this.docs.set('fields.Boolean', `**Flaxon Boolean Field**
\`\`\`python
is_active = fields.Boolean(
    required=False,
    default=True
)
\`\`\`
**Parameters:**
- \`required\`: Whether field is required
- \`default\`: Default value`);
    }

    /**
     * Provide hover information.
     */
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.Hover | Thenable<vscode.Hover> | null {
        const line = document.lineAt(position.line).text;
        const wordRange = document.getWordRangeAtPosition(
            position,
            /[A-Za-z_][A-Za-z0-9_]*/
        );
        let range = wordRange;
        let docKey: string | undefined;

        const decoratorMatch = line.match(/@app\.(get|post|put|delete|patch|websocket)\b/);
        if (decoratorMatch) {
            const start = line.indexOf(decoratorMatch[0]);
            const end = start + decoratorMatch[0].length;
            if (position.character >= start && position.character <= end) {
                range = new vscode.Range(
                    position.line,
                    start,
                    position.line,
                    end
                );
                docKey = `@app.${decoratorMatch[1]}`;
            }
        }

        const fieldMatch = line.match(/fields\.(String|Integer|Float|Boolean|Email|Choice|UUID|DateTime)\b/);
        if (!docKey && fieldMatch) {
            const start = line.indexOf(fieldMatch[0]);
            const end = start + fieldMatch[0].length;
            if (position.character >= start && position.character <= end) {
                range = new vscode.Range(position.line, start, position.line, end);
                docKey = fieldMatch[0];
            }
        }

        if (!docKey && line.includes('HTTPException')) {
            const start = line.indexOf('HTTPException');
            const end = start + 'HTTPException'.length;
            if (position.character >= start && position.character <= end) {
                range = new vscode.Range(position.line, start, position.line, end);
                docKey = 'HTTPException';
            }
        }
        if (!range || !docKey) {
            return null;
        }

        if (this.docs.has(docKey)) {
            const hoverContent = new vscode.MarkdownString(this.docs.get(docKey)!);
            return new vscode.Hover(hoverContent, range);
        }

        return null;
    }
}