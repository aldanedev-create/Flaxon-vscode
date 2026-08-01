import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

export async function generateSchema(): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flaxon project.');
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;

        const schemaName = await vscode.window.showInputBox({
            prompt: 'Enter schema name (e.g., CreateUser)',
            placeHolder: 'CreateUser',
            validateInput: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'Schema name is required';
                }
                if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Schema name should start with uppercase letter';
                }
                return null;
            }
        });

        if (!schemaName) {
            logger.info('Schema generation cancelled by user');
            return;
        }

        interface Field {
            name: string;
            type: string;
            required: boolean;
            constraints: string[];
        }

        const fields: Field[] = [];
        let addMore = true;

        while (addMore) {
            const fieldName = await vscode.window.showInputBox({
                prompt: `Enter field name (${fields.length + 1})`,
                placeHolder: 'username',
                validateInput: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return 'Field name is required';
                    }
                    if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
                        return 'Field name should start with lowercase';
                    }
                    return null;
                }
            });

            if (!fieldName) {
                if (fields.length === 0) {
                    return;
                }
                break;
            }

            const fieldTypes = ['String', 'Integer', 'Float', 'Boolean', 'Email', 'Choice', 'UUID', 'DateTime'];
            const fieldType = await vscode.window.showQuickPick(fieldTypes, {
                placeHolder: `Select type for "${fieldName}"`,
                title: `Field ${fields.length + 1} type`
            });

            if (!fieldType) {
                continue;
            }

            const required = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Is "${fieldName}" required?`,
                title: `Field ${fields.length + 1} required`
            });

            if (!required) {
                continue;
            }

            const constraints: string[] = [];
            
            if (fieldType === 'String') {
                const minLen = await vscode.window.showInputBox({
                    prompt: `Minimum length for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 2'
                });
                if (minLen && !isNaN(parseInt(minLen))) {
                    constraints.push(`min_length=${minLen}`);
                }

                const maxLen = await vscode.window.showInputBox({
                    prompt: `Maximum length for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 80'
                });
                if (maxLen && !isNaN(parseInt(maxLen))) {
                    constraints.push(`max_length=${maxLen}`);
                }
            }

            if (fieldType === 'Integer' || fieldType === 'Float') {
                const minimum = await vscode.window.showInputBox({
                    prompt: `Minimum value for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 0'
                });
                if (minimum && !isNaN(parseFloat(minimum))) {
                    constraints.push(`minimum=${minimum}`);
                }

                const maximum = await vscode.window.showInputBox({
                    prompt: `Maximum value for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 100'
                });
                if (maximum && !isNaN(parseFloat(maximum))) {
                    constraints.push(`maximum=${maximum}`);
                }
            }

            if (fieldType === 'Choice') {
                const choices = await vscode.window.showInputBox({
                    prompt: `Choices for "${fieldName}" (comma-separated)`,
                    placeHolder: 'active,inactive,pending'
                });
                if (choices) {
                    constraints.push(`choices=[${choices.split(',').map((c: string) => `"${c.trim()}"`).join(', ')}]`);
                }
            }

            fields.push({
                name: fieldName,
                type: fieldType,
                required: required === 'Yes',
                constraints: constraints
            });

            const more = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Add another field?',
                title: `Added ${fields.length} field(s)`
            });

            addMore = more === 'Yes';
        }

        if (fields.length === 0) {
            logger.info('Schema generation cancelled by user');
            return;
        }

        const defaultFileName = `${schemaName}.py`;
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name',
            placeHolder: defaultFileName,
            value: defaultFileName
        });

        if (!fileName) {
            logger.info('Schema generation cancelled by user');
            return;
        }

        const filePath = path.join(workspacePath, fileName);
        if (fs.existsSync(filePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `File "${fileName}" already exists. Overwrite?`,
                'Overwrite',
                'Cancel'
            );
            if (overwrite !== 'Overwrite') {
                return;
            }
        }

        const schemaContent = generateSchemaContent(schemaName, fields);
        fs.writeFileSync(filePath, schemaContent);

        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`Schema generated: ${fileName}`);
        logger.info(`Schema generated: ${fileName} at ${filePath}`);

    } catch (error: any) {
        const message = error?.message || 'Unknown error occurred';
        logger.error(`Failed to generate schema: ${message}`);
        vscode.window.showErrorMessage(`Failed to generate schema: ${message}`);
    }
}

function generateSchemaContent(schemaName: string, fields: { name: string; type: string; required: boolean; constraints: string[] }[]): string {
    const fieldLines: string[] = [];
    for (const field of fields) {
        const required = field.required ? 'required=True' : 'required=False';
        const constraints = field.constraints.join(', ');
        
        let line = `    ${field.name} = fields.${field.type}(${required}`;
        if (constraints) {
            line += `, ${constraints}`;
        }
        line += `)`;
        fieldLines.push(line);
    }

    return `"""${schemaName} validation schema."""

from flaxon.validation import Schema, fields


class ${schemaName}(Schema):
    """${schemaName} validation schema."""
    
${fieldLines.join('\n')}

    def to_dict(self) -> dict:
        """Convert schema to dictionary."""
        return {
${fields.map(f => `            "${f.name}": self.${f.name},`).join('\n')}
        }
`;
}