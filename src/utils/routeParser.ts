import * as fs from 'fs';
import * as path from 'path';
import { Route, parseFlaxonApp } from './flaxonParser';
import { logger } from './logger';

/**
 * Parse routes from the workspace.
 */
export function parseRoutes(workspacePath: string): Route[] {
    const allRoutes: Route[] = [];

    try {
        // Find all Python files
        const pyFiles = findPythonFiles(workspacePath);
        
        for (const file of pyFiles) {
            const filePath = path.join(workspacePath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Only parse files that might contain Flaxon routes
            if (content.includes('@app.') || content.includes('from flaxon')) {
                const routes = parseFlaxonApp(content);
                routes.forEach(route => {
                    route.file = filePath;
                    allRoutes.push(route);
                });
                logger.debug(`Found ${routes.length} routes in ${file}`);
            }
        }
    } catch (error) {
        logger.error(`Failed to parse routes: ${error}`);
    }

    return allRoutes;
}

/**
 * Find all Python files in a directory.
 */
function findPythonFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            // Skip common directories
            if (entry.isDirectory()) {
                if (['.venv', 'venv', '__pycache__', '.git', 'node_modules', 'dist', 'build'].includes(entry.name)) {
                    continue;
                }
                files.push(...findPythonFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.py')) {
                // Skip common file patterns
                if (['__init__.py', 'conftest.py'].includes(entry.name)) {
                    continue;
                }
                files.push(fullPath);
            }
        }
    } catch (error) {
        logger.debug(`Error scanning directory: ${error}`);
    }

    return files;
}

/**
 * Get route count by method.
 */
export function getRouteStats(routes: Route[]): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    for (const route of routes) {
        stats[route.method] = (stats[route.method] || 0) + 1;
    }
    return stats;
}

/**
 * Group routes by file.
 */
export function groupRoutesByFile(routes: Route[]): { [key: string]: Route[] } {
    const groups: { [key: string]: Route[] } = {};
    for (const route of routes) {
        const fileName = path.basename(route.file);
        if (!groups[fileName]) {
            groups[fileName] = [];
        }
        groups[fileName].push(route);
    }
    return groups;
}

/**
 * Group routes by prefix.
 */
export function groupRoutesByPrefix(routes: Route[], prefixLength: number = 2): { [key: string]: Route[] } {
    const groups: { [key: string]: Route[] } = {};
    for (const route of routes) {
        const parts = route.path.split('/').filter(p => p);
        const prefix = parts.slice(0, prefixLength).join('/');
        const key = prefix || 'root';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(route);
    }
    return groups;
}