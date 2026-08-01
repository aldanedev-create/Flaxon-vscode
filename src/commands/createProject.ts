import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

function runFlaxonCommand(args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = `flaxon ${args.join(' ')}`;
        logger.info(`Running: ${command} in ${cwd}`);

        const proc = child_process.exec(command, { cwd: cwd, env: process.env });

        process.stdout?.on('data', (data: Buffer) => {
            logger.info(data.toString());
        });

        process.stderr?.on('data', (data: Buffer) => {
            logger.error(data.toString());
        });

        process.on('close', (code: number) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        process.on('error', (error: Error) => {
            reject(error);
        });
    });
}

async function createVirtualEnvironment(projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const pythonPath = vscode.workspace.getConfiguration('flaxon').get('pythonPath', 'python3');
        const command = `${pythonPath} -m venv .venv`;
        logger.info(`Creating virtual environment: ${command}`);

        const process = child_process.exec(command, { cwd: projectPath });

        process.on('close', (code: number) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Virtual environment creation failed with code ${code}`));
            }
        });

        process.on('error', reject);
    });
}

async function installDependencies(projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const pipCommand = isWindows ? `.venv\\Scripts\\pip` : `.venv/bin/pip`;
        const command = `${pipCommand} install flaxon`;
        logger.info(`Installing dependencies: ${command}`);

        const proc = child_process.exec(command, { cwd: projectPath });

        process.on('close', (code: number) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Dependency installation failed with code ${code}`));
            }
        });

        process.on('error', reject);
    });
}