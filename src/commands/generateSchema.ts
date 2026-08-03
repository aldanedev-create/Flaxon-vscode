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
                    if (fields.some(field => field.name === value)) {
                        return 'A field with this name already exists';
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
                if (minLen && /^\d+$/.test(minLen.trim())) {
                    constraints.push(`min_length=${Number(minLen)}`);
                }

                const maxLen = await vscode.window.showInputBox({
                    prompt: `Maximum length for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 80'
                });
                if (maxLen && /^\d+$/.test(maxLen.trim())) {
                    constraints.push(`max_length=${Number(maxLen)}`);
                }
            }

            if (fieldType === 'Integer' || fieldType === 'Float') {
                const minimum = await vscode.window.showInputBox({
                    prompt: `Minimum value for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 0'
                });
                if (minimum && isStrictNumber(minimum)) {
                    constraints.push(`minimum=${Number(minimum)}`);
                }

                const maximum = await vscode.window.showInputBox({
                    prompt: `Maximum value for "${fieldName}" (optional)`,
                    placeHolder: 'e.g., 100'
                });
                if (maximum && isStrictNumber(maximum)) {
                    constraints.push(`maximum=${Number(maximum)}`);
                }
            }

            if (fieldType === 'Choice') {
                const choices = await vscode.window.showInputBox({
                    prompt: `Choices for "${fieldName}" (comma-separated)`,
                    placeHolder: 'active,inactive,pending'
                });
                if (choices) {
                    const choiceValues = choices
                        .split(',')
                        .map((choice: string) => choice.trim())
                        .filter(Boolean);
                    if (choiceValues.length > 0) {
                        constraints.push(
                            `choices=[${choiceValues.map(toPythonString).join(', ')}]`
                        );
                    }
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
            value: defaultFileName,
            validateInput: (value: string) => {
                if (!value || !/^[a-zA-Z0-9_-]+\.py$/.test(value)) {
                    return 'Use a Python filename such as CreateUser.py';
                }
                return null;
            }
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
        fs.writeFileSync(filePath, schemaContent, 'utf8');

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

function isStrictNumber(value: string): boolean {
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim());
}

function toPythonString(value: string): string {
    return JSON.stringify(value);
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