import * as vscode from 'vscode';
import { RouteProvider } from './routeProvider';
import { logger } from '../utils/logger';

/**
 * Route Explorer - Tree view in sidebar showing all Flaxon routes.
 */
export class RouteExplorer {
    private treeView: vscode.TreeView<any>;
    private provider: RouteProvider;

    constructor(context: vscode.ExtensionContext) {
        this.provider = new RouteProvider();
        this.treeView = vscode.window.createTreeView('flaxonRoutes', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        });

        // Refresh routes on file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        watcher.onDidChange(() => this.refresh());
        watcher.onDidCreate(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());

        context.subscriptions.push(this.treeView);
        context.subscriptions.push(watcher);
        context.subscriptions.push(this.provider);

        // Initial refresh
        this.refresh();

        logger.info('Route Explorer initialized');
    }

    /**
     * Refresh the route tree view.
     */
    refresh(): void {
        this.provider.refresh();
    }

    /**
     * Get the tree view instance.
     */
    getTreeView(): vscode.TreeView<any> {
        return this.treeView;
    }
}

/**
 * Tree item representing a route group.
 */
export { RouteGroupItem, RouteItem, RouteData } from './routeProvider';