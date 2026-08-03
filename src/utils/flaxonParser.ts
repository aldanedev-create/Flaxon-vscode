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
    
    // Regex that catches any router variable, multiline spacing, and the matching handler
    // ^[ \t]* forces it to not match mid-string/comment.
    // [\s\S]*? handles multiline decorator arguments until it finds the async def / def
    const routeRegex = /^[ \t]*@(\w+)\.(get|post|put|delete|patch|websocket)\s*\(\s*['"]([^'"]+)['"][^)]*\)[\s\S]*?^[ \t]*(async\s+)?def\s+(\w+)\s*\(/gm;
    
    let match;
    while ((match = routeRegex.exec(text)) !== null) {
        const method = match[2].toUpperCase();
        const path = match[3];
        const handler = match[5];
        
        // Calculate line number safely by counting newlines prior to the match
        const upToMatch = text.substring(0, match.index);
        const line = upToMatch.split('\n').length;
        
        const parameters = extractPathParameters(path);

        routes.push({
            method: method === 'WEBSOCKET' ? 'WS' : method,
            path: path,
            handler: handler,
            line: line,
            file: '', // Filled by the caller
            parameters: parameters
        });
    }

    return routes;
}

/**
 * Extract parameters from a path string.
 */
function extractPathParameters(path: string): string[] {
    const params = new Set<string>(); // Use a Set to prevent duplicates
    const paramRegex = /<([^>]+)>/g;
    
    let match;
    while ((match = paramRegex.exec(path)) !== null) {
        // Handles formats like <id>, <int:id>, or <converter:user:id>
        const parts = match[1].split(':');
        const paramName = parts[parts.length - 1].trim();
        params.add(paramName);
    }
    
    return Array.from(params);
}

/**
 * Parse schemas from a Python file.
 */
export function parseSchemas(text: string): Schema[] {
    const schemas: Schema[] = [];
    const lines = text.split('\n');

    // Capture the base indentation to know when the class ends
    const schemaRegex = /^([ \t]*)class\s+(\w+)\s*\(\s*Schema\s*\)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = schemaRegex.exec(line);
        
        if (match) {
            const baseIndent = match[1];
            const name = match[2];
            const fields: SchemaField[] = [];
            
            // Scan fields, strictly checking indentation
            for (let j = i + 1; j < lines.length; j++) {
                const fieldLine = lines[j];
                
                if (fieldLine.trim() === '') continue; // Skip empty lines inside class
                
                // If indentation drops back to or below the class declaration, we've left the class
                const indentMatch = fieldLine.match(/^([ \t]*)/);
                const currentIndent = indentMatch ? indentMatch[1] : '';
                if (currentIndent.length <= baseIndent.length) {
                    break;
                }

                const trimmed = fieldLine.trim();
                if (trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;

                const fieldMatch = /(\w+)\s*=\s*fields\.(\w+)\s*\(/.exec(trimmed);
                if (fieldMatch) {
                    const fieldName = fieldMatch[1];
                    const fieldType = fieldMatch[2];
                    const required = trimmed.includes('required=True');
                    const constraints: string[] = [];
                    
                    // Regex updated to handle integers, floats, negatives, and lists
                    const minMatch = trimmed.match(/min_length\s*=\s*(\d+)/);
                    if (minMatch) constraints.push(`min_length=${minMatch[1]}`);
                    
                    const maxMatch = trimmed.match(/max_length\s*=\s*(\d+)/);
                    if (maxMatch) constraints.push(`max_length=${maxMatch[1]}`);
                    
                    const minValMatch = trimmed.match(/minimum\s*=\s*(-?\d+(?:\.\d+)?)/);
                    if (minValMatch) constraints.push(`minimum=${minValMatch[1]}`);
                    
                    const maxValMatch = trimmed.match(/maximum\s*=\s*(-?\d+(?:\.\d+)?)/);
                    if (maxValMatch) constraints.push(`maximum=${maxValMatch[1]}`);
                    
                    const choicesMatch = trimmed.match(/choices\s*=\s*(\[[^\]]+\])/);
                    if (choicesMatch) constraints.push(`choices=${choicesMatch[1]}`);

                    fields.push({
                        name: fieldName,
                        type: fieldType,
                        required: required,
                        constraints: constraints
                    });
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

    const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)/;

    for (const line of lines) {
        const trimmed = line.trim();
        // Ignore commented out imports
        if (trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
            const match = importRegex.exec(trimmed);
            if (match) {
                imports.push(trimmed);
            }
        }
    }

    return imports;
}