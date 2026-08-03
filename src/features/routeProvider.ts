import * as vscode from 'vscode';
import * as path from 'path';
import { parseRoutes } from '../utils/routeParser';
import { logger } from '../utils/logger';

export interface RouteData {
    method: string;
    path: string;
    handler: string;
    file: string;
    line: number;
    name?: string;
    parameters?: string[];
    references?: number;
}

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
                {
                    selection: new vscode.Range(
                        Math.max(0, lineNumber),
                        0,
                        Math.max(0, lineNumber),
                        0
                    )
                }
            ]
        };
        this.iconPath = this.getIconForMethod(route.method);
    }

    private getIconForMethod(method: string): vscode.ThemeIcon {
        const iconMap: Record<string, string> = {
            GET: 'arrow-right',
            POST: 'add',
            PUT: 'edit',
            DELETE: 'trash',
            PATCH: 'edit',
            WS: 'plug'
        };
        return new vscode.ThemeIcon(iconMap[method.toUpperCase()] || 'circle');
    }
}

/**
 * Route data provider for the tree view.
 */
export class RouteProvider implements vscode.TreeDataProvider<any> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private routes: RouteData[] = [];
    private groupedRoutes: Map<string, RouteData[]> = new Map();

    /**
     * Refresh the tree view.
     */
    async refresh(): Promise<void> {
        await this.loadRoutes();
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Load routes from the workspace.
     */
    private async loadRoutes(): Promise<void> {
        this.routes = [];
        this.groupedRoutes.clear();

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        
        try {
            // Correctly await the parsed routes and assign them
            this.routes = await parseRoutes(workspacePath); 
            this.groupRoutes();
            logger.info(`Loaded ${this.routes.length} routes`);
        } catch (error) {
            logger.error(`Failed to load routes: ${error}`);
        }
    }

    /**
     * Group routes by file or prefix.
     */
    private groupRoutes(): void {
        // Group by file
        this.routes.forEach(route => {
            const fileName = path.normalize(route.file);
            if (!this.groupedRoutes.has(fileName)) {
                this.groupedRoutes.set(fileName, []);
            }
            this.groupedRoutes.get(fileName)!.push(route);
        });
    }

    getTreeItem(element: any): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: any): Promise<any[]> {
        if (!element) {
            // Root - return route groups
            const items: any[] = [];
            for (const [groupName, routes] of this.groupedRoutes) {
                const sortedRoutes = [...routes].sort((a, b) => a.path.localeCompare(b.path));
                const routeItems = sortedRoutes.map(r => 
                    new RouteItem(
                        `${r.method} ${r.path}`,
                        r,
                        path.isAbsolute(r.file) ? r.file : path.join(
                            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                            r.file
                        ),
                        Math.max(0, r.line - 1)
                    )
                );
                items.push(new RouteGroupItem(
                    `📄 ${path.basename(groupName)}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    routeItems
                ));
            }

            return items;
        }

        if (element instanceof RouteGroupItem) {
            return element.routes;
        }

        return [];
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}