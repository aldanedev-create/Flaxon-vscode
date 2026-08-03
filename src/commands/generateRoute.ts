import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Generate a new route file.
 * Command: flaxon.generateRoute
 */
export async function generateRoute(): Promise<void> {
    try {
        // Find the workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flaxon project.');
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;

        // Step 1: Get route path
        const routePath = await vscode.window.showInputBox({
            prompt: 'Enter route path (e.g., /api/users)',
            placeHolder: '/api/users',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Route path is required';
                }
                if (!value.startsWith('/')) {
                    return 'Route path must start with "/"';
                }
                if (/[\\'"`\r\n]/.test(value)) {
                    return 'Route path cannot contain quotes, backslashes, or newlines';
                }
                return null;
            }
        });

        if (!routePath) {
            logger.info('Route generation cancelled by user');
            return;
        }

        // Step 2: Get HTTP method
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'WS'];
        const method = await vscode.window.showQuickPick(methods, {
            placeHolder: 'Select HTTP method',
            title: 'Select HTTP method for route'
        });

        if (!method) {
            logger.info('Route generation cancelled by user');
            return;
        }

        // Step 3: Get route name (optional)
        const routeName = await vscode.window.showInputBox({
            prompt: 'Enter route name (optional)',
            placeHolder: 'users',
            validateInput: (value) => {
                if (value && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Route name must start with a letter or underscore and contain only letters, numbers, and underscores';
                }
                return null;
            }
        });

        // Step 4: Get file name
        const defaultFileName = routeName || routePath.replace(/^\//, '').replace(/\//g, '_') || 'routes';
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name',
            placeHolder: `${defaultFileName}.py`,
            value: `${defaultFileName}.py`,
            validateInput: (value) => {
                if (!/^[a-zA-Z0-9_-]+\.py$/.test(value)) {
                    return 'Use a Python filename such as users.py';
                }
                return null;
            }
        });

        if (!fileName) {
            logger.info('Route generation cancelled by user');
            return;
        }

        // Step 5: Generate route file
        const filePath = path.join(workspacePath, fileName);
        if (fs.existsSync(filePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `File "${fileName}" already exists. Overwrite?`,
                'Overwrite',
                'Cancel'
            );
            if (overwrite !== 'Overwrite') {
                return;
            }
        }

        const routeContent = generateRouteContent(routePath, method, routeName, workspacePath);
        fs.writeFileSync(filePath, routeContent, 'utf8');

        // Step 6: Open the file
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`Route generated: ${fileName}`);

        logger.info(`Route generated: ${fileName} at ${filePath}`);

    } catch (error: any) {
        const message = error?.message || 'Unknown error occurred';
        logger.error(`Failed to generate route: ${message}`);
        vscode.window.showErrorMessage(`Failed to generate route: ${message}`);
    }
}

/**
 * Generate route file content.
 */
interface ExistingApp {
    module: string;
    variable: string;
}

function generateRouteContent(
    routePath: string,
    method: string,
    routeName: string | undefined,
    workspacePath: string
): string {
    const existingApp = findAppVariable(workspacePath);
    const appImport = existingApp
        ? `from ${existingApp.module} import ${existingApp.variable}`
        : `from flaxon import Flaxon\n\napp = Flaxon()`;

    const methodLower = method.toLowerCase();
    const generatedName = routePath
        .replace(/^\//, '')
        .replace(/[{}]/g, '')
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const handlerName = routeName || `handle_${generatedName || 'root'}`;
    const pythonRoutePath = JSON.stringify(routePath);

    let websocketContent = '';
    if (method === 'WS') {
        websocketContent = `
@app.websocket(${pythonRoutePath})
async def ${handlerName}(socket):
    """
    WebSocket handler for ${routePath}.
    """
    await socket.accept()
    
    try:
        async for message in socket.iter_json():
            # Process message
            await socket.send_json({"echo": message})
    finally:
        await socket.close()`;
    } else {
        websocketContent = `
@app.${methodLower}(${pythonRoutePath})
async def ${handlerName}(request):
    """
    ${method} handler for ${routePath}.
    """
    return {"message": "Hello from ${routePath}!"}`;
    }

    return `"""${method} ${routePath} route for Flaxon application."""

${appImport}

${websocketContent}
`;
}

/**
 * Find the app variable in existing files.
 */
function findAppVariable(workspacePath: string): ExistingApp | null {
    const files = collectPythonFiles(workspacePath);

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/\b([a-zA-Z_]\w*)\s*=\s*Flaxon\s*\(/);
        if (match) {
            const relativePath = path.relative(workspacePath, filePath);
            const module = relativePath
                .replace(/\.py$/, '')
                .split(path.sep)
                .filter(part => part !== '__init__')
                .join('.');
            if (module) {
                return { module, variable: match[1] };
            }
        }
    }
    return null;
}

function collectPythonFiles(directory: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.venv' || entry.name === 'node_modules' || entry.name === '__pycache__') {
            continue;
        }
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectPythonFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.py')) {
            results.push(fullPath);
        }
    }
    return results;
}