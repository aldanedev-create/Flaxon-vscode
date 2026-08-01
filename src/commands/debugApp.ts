import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

export async function debugApp(): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flaxon project.');
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;

        const entryPoint = await findEntryPoint(workspacePath);
        if (!entryPoint) {
            vscode.window.showErrorMessage('No Flaxon application found. Please create a Flaxon project first.');
            return;
        }

        const pythonPath = vscode.workspace.getConfiguration('flaxon').get('pythonPath', 'python3');

        const debugConfig: vscode.DebugConfiguration = {
            name: 'Flaxon: Debug App',
            type: 'python',
            request: 'launch',
            module: 'flaxon',
            args: ['run', entryPoint],
            console: 'integratedTerminal',
            env: {
                PYTHONPATH: workspacePath
            },
            cwd: workspacePath
        };

        logger.info(`Starting debug session for: ${entryPoint}`);
        
        const result = await vscode.debug.startDebugging(workspaceFolder, debugConfig);

        if (result) {
            vscode.window.showInformationMessage('Debug session started');
        } else {
            vscode.window.showErrorMessage('Failed to start debug session');
        }

    } catch (error: any) {
        const message = error?.message || 'Unknown error occurred';
        logger.error(`Failed to debug app: ${message}`);
        vscode.window.showErrorMessage(`Failed to debug app: ${message}`);
    }
}

async function findEntryPoint(workspacePath: string): Promise<string | null> {
    const configEntry = vscode.workspace.getConfiguration('flaxon').get('entryPoint', 'app:app');
    const [configModule] = configEntry.split(':');
    if (fs.existsSync(path.join(workspacePath, `${configModule}.py`))) {
        return configEntry;
    }

    const entryPoints = ['app:app', 'main:app', 'server:app'];
    for (const ep of entryPoints) {
        const [module] = ep.split(':');
        const filePath = path.join(workspacePath, `${module}.py`);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('Flaxon(') || content.includes('from flaxon import')) {
                return ep;
            }
        }
    }

    return null;
}