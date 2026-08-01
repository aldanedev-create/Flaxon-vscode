#!/usr/bin/env python3
"""Flaxon Language Server Protocol (LSP) server.

This is a dependency-free LSP server for Flaxon Python applications.  It
provides:

* diagnostics (linting)
* code completions
* hover documentation
* basic go-to-definition support
* basic find-references support

The server communicates with an LSP client over stdin/stdout using the JSON-RPC
framing required by the Language Server Protocol.
"""

from __future__ import annotations

import ast
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import quote, unquote, urlparse


@dataclass
class Position:
    line: int
    character: int


@dataclass
class Range:
    start: Position
    end: Position


@dataclass
class Location:
    uri: str
    range: Range


@dataclass
class Diagnostic:
    range: Range
    message: str
    severity: int = 1
    code: Optional[str] = None
    source: str = "flaxon"


@dataclass
class CompletionItem:
    label: str
    kind: int
    detail: Optional[str] = None
    documentation: Optional[str] = None
    insert_text: Optional[str] = None


@dataclass
class Hover:
    contents: str
    range: Optional[Range] = None


class FlaxonLanguageServer:
    """Flaxon LSP server implementation."""

    EXCLUDED_DIRECTORIES = {
        ".git",
        ".venv",
        "__pycache__",
        "node_modules",
        "venv",
    }

    def __init__(
        self,
        input_stream: Optional[Any] = None,
        output_stream: Optional[Any] = None,
    ) -> None:
        self.input_stream = input_stream or sys.stdin
        self.output_stream = output_stream or sys.stdout
        self.root_path: Optional[str] = None
        self.documents: Dict[str, str] = {}
        self.diagnostics: Dict[str, List[Diagnostic]] = {}
        self._workspace_files: List[str] = []

    def run(self) -> None:
        """Read and handle LSP messages until the client closes the pipe."""
        print("Flaxon Language Server started", file=sys.stderr, flush=True)

        while True:
            try:
                body = self._read_message()
                if body is None:
                    return

                message = json.loads(body.decode("utf-8"))
                if not isinstance(message, dict):
                    print(
                        "Ignoring non-object JSON-RPC message",
                        file=sys.stderr,
                        flush=True,
                    )
                    continue

                self._handle_message(message)
            except json.JSONDecodeError as error:
                print(f"JSON decode error: {error}", file=sys.stderr, flush=True)
            except (OSError, UnicodeDecodeError, ValueError) as error:
                print(f"Error reading LSP message: {error}", file=sys.stderr, flush=True)
            except Exception as error:
                # Keep the server alive after a bad request.  LSP clients often
                # send optional messages that an implementation does not use.
                print(
                    f"Error handling LSP message: {error}",
                    file=sys.stderr,
                    flush=True,
                )

    def _read_message(self) -> Optional[bytes]:
        """Read one Content-Length-framed JSON-RPC message.

        Content-Length is defined in bytes, not Python characters.  Reading
        from the binary stream avoids corrupting messages containing Unicode.
        """
        stream = getattr(self.input_stream, "buffer", self.input_stream)
        content_length: Optional[int] = None

        while True:
            raw_line = stream.readline()
            if raw_line in (b"", ""):
                return None

            if isinstance(raw_line, str):
                line = raw_line.encode("ascii", errors="strict")
            else:
                line = raw_line

            if line in (b"\r\n", b"\n"):
                break

            name, separator, value = line.decode("ascii").partition(":")
            if separator and name.lower() == "content-length":
                content_length = int(value.strip())

        if content_length is None:
            raise ValueError("missing Content-Length header")
        if content_length < 0:
            raise ValueError("Content-Length cannot be negative")

        chunks: List[bytes] = []
        remaining = content_length
        while remaining:
            chunk = stream.read(remaining)
            if chunk in (b"", ""):
                raise EOFError("unexpected end of LSP message")
            if isinstance(chunk, str):
                chunk = chunk.encode("utf-8")
            chunks.append(chunk)
            remaining -= len(chunk)

        return b"".join(chunks)

    def _handle_message(self, message: Dict[str, Any]) -> None:
        """Dispatch an LSP request or notification."""
        method = message.get("method")
        params = message.get("params") or {}
        message_id = message.get("id")

        if method == "initialize":
            self._handle_initialize(params)
            self._send_response(
                message_id,
                {
                    "capabilities": self._get_capabilities(),
                    "serverInfo": {
                        "name": "flaxon-lsp",
                        "version": "1.0.0",
                    },
                },
            )
        elif method == "initialized":
            return
        elif method == "textDocument/didOpen":
            self._handle_did_open(params)
        elif method == "textDocument/didChange":
            self._handle_did_change(params)
        elif method == "textDocument/didClose":
            self._handle_did_close(params)
        elif method == "textDocument/didSave":
            self._handle_did_save(params)
        elif method == "textDocument/completion":
            self._handle_completion(message_id, params)
        elif method == "textDocument/hover":
            self._handle_hover(message_id, params)
        elif method == "textDocument/definition":
            self._handle_definition(message_id, params)
        elif method == "textDocument/references":
            self._handle_references(message_id, params)
        elif method == "shutdown":
            self._send_response(message_id, None)
        elif method == "exit":
            raise SystemExit(0)
        elif message_id is not None:
            self._send_error(message_id, -32601, f"Method not found: {method}")

    def _handle_initialize(self, params: Dict[str, Any]) -> None:
        """Store the workspace path and scan its Python files."""
        root = params.get("rootPath") or params.get("rootUri")
        if isinstance(root, str):
            self.root_path = self._uri_to_path(root) if root.startswith("file://") else root

        if self.root_path:
            self._scan_workspace()

    def _scan_workspace(self) -> None:
        """Scan the workspace for Python files once per initialization."""
        if not self.root_path:
            return

        self._workspace_files.clear()
        for root, directories, files in os.walk(self.root_path):
            directories[:] = [
                directory
                for directory in directories
                if directory not in self.EXCLUDED_DIRECTORIES
            ]
            for filename in files:
                if filename.endswith(".py"):
                    self._workspace_files.append(os.path.join(root, filename))

    def _get_capabilities(self) -> Dict[str, Any]:
        """Return capabilities supported by this server.

        TextDocumentSyncKind.Full is 1.  The original code advertised 2
        (incremental updates) but then replaced the whole document with the
        last change, which could silently lose text.
        """
        return {
            "textDocumentSync": {
                "openClose": True,
                "change": 1,
                "save": {"includeText": True},
            },
            "completionProvider": {
                "triggerCharacters": ["."],
            },
            "hoverProvider": True,
            "definitionProvider": True,
            "referencesProvider": True,
        }

    def _handle_did_open(self, params: Dict[str, Any]) -> None:
        text_document = params.get("textDocument", {})
        uri = text_document.get("uri")
        text = text_document.get("text", "")

        if isinstance(uri, str):
            self.documents[uri] = str(text)
            self._publish_diagnostics(uri, self.documents[uri])

    def _handle_did_change(self, params: Dict[str, Any]) -> None:
        text_document = params.get("textDocument", {})
        uri = text_document.get("uri")
        content_changes = params.get("contentChanges", [])

        if not isinstance(uri, str) or not content_changes:
            return

        # Full synchronization is advertised above, so the last change
        # contains the complete document.
        latest_change = content_changes[-1]
        text = latest_change.get("text")
        if isinstance(text, str):
            self.documents[uri] = text
            self._publish_diagnostics(uri, text)

    def _handle_did_close(self, params: Dict[str, Any]) -> None:
        text_document = params.get("textDocument", {})
        uri = text_document.get("uri")

        if isinstance(uri, str):
            self.documents.pop(uri, None)
            self.diagnostics.pop(uri, None)
            self._send_notification(
                "textDocument/publishDiagnostics",
                {"uri": uri, "diagnostics": []},
            )

    def _handle_did_save(self, params: Dict[str, Any]) -> None:
        text_document = params.get("textDocument", {})
        uri = text_document.get("uri")
        if not isinstance(uri, str):
            return

        text = text_document.get("text")
        if not isinstance(text, str):
            text = self.documents.get(uri)
        if text is not None:
            self.documents[uri] = text
            self._publish_diagnostics(uri, text)

    def _publish_diagnostics(self, uri: str, text: str) -> None:
        diagnostics = self._analyze_document(uri, text)
        self.diagnostics[uri] = diagnostics
        self._send_notification(
            "textDocument/publishDiagnostics",
            {
                "uri": uri,
                "diagnostics": [self._diagnostic_to_dict(item) for item in diagnostics],
            },
        )

    def _analyze_document(self, uri: str, text: str) -> List[Diagnostic]:
        """Analyze Python syntax and common Flaxon mistakes."""
        diagnostics: List[Diagnostic] = []

        try:
            tree = ast.parse(text, filename=self._uri_to_path(uri))
        except SyntaxError as error:
            line = max((error.lineno or 1) - 1, 0)
            character = max((error.offset or 1) - 1, 0)
            diagnostics.append(
                Diagnostic(
                    range=Range(
                        start=Position(line, character),
                        end=Position(line, character + 1),
                    ),
                    message=error.msg,
                    severity=1,
                    code="PYTHON-SYNTAX",
                    source="python",
                )
            )
            return diagnostics

        imported_flaxon = self._imports_name(tree, "Flaxon", "flaxon")
        uses_flaxon = any(
            isinstance(node, ast.Call)
            and (
                (isinstance(node.func, ast.Name) and node.func.id == "Flaxon")
                or (
                    isinstance(node.func, ast.Attribute)
                    and node.func.attr == "Flaxon"
                )
            )
            for node in ast.walk(tree)
        )
        has_route = any(self._route_decorator(node) for node in ast.walk(tree))

        if (uses_flaxon or has_route) and not imported_flaxon:
            diagnostics.append(
                Diagnostic(
                    range=self._zero_range(),
                    message="Missing import: 'from flaxon import Flaxon'",
                    severity=2,
                    code="FLAXON-001",
                )
            )

        has_flaxon_instance = any(
            isinstance(node, ast.Assign)
            and any(isinstance(target, ast.Name) and target.id == "app" for target in node.targets)
            and isinstance(node.value, ast.Call)
            and (
                (isinstance(node.value.func, ast.Name) and node.value.func.id == "Flaxon")
                or (
                    isinstance(node.value.func, ast.Attribute)
                    and node.value.func.attr == "Flaxon"
                )
            )
            for node in ast.walk(tree)
        )
        if uses_flaxon and not has_flaxon_instance:
            diagnostics.append(
                Diagnostic(
                    range=self._zero_range(),
                    message="Missing app instantiation: 'app = Flaxon()'",
                    severity=3,
                    code="FLAXON-002",
                )
            )

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue

            route_names = [
                route_name
                for decorator in node.decorator_list
                if (route_name := self._route_decorator(decorator)) is not None
            ]
            if not route_names:
                continue

            if not isinstance(node, ast.AsyncFunctionDef):
                diagnostics.append(
                    Diagnostic(
                        range=self._node_range(node),
                        message="Route handler should be async",
                        severity=2,
                        code="FLAXON-003",
                    )
                )

            has_response = any(
                isinstance(child, (ast.Return, ast.Yield, ast.Raise))
                for child in ast.walk(node)
                if child is not node
            )
            if not has_response:
                diagnostics.append(
                    Diagnostic(
                        range=self._node_range(node),
                        message="Route handler should return a response",
                        severity=2,
                        code="FLAXON-004",
                    )
                )

        return diagnostics

    @staticmethod
    def _imports_name(tree: ast.AST, name: str, module: str) -> bool:
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == module:
                if any(alias.name == name for alias in node.names):
                    return True
            elif isinstance(node, ast.Import):
                if any(alias.name == module for alias in node.names):
                    return True
        return False

    @staticmethod
    def _route_decorator(node: ast.AST) -> Optional[str]:
        """Return the route method for decorators such as @app.get(...)."""
        candidate: ast.AST = node
        if isinstance(candidate, ast.Call):
            candidate = candidate.func
        if (
            isinstance(candidate, ast.Attribute)
            and isinstance(candidate.value, ast.Name)
            and candidate.value.id == "app"
        ):
            route_names = {"get", "post", "put", "delete", "patch", "websocket"}
            if candidate.attr in route_names:
                return candidate.attr
        return None

    def _handle_completion_sync(
        self, params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        uri = params.get("textDocument", {}).get("uri")
        position = params.get("position", {})
        line_number = max(int(position.get("line", 0)), 0)
        character = max(int(position.get("character", 0)), 0)
        text = self.documents.get(uri, "") if isinstance(uri, str) else ""
        lines = text.splitlines()

        if line_number >= len(lines):
            return []
        current_line = lines[line_number][:character]
        return [
            self._completion_to_dict(item)
            for item in self._get_completions(current_line, text)
        ]

    def _handle_completion(
        self, message_id: Any, params: Dict[str, Any]
    ) -> None:
        self._send_response(message_id, self._handle_completion_sync(params))

    def _get_completions(
        self, current_line: str, full_text: str
    ) -> List[CompletionItem]:
        del full_text  # Reserved for future context-sensitive completions.
        completions: List[CompletionItem] = []

        if "@app." in current_line:
            completions.extend(
                [
                    CompletionItem("get", 3, '@app.get("/path")', "GET route decorator"),
                    CompletionItem("post", 3, '@app.post("/path")', "POST route decorator"),
                    CompletionItem("put", 3, '@app.put("/path")', "PUT route decorator"),
                    CompletionItem("delete", 3, '@app.delete("/path")', "DELETE route decorator"),
                    CompletionItem("patch", 3, '@app.patch("/path")', "PATCH route decorator"),
                    CompletionItem(
                        "websocket",
                        3,
                        '@app.websocket("/ws/path")',
                        "WebSocket route decorator",
                    ),
                ]
            )

        if "fields." in current_line:
            completions.extend(
                [
                    CompletionItem(
                        "String", 9, "fields.String(required=True)", "String field for validation"
                    ),
                    CompletionItem(
                        "Integer", 9, "fields.Integer(required=True)", "Integer field for validation"
                    ),
                    CompletionItem(
                        "Float", 9, "fields.Float(required=True)", "Float field for validation"
                    ),
                    CompletionItem(
                        "Boolean",
                        9,
                        "fields.Boolean(required=False)",
                        "Boolean field for validation",
                    ),
                    CompletionItem(
                        "Email", 9, "fields.Email(required=True)", "Email field with validation"
                    ),
                    CompletionItem(
                        "Choice",
                        9,
                        "fields.Choice(choices=[...])",
                        "Choice field for validation",
                    ),
                ]
            )

        if "HTTPException(" in current_line:
            status_codes = {
                "400": "Bad Request",
                "401": "Unauthorized",
                "403": "Forbidden",
                "404": "Not Found",
                "422": "Validation Error",
                "500": "Internal Server Error",
            }
            completions.extend(
                CompletionItem(
                    code,
                    21,
                    f'HTTPException({code}, "{description}")',
                    description,
                )
                for code, description in status_codes.items()
            )

        return completions

    def _handle_hover(self, message_id: Any, params: Dict[str, Any]) -> None:
        uri = params.get("textDocument", {}).get("uri")
        position = params.get("position", {})
        line_number = max(int(position.get("line", 0)), 0)
        character = max(int(position.get("character", 0)), 0)
        text = self.documents.get(uri, "") if isinstance(uri, str) else ""
        lines = text.splitlines()

        if line_number < len(lines):
            current_line = lines[line_number]
            hover_text = self._get_hover_info(current_line, character)
            if hover_text:
                start = current_line.find("@app.")
                if start < 0:
                    start = current_line.find("fields.")
                if start < 0:
                    start = current_line.find("HTTPException")
                end = start + max(len("HTTPException"), 1)
                result: Dict[str, Any] = {
                    "contents": {"kind": "markdown", "value": hover_text},
                }
                if start >= 0:
                    result["range"] = {
                        "start": {"line": line_number, "character": start},
                        "end": {"line": line_number, "character": end},
                    }
                self._send_response(message_id, result)
                return

        self._send_response(message_id, None)

    @staticmethod
    def _get_hover_info(line: str, character: int) -> Optional[str]:
        del character
        if "@app." in line:
            return """**Flaxon Route Decorator**

```python
@app.get("/path")
async def handler(request):
    return {"message": "Hello"}
```

**Parameters:**
- `path`: Route path
- `name`: Optional route name"""

        if "fields." in line:
            return """**Flaxon Schema Field**

```python
field = fields.String(required=True, min_length=2)
```

**Available fields:**
- `String` - String with optional min/max length
- `Integer` - Integer with optional min/max value
- `Email` - Email validation
- `Boolean` - Boolean value
- `Choice` - Choice from a list of options"""

        if "HTTPException" in line:
            return """**Flaxon HTTPException**

```python
from flaxon.exceptions import HTTPException

raise HTTPException(404, "Not found")
```

**Common status codes:**
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error"""

        return None

    def _handle_definition(
        self, message_id: Any, params: Dict[str, Any]
    ) -> None:
        uri = params.get("textDocument", {}).get("uri")
        word = self._word_at_position(params)
        locations = []

        if isinstance(uri, str) and word:
            for document_uri, text in self._iter_documents(uri):
                locations.extend(
                    self._find_definitions(document_uri, text, word)
                )

        self._send_response(message_id, locations)

    def _handle_references(
        self, message_id: Any, params: Dict[str, Any]
    ) -> None:
        uri = params.get("textDocument", {}).get("uri")
        word = self._word_at_position(params)
        include_declaration = params.get("context", {}).get(
            "includeDeclaration", True
        )
        locations = []

        if isinstance(uri, str) and word:
            for document_uri, text in self._iter_documents(uri):
                locations.extend(
                    self._find_references(
                        document_uri, text, word, bool(include_declaration)
                    )
                )

        self._send_response(message_id, locations)

    def _iter_documents(self, current_uri: str) -> Iterable[Tuple[str, str]]:
        seen: Set[str] = set()
        for uri, text in self.documents.items():
            seen.add(uri)
            yield uri, text

        for filename in self._workspace_files:
            uri = self._path_to_uri(filename)
            if uri in seen:
                continue
            try:
                yield uri, Path(filename).read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue

        if current_uri not in seen and current_uri not in {
            uri for uri, _ in self._iter_open_documents_only()
        }:
            text = self._read_uri(current_uri)
            if text is not None:
                yield current_uri, text

    def _iter_open_documents_only(self) -> Iterable[Tuple[str, str]]:
        yield from self.documents.items()

    def _find_definitions(
        self, uri: str, text: str, word: str
    ) -> List[Dict[str, Any]]:
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return []

        locations: List[Dict[str, Any]] = []
        definition_nodes = (
            ast.FunctionDef,
            ast.AsyncFunctionDef,
            ast.ClassDef,
        )
        for node in ast.walk(tree):
            name: Optional[str] = None
            if isinstance(node, definition_nodes):
                name = node.name
            elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                name = node.id

            if name == word:
                locations.append(self._location_to_dict(Location(uri, self._node_range(node))))
        return locations

    def _find_references(
        self, uri: str, text: str, word: str, include_declaration: bool
    ) -> List[Dict[str, Any]]:
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return []

        locations: List[Dict[str, Any]] = []
        declaration_nodes = (
            ast.FunctionDef,
            ast.AsyncFunctionDef,
            ast.ClassDef,
        )
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and node.id == word:
                if not include_declaration and isinstance(node.ctx, ast.Store):
                    continue
                locations.append(self._location_to_dict(Location(uri, self._node_range(node))))
            elif include_declaration and isinstance(node, declaration_nodes) and node.name == word:
                locations.append(self._location_to_dict(Location(uri, self._node_range(node))))
        return locations

    def _word_at_position(self, params: Dict[str, Any]) -> str:
        text_document = params.get("textDocument", {})
        uri = text_document.get("uri")
        position = params.get("position", {})
        line_number = int(position.get("line", 0))
        character = int(position.get("character", 0))
        text = self.documents.get(uri, "") if isinstance(uri, str) else ""
        lines = text.splitlines()
        if line_number < 0 or line_number >= len(lines):
            return ""

        line = lines[line_number]
        character = min(max(character, 0), len(line))
        start = character
        end = character
        while start > 0 and (line[start - 1].isalnum() or line[start - 1] == "_"):
            start -= 1
        while end < len(line) and (line[end].isalnum() or line[end] == "_"):
            end += 1
        return line[start:end]

    def _read_uri(self, uri: str) -> Optional[str]:
        path = self._uri_to_path(uri)
        try:
            return Path(path).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return None

    @staticmethod
    def _node_range(node: ast.AST) -> Range:
        start_line = max(getattr(node, "lineno", 1) - 1, 0)
        start_character = max(getattr(node, "col_offset", 0), 0)
        end_line = max(getattr(node, "end_lineno", start_line + 1) - 1, start_line)
        end_character = max(
            getattr(node, "end_col_offset", start_character + 1),
            start_character + 1,
        )
        return Range(
            Position(start_line, start_character),
            Position(end_line, end_character),
        )

    @staticmethod
    def _zero_range() -> Range:
        return Range(Position(0, 0), Position(0, 0))

    @staticmethod
    def _uri_to_path(uri: str) -> str:
        if not uri.startswith("file://"):
            return uri

        parsed = urlparse(uri)
        path = unquote(parsed.path)
        if parsed.netloc and parsed.netloc not in ("", "localhost"):
            path = f"//{parsed.netloc}{path}"
        # file:///C:/... is the common Windows file URI form.
        if os.name == "nt" and path.startswith("/") and len(path) > 2 and path[2] == ":":
            path = path[1:]
        return path

    @staticmethod
    def _path_to_uri(path: str) -> str:
        return "file://" + quote(os.path.abspath(path), safe="/:")

    def _send_response(self, message_id: Any, result: Any) -> None:
        self._send_message({"jsonrpc": "2.0", "id": message_id, "result": result})

    def _send_error(self, message_id: Any, code: int, message: str) -> None:
        self._send_message(
            {
                "jsonrpc": "2.0",
                "id": message_id,
                "error": {"code": code, "message": message},
            }
        )

    def _send_notification(self, method: str, params: Any) -> None:
        self._send_message(
            {"jsonrpc": "2.0", "method": method, "params": params}
        )

    def _send_message(self, message: Dict[str, Any]) -> None:
        """Write one UTF-8 JSON-RPC message with a byte-accurate length."""
        body = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
        stream = getattr(self.output_stream, "buffer", self.output_stream)
        payload = header + body

        try:
            stream.write(payload)
        except TypeError:
            # Helpful for tests or callers that provide io.StringIO instead of
            # the binary stream used by a real editor process.
            stream.write(payload.decode("utf-8"))
        stream.flush()

    @staticmethod
    def _diagnostic_to_dict(diagnostic: Diagnostic) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "range": FlaxonLanguageServer._range_to_dict(diagnostic.range),
            "message": diagnostic.message,
            "severity": diagnostic.severity,
            "source": diagnostic.source,
        }
        if diagnostic.code is not None:
            result["code"] = diagnostic.code
        return result

    @staticmethod
    def _completion_to_dict(completion: CompletionItem) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "label": completion.label,
            "kind": completion.kind,
        }
        if completion.detail:
            result["detail"] = completion.detail
        if completion.documentation:
            result["documentation"] = {
                "kind": "markdown",
                "value": completion.documentation,
            }
        if completion.insert_text:
            result["insertText"] = completion.insert_text
        return result

    @staticmethod
    def _range_to_dict(value: Range) -> Dict[str, Any]:
        return {
            "start": {
                "line": value.start.line,
                "character": value.start.character,
            },
            "end": {
                "line": value.end.line,
                "character": value.end.character,
            },
        }

    @staticmethod
    def _location_to_dict(location: Location) -> Dict[str, Any]:
        return {
            "uri": location.uri,
            "range": FlaxonLanguageServer._range_to_dict(location.range),
        }


def main() -> None:
    """Start the language server."""
    server = FlaxonLanguageServer()
    try:
        server.run()
    except KeyboardInterrupt:
        return


if __name__ == "__main__":
    main()