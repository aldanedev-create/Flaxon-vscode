import * as vscode from 'vscode';

/**
 * Code snippets for Flaxon.
 * Provides quick templates for common Flaxon patterns.
 */
export const snippets = {
    'froute': {
        prefix: ['froute', 'flaxon-route'],
        body: [
            '@app.${1:get}("${2:/api/${3:resource}}")',
            'async def ${4:handler}(request):',
            '    """${5:Handler description}."""',
            '    return {"message": "Hello from ${6:route}!"}',
            ''
        ],
        description: 'Create a Flaxon route'
    },
    'fpost': {
        prefix: ['fpost', 'flaxon-post'],
        body: [
            '@app.post("${1:/api/${2:resource}}")',
            'async def ${3:create_${2:resource}}(request):',
            '    """Create a new ${2:resource}."""',
            '    data = await request.json()',
            '    return {"status": "created", "data": data}',
            ''
        ],
        description: 'Create a POST route'
    },
    'fws': {
        prefix: ['fws', 'flaxon-websocket'],
        body: [
            '@app.websocket("${1:/ws/${2:channel}}")',
            'async def ${3:handle_${2:channel}}(socket):',
            '    """WebSocket handler for ${2:channel}."""',
            '    await socket.accept()',
            '    try:',
            '        async for message in socket.iter_json():',
            '            await socket.send_json({"echo": message})',
            '    finally:',
            '        await socket.close()',
            ''
        ],
        description: 'Create a WebSocket route'
    },
    'fschema': {
        prefix: ['fschema', 'flaxon-schema'],
        body: [
            'from flaxon.validation import Schema, fields',
            '',
            'class ${1:SchemaName}(Schema):',
            '    """${2:Schema description}."""',
            '    ${3:name} = fields.${4:String}(required=True, min_length=2)',
            '    ${5:email} = fields.Email(required=True)',
            '    ${6:age} = fields.Integer(required=False, minimum=0)',
            '',
            '    def to_dict(self) -> dict:',
            '        """Convert schema to dictionary."""',
            '        return {',
            '            "${3:name}": self.${3:name},',
            '            "${5:email}": self.${5:email},',
            '            "${6:age}": self.${6:age},',
            '        }',
            ''
        ],
        description: 'Create a validation schema'
    },
    'fvalidation': {
        prefix: ['fvalidation', 'flaxon-validation'],
        body: [
            'from flaxon.validation import Schema, fields',
            'from flaxon.exceptions import HTTPException',
            '',
            'class ${1:Create${2:Resource}}Request(Schema):',
            '    """Request schema for creating ${2:resource}."""',
            '    ${3:field} = fields.${4:String}(required=True)',
            '',
            '@app.post("${5:/api/${2:resource}}")',
            'async def ${6:create_${2:resource}}(request):',
            '    """Create a new ${2:resource} with validation."""',
            '    try:',
            '        data = await request.json()',
            '        validated = ${1:Create${2:Resource}}Request(**data)',
            '        return {"status": "created", "data": validated.to_dict()}',
            '    except Exception as e:',
            '        raise HTTPException(422, f"Validation error: {e}")',
            ''
        ],
        description: 'Create a route with validation'
    },
    'fmiddleware': {
        prefix: ['fmiddleware', 'flaxon-middleware'],
        body: [
            'from flaxon.middleware import Middleware',
            'from flaxon.http import Request, Response',
            '',
            'class ${1:CustomMiddleware}(Middleware):',
            '    """${2:Middleware description}."""',
            '    ',
            '    def __init__(self, app):',
            '        self.app = app',
            '    ',
            '    async def __call__(self, scope, receive, send):',
            '        """Process request and response."""',
            '        # Before request',
            '        await self.app(scope, receive, send)',
            '        # After response',
            ''
        ],
        description: 'Create a custom middleware'
    },
    'fplugin': {
        prefix: ['fplugin', 'flaxon-plugin'],
        body: [
            'from flaxon.plugin import Plugin',
            'from flaxon import Flaxon',
            '',
            'class ${1:MyPlugin}(Plugin):',
            '    """${2:Plugin description}."""',
            '    ',
            '    name = "${3:my-plugin}"',
            '    version = "${4:0.1.0}"',
            '    description = "${2:Plugin description}"',
            '    author = "${5:Your Name}"',
            '    requires = []',
            '    ',
            '    def __init__(self, config: dict = None):',
            '        self.config = config or {}',
            '    ',
            '    def setup(self, app: Flaxon):',
            '        """Setup the plugin."""',
            '        app.state.${6:my_plugin} = self',
            '        ',
            '        @app.get("/${7:plugin-route}")',
            '        async def plugin_route(request):',
            '            return {"plugin": "${3:my-plugin}"}',
            ''
        ],
        description: 'Create a custom plugin'
    },
    'ftest': {
        prefix: ['ftest', 'flaxon-test'],
        body: [
            'import pytest',
            'from flaxon.testing import TestClient',
            'from app import app',
            '',
            'def test_${1:route_name}():',
            '    """Test ${2:route description}."""',
            '    client = TestClient(app)',
            '    response = client.get("${3:/api/${4:endpoint}}")',
            '    assert response.status_code == 200',
            '    data = response.json()',
            '    assert data["${5:key}"] == "${6:expected_value}"',
            ''
        ],
        description: 'Create a test for a Flaxon route'
    },
    'frequest': {
        prefix: ['frequest', 'flaxon-request'],
        body: [
            '# Request methods',
            '# - await request.json() - Parse JSON body',
            '# - await request.form() - Parse form data',
            '# - await request.body() - Get raw body',
            '# - request.headers - Request headers',
            '# - request.query_params - Query parameters',
            '# - request.path_params - Path parameters',
            '# - request.cookies - Request cookies',
            ''
        ],
        description: 'Flaxon request methods reference'
    }
};

/**
 * Register snippets with VS Code.
 */
export function registerSnippets(context: vscode.ExtensionContext): void {
    // Snippets are loaded from snippets/flaxon.json
    // This is a fallback for runtime registration
    
    const snippetProvider = new FlaxonSnippetProvider();
    const disposable = vscode.languages.registerCompletionItemProvider(
        { language: 'python', scheme: 'file' },
        snippetProvider,
        '.', '_', ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    );
    context.subscriptions.push(disposable);
}

/**
 * Snippet completion provider.
 */
class FlaxonSnippetProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | Thenable<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
        const currentWord = linePrefix.match(/[A-Za-z_][A-Za-z0-9_-]*$/)?.[0] || '';
        
        for (const [key, snippet] of Object.entries(snippets)) {
            const matchesPrefix = snippet.prefix.some(prefix =>
                !currentWord || prefix.toLowerCase().startsWith(currentWord.toLowerCase())
            );
            if (!matchesPrefix) {
                continue;
            }
            const item = new vscode.CompletionItem(
                snippet.prefix[0],
                vscode.CompletionItemKind.Snippet
            );
            item.detail = snippet.description;
            item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
            item.range = document.getWordRangeAtPosition(
                position,
                /[A-Za-z_][A-Za-z0-9_-]*/
            ) || new vscode.Range(position, position);
            item.sortText = `0${key}`;
            items.push(item);
        }
        
        return items;
    }
}