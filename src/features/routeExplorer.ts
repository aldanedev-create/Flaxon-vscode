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
export class RouteGroupItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly routes: RouteItem[]
    ) {
        super(label, collapsibleState);
        this.contextValue = 'routeGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

/**
 * Tree item representing a route.
 */
export class RouteItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly route: RouteData,
        public readonly filePath: string,
        public readonly lineNumber: number
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'route';
        this.tooltip = `${route.method} ${route.path}`;
        this.description = `${route.method} ${route.path}`;
        this.command = {
            command: 'vscode.open',
            title: 'Go to route',
            arguments: [
                vscode.Uri.file(filePath),
                { selection: new vscode.Range(lineNumber, 0, lineNumber, 0) }
            ]
        };
        this.iconPath = this.getIconForMethod(route.method);
    }

    private getIconForMethod(method: string): vscode.ThemeIcon {
        const iconMap: Record<string, string> = {
            'GET': 'arrow-right',
            'POST': 'add',
            'PUT': 'edit',
            'DELETE': 'trash',
            'PATCH': 'edit',
            'WS': 'plug'
        };
        return new vscode.ThemeIcon(iconMap[method] || 'circle');
    }
}

/**
 * Route data interface.
 */
export interface RouteData {
    method: string;
    path: string;
    handler: string;
    file: string;
    line: number;
    name?: string;
    parameters?: string[];
}