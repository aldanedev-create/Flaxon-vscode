import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import { logger } from '../utils/logger';

export async function createProject(): Promise<void> {
    try {
        // Step 1: Get project name
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter your project name',
            placeHolder: 'my-flaxon-app',
            validateInput: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    return 'Project name can only contain letters, numbers, underscores, and hyphens';
                }
                return null;
            }
        });

        if (!projectName) {
            logger.info('Project creation cancelled by user');
            return;
        }

        // Step 2: Get project directory
        const defaultPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(), projectName);
        
        const projectPath = await vscode.window.showInputBox({
            prompt: 'Where should the project be created?',
            placeHolder: defaultPath,
            value: defaultPath
        });

        if (!projectPath) {
            logger.info('Project creation cancelled by user');
            return;
        }

        // Step 3: Create project with progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating Flaxon project: ${projectName}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Creating project structure...' });

            await runFlaxonCommand(['new', projectName], projectPath);

            progress.report({ increment: 50, message: 'Setting up virtual environment...' });
            await createVirtualEnvironment(projectPath);

            progress.report({ increment: 30, message: 'Installing dependencies...' });
            await installDependencies(projectPath);

            progress.report({ increment: 20, message: 'Done!' });

            const open = await vscode.window.showInformationMessage(
                `Project "${projectName}" created successfully!`,
                'Open Project'
            );

            if (open === 'Open Project') {
                const uri = vscode.Uri.file(projectPath);
                vscode.commands.executeCommand('vscode.openFolder', uri);
            }
        });

        logger.info(`Project created: ${projectName} at ${projectPath}`);

    } catch (error: any) {
        const message = error?.message || 'Unknown error occurred';
        logger.error(`Failed to create project: ${message}`);
        vscode.window.showErrorMessage(`Failed to create project: ${message}`);
    }
}

function getPythonPath(): string {
    const configured = vscode.workspace.getConfiguration('flaxon').get<unknown>('pythonPath');
    return typeof configured === 'string' && configured.trim()
        ? configured.trim()
        : (process.platform === 'win32' ? 'python' : 'python3');
}

function runCommand(
    executable: string,
    args: string[],
    cwd: string,
    description: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.info(`Running: ${executable} ${args.join(' ')} in ${cwd}`);
        const proc = child_process.spawn(executable, args, {
            cwd,
            env: process.env,
            shell: false
        });

        proc.stdout.on('data', (data: Buffer) => {
            logger.info(data.toString().trimEnd());
        });

        proc.stderr.on('data', (data: Buffer) => {
            logger.error(data.toString().trimEnd());
        });

        proc.once('close', (code: number | null, signal: NodeJS.Signals | null) => {
            if (code === 0) {
                resolve();
            } else if (signal) {
                reject(new Error(`${description} was terminated by ${signal}`));
            } else {
                reject(new Error(`${description} failed with code ${code ?? 'unknown'}`));
            }
        });

        proc.once('error', (error: Error) => {
            reject(new Error(`${description} could not start: ${error.message}`));
        });
    });
}

function runFlaxonCommand(args: string[], cwd: string): Promise<void> {
    return runCommand('flaxon', args, cwd, 'Flaxon project creation');
}

async function createVirtualEnvironment(projectPath: string): Promise<void> {
    await runCommand(
        getPythonPath(),
        ['-m', 'venv', '.venv'],
        projectPath,
        'Virtual environment creation'
    );
}

async function installDependencies(projectPath: string): Promise<void> {
    const pythonInVenv = path.join(
        projectPath,
        process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'
    );
    await runCommand(
        pythonInVenv,
        ['-m', 'pip', 'install', 'flaxon'],
        projectPath,
        'Dependency installation'
    );
}