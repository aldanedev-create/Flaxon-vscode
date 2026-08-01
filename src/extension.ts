import * as vscode from 'vscode';
import { createProject } from './commands/createProject';
import { runApp } from './commands/runApp';
import { debugApp } from './commands/debugApp';
import { generateRoute } from './commands/generateRoute';
import { generateSchema } from './commands/generateSchema';
import { logger } from './utils/logger';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Flaxon');
    logger.setOutputChannel(outputChannel);
    logger.info('Flaxon extension activated');

    const commands = [
        { id: 'flaxon.createProject', handler: createProject },
        { id: 'flaxon.runApp', handler: runApp },
        { id: 'flaxon.debugApp', handler: debugApp },
        { id: 'flaxon.generateRoute', handler: generateRoute },
        { id: 'flaxon.generateSchema', handler: generateSchema }
    ];

    commands.forEach((cmd) => {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
    });

    logger.info('Flaxon extension ready');
}

export function deactivate() {
    logger.info('Flaxon extension deactivated');
    if (outputChannel) {
        outputChannel.dispose();
    }
}