import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RouteItem, RouteGroupItem, RouteData } from './routeExplorer';
import { parseRoutes } from '../utils/routeParser';
import { logger } from '../utils/logger';

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
    refresh(): void {
        this.loadRoutes();
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Load routes from the workspace.
     */
    private loadRoutes(): void {
        this.routes = [];
        this.groupedRoutes.clear();

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        
        try {
            this.routes = parseRoutes(workspacePath);
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
            const fileName = path.basename(route.file);
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
                const sortedRoutes = routes.sort((a, b) => a.path.localeCompare(b.path));
                const routeItems = sortedRoutes.map(r => 
                    new RouteItem(
                        `${r.method} ${r.path}`,
                        r,
                        r.file,
                        r.line
                    )
                );
                items.push(new RouteGroupItem(
                    `📄 ${groupName}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    routeItems
                ));
            }

            // Add uncategorized routes (files without group)
            const uncategorized = this.routes.filter(r => !this.groupedRoutes.has(path.basename(r.file)));
            for (const route of uncategorized) {
                items.push(new RouteItem(
                    `${route.method} ${route.path}`,
                    route,
                    route.file,
                    route.line
                ));
            }

            return items;
        }

        if (element instanceof RouteGroupItem) {
            return element.routes;
        }

        return [];
    }
}