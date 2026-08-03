import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

export async function runApp(): Promise<void> {
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

        const configuredPythonPath = vscode.workspace
            .getConfiguration('flaxon')
            .get<unknown>('pythonPath');
        const pythonPath = typeof configuredPythonPath === 'string' && configuredPythonPath.trim()
            ? configuredPythonPath.trim()
            : (process.platform === 'win32' ? 'python' : 'python3');
        if (!await checkPythonInstalled(pythonPath)) {
            vscode.window.showErrorMessage('Python is not installed or not found in PATH.');
            return;
        }

        if (!await checkFlaxonInstalled(pythonPath, workspacePath)) {
            const install = await vscode.window.showInformationMessage(
                'Flaxon is not installed in this project. Install it?',
                'Install',
                'Cancel'
            );
            if (install === 'Install') {
                await installFlaxon(pythonPath, workspacePath);
            } else {
                return;
            }
        }

        const reload = vscode.workspace.getConfiguration('flaxon').get('debug.reload', true);
        const args = ['run', entryPoint];
        if (reload) {
            args.push('--reload');
        }

        const terminal = vscode.window.createTerminal({
            name: 'Flaxon App',
            cwd: workspacePath,
            env: process.env
        });

        const command = [
            quoteShellArgument(pythonPath),
            '-m',
            'flaxon',
            ...args.map(quoteShellArgument)
        ].join(' ');
        logger.info(`Running: ${command}`);
        
        terminal.sendText(command);
        terminal.show();

        vscode.window.showInformationMessage(`Flaxon app running at http://localhost:8000`);

    } catch (error: any) {
        const message = error?.message || 'Unknown error occurred';
        logger.error(`Failed to run app: ${message}`);
        vscode.window.showErrorMessage(`Failed to run app: ${message}`);
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

async function checkPythonInstalled(pythonPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        child_process.execFile(pythonPath, ['--version'], (error) => {
            resolve(!error);
        });
    });
}

async function checkFlaxonInstalled(pythonPath: string, workspacePath: string): Promise<boolean> {
    return new Promise((resolve) => {
        child_process.execFile(
            pythonPath,
            ['-c', 'import flaxon'],
            { cwd: workspacePath },
            (error) => {
            resolve(!error);
            }
        );
    });
}

async function installFlaxon(pythonPath: string, workspacePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const args = ['-m', 'pip', 'install', 'flaxon'];
        logger.info(`Installing Flaxon: ${pythonPath} ${args.join(' ')}`);
        const proc = child_process.spawn(pythonPath, args, {
            cwd: workspacePath,
            env: process.env,
            shell: false
        });

        proc.stdout.on('data', (data: Buffer) => logger.info(data.toString().trimEnd()));
        proc.stderr.on('data', (data: Buffer) => logger.error(data.toString().trimEnd()));

        proc.once('close', (code: number | null, signal: NodeJS.Signals | null) => {
            if (code === 0) {
                resolve();
            } else if (signal) {
                reject(new Error(`Installation was terminated by ${signal}`));
            } else {
                reject(new Error(`Installation failed with code ${code ?? 'unknown'}`));
            }
        });

        proc.once('error', reject);
    });
}

function quoteShellArgument(value: string): string {
    if (process.platform === 'win32') {
        return `"${value.replace(/(["\\])/g, '\\$1')}"`;
    }
    return `'${value.replace(/'/g, "'\\''")}'`;
}