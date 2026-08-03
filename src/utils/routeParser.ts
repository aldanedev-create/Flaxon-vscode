import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { Route, parseFlaxonApp } from './flaxonParser';
import { logger } from './logger';

/**
 * Parse routes from the workspace concurrently without blocking the UI.
 */
export async function parseRoutes(workspacePath: string): Promise<Route[]> {
    const allRoutes: Route[] = [];

    try {
        // Find all Python files asynchronously
        const pyFiles = await findPythonFiles(workspacePath);
        
        for (const file of pyFiles) {
            try {
                // Bug 1 Fixed: file is already an absolute path, no need to path.join()
                const content = await fsPromises.readFile(file, 'utf-8');
                
                // Only parse files that might contain Flaxon routes (handles any decorator variable)
                if (/@\w+\.(get|post|put|delete|patch|websocket)/.test(content) || content.includes('flaxon')) {
                    const routes = parseFlaxonApp(content);
                    routes.forEach(route => {
                        route.file = file; 
                        allRoutes.push(route);
                    });
                    logger.debug(`Found ${routes.length} routes in ${file}`);
                }
            } catch (readError) {
                // Bug 16 Fixed: One bad file doesn't stop the whole scan
                logger.error(`Failed to read or parse file ${file}: ${readError}`);
            }
        }
    } catch (error) {
        logger.error(`Failed to parse routes in workspace: ${error}`);
    }

    return allRoutes;
}

/**
 * Find all Python files in a directory recursively (Async and Symlink safe).
 */
async function findPythonFiles(dir: string, visited: Set<string> = new Set()): Promise<string[]> {
    const files: string[] = [];
    
    try {
        // Bug 19 Fixed: Prevent symlink infinite recursion loops
        const realPath = await fsPromises.realpath(dir);
        if (visited.has(realPath)) return [];
        visited.add(realPath);

        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                if (['.venv', 'venv', '__pycache__', '.git', 'node_modules', 'dist', 'build'].includes(entry.name)) {
                    continue;
                }
                const subFiles = await findPythonFiles(fullPath, visited);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.py')) {
                // Skip common file patterns
                if (['__init__.py', 'conftest.py'].includes(entry.name)) {
                    continue;
                }
                files.push(fullPath);
            }
        }
    } catch (error) {
        logger.debug(`Error scanning directory ${dir}: ${error}`);
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
        // Bug 18 Fixed: Group by the full path so identically named files in different folders aren't merged
        const key = route.file; 
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(route);
    }
    return groups;
}

/**
 * Group routes by prefix.
 */
export function groupRoutesByPrefix(routes: Route[], prefixLength: number = 2): { [key: string]: Route[] } {
    const groups: { [key: string]: Route[] } = {};
    
    // Bug 20 Fixed: Validate and clamp prefixLength
    const validPrefixLength = Math.max(1, Math.floor(prefixLength));

    for (const route of routes) {
        const parts = route.path.split('/').filter(p => p);
        const prefix = parts.slice(0, validPrefixLength).join('/');
        const key = prefix ? `/${prefix}` : '/'; // Default to root if empty
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(route);
    }
    return groups;
}