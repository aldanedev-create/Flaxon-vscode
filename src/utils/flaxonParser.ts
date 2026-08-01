import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

/**
 * Parse Flaxon application structure from Python files.
 */
export interface FlaxonApp {
    routes: Route[];
    schemas: Schema[];
    imports: string[];
    appVariable: string;
    plugins: string[];
}

/**
 * Route data from parser.
 */
export interface Route {
    method: string;
    path: string;
    handler: string;
    line: number;
    file: string;
    name?: string;
    parameters?: string[];
    references?: number;
}

/**
 * Schema data from parser.
 */
export interface Schema {
    name: string;
    fields: SchemaField[];
    line: number;
    file: string;
}

/**
 * Schema field data.
 */
export interface SchemaField {
    name: string;
    type: string;
    required: boolean;
    constraints: string[];
}

/**
 * Parse a Flaxon application from the workspace.
 */
export function parseFlaxonApp(text: string): Route[] {
    const routes: Route[] = [];
    const lines = text.split('\n');

    // Regex patterns
    const routePatterns = [
        { method: 'GET', pattern: /@app\.get\s*\(\s*['"]([^'"]+)['"]/g },
        { method: 'POST', pattern: /@app\.post\s*\(\s*['"]([^'"]+)['"]/g },
        { method: 'PUT', pattern: /@app\.put\s*\(\s*['"]([^'"]+)['"]/g },
        { method: 'DELETE', pattern: /@app\.delete\s*\(\s*['"]([^'"]+)['"]/g },
        { method: 'PATCH', pattern: /@app\.patch\s*\(\s*['"]([^'"]+)['"]/g },
        { method: 'WS', pattern: /@app\.websocket\s*\(\s*['"]([^'"]+)['"]/g }
    ];

    const handlerPattern = /(async\s+)?def\s+(\w+)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const route of routePatterns) {
            // Reset regex
            route.pattern.lastIndex = 0;
            let match = route.pattern.exec(line);
            
            while (match) {
                const path = match[1];
                
                // Find handler (look ahead or behind)
                let handler = 'unknown';
                let handlerLine = i;
                
                // Check if handler is on same line
                const handlerMatch = handlerPattern.exec(line);
                if (handlerMatch) {
                    handler = handlerMatch[2];
                } else {
                    // Look at next lines for handler
                    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                        const handlerMatch2 = handlerPattern.exec(lines[j]);
                        if (handlerMatch2) {
                            handler = handlerMatch2[2];
                            handlerLine = j;
                            break;
                        }
                    }
                }

                // Extract parameters from path
                const parameters = extractPathParameters(path);

                // Extract route name
                const nameMatch = line.match(/name\s*=\s*['"]([^'"]+)['"]/);
                const name = nameMatch ? nameMatch[1] : undefined;

                routes.push({
                    method: route.method,
                    path: path,
                    handler: handler,
                    line: handlerLine + 1,
                    file: '',
                    name: name,
                    parameters: parameters
                });

                match = route.pattern.exec(line);
            }
        }
    }

    return routes;
}

/**
 * Extract parameters from a path string.
 */
function extractPathParameters(path: string): string[] {
    const params: string[] = [];
    const paramRegex = /<([^>]+)>/g;
    let match = paramRegex.exec(path);
    while (match) {
        const param = match[1].split(':')[1] || match[1];
        params.push(param);
        match = paramRegex.exec(path);
    }
    return params;
}

/**
 * Parse schemas from a Python file.
 */
export function parseSchemas(text: string): Schema[] {
    const schemas: Schema[] = [];
    const lines = text.split('\n');

    const schemaRegex = /class\s+(\w+)\s*\(\s*Schema\s*\)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = schemaRegex.exec(line);
        
        if (match) {
            const name = match[1];
            const fields: SchemaField[] = [];
            
            // Find fields (look ahead)
            for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
                const fieldLine = lines[j].trim();
                if (fieldLine && fieldLine !== '"""' && !fieldLine.startsWith('#')) {
                    const fieldMatch = /(\w+)\s*=\s*fields\.(\w+)\s*\(/.exec(fieldLine);
                    if (fieldMatch) {
                        const fieldName = fieldMatch[1];
                        const fieldType = fieldMatch[2];
                        const required = fieldLine.includes('required=True');
                        const constraints: string[] = [];
                        
                        // Extract constraints
                        const minMatch = fieldLine.match(/min_length\s*=\s*(\d+)/);
                        if (minMatch) constraints.push(`min_length=${minMatch[1]}`);
                        
                        const maxMatch = fieldLine.match(/max_length\s*=\s*(\d+)/);
                        if (maxMatch) constraints.push(`max_length=${maxMatch[1]}`);
                        
                        const minValMatch = fieldLine.match(/minimum\s*=\s*(\d+)/);
                        if (minValMatch) constraints.push(`minimum=${minValMatch[1]}`);
                        
                        const maxValMatch = fieldLine.match(/maximum\s*=\s*(\d+)/);
                        if (maxValMatch) constraints.push(`maximum=${maxValMatch[1]}`);
                        
                        fields.push({
                            name: fieldName,
                            type: fieldType,
                            required: required,
                            constraints: constraints
                        });
                    }
                }
            }

            schemas.push({
                name: name,
                fields: fields,
                line: i + 1,
                file: ''
            });
        }
    }

    return schemas;
}

/**
 * Parse imports from a Python file.
 */
export function parseImports(text: string): string[] {
    const imports: string[] = [];
    const lines = text.split('\n');

    const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(\S+)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
            const match = importRegex.exec(trimmed);
            if (match) {
                imports.push(trimmed);
            }
        }
    }

    return imports;
}