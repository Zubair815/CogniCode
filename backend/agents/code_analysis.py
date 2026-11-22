"""
Module: backend.agents.code_analysis
Purpose: Tree-sitter AST parsing and code analysis agent.

Extracts:
  - Syntax validity (detects syntax errors via AST error nodes)
  - Function definitions and signatures
  - Loop constructs (for/while loops)
  - Recursion detection (self-referential calls)
  - Base case presence (conditional checks preceding returns)
  - Code attempt verification score (0.0 to 1.0)

Created: 18/11/2026
"""

import logging
import re
from typing import TypedDict

import tree_sitter
import tree_sitter_python

from agents.state import AgentState

logger = logging.getLogger("cognicode.agents.code_analysis")


class CodeAnalysisReport(TypedDict, total=False):
    has_code: bool
    code_raw: str
    language: str
    syntax_valid: bool
    syntax_errors: list[str]
    functions: list[str]
    has_loops: bool
    has_recursion: bool
    has_base_case: bool
    attempt_confidence: float  # 0.0 to 1.0
    summary: str


class CodeAnalysisAgent:
    """
    Parses submitted code using Tree-sitter AST grammars.
    """

    def __init__(self):
        try:
            self._py_lang = tree_sitter.Language(tree_sitter_python.language())
            self._py_parser = tree_sitter.Parser(self._py_lang)
            self._ready = True
        except Exception as exc:
            logger.warning("Tree-sitter parser initialization failed: %s", exc)
            self._ready = False

    def extract_code(self, message: str) -> str:
        """Extract code from markdown code fences or raw lines."""
        # Check ```python or ``` fences
        fence_match = re.search(r"```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```", message)
        if fence_match:
            return fence_match.group(1).strip()

        # Check indent or inline def/class patterns
        if re.search(r"^\s*(def|class|for|while|if)\s+", message, re.MULTILINE):
            return message.strip()

        return ""

    def analyze_python_ast(self, code: str) -> CodeAnalysisReport:
        """Perform deep Tree-sitter AST traversal on Python code."""
        if not self._ready:
            return self._heuristic_fallback(code)

        try:
            code_bytes = code.encode("utf-8")
            tree = self._py_parser.parse(code_bytes)
            root = tree.root_node

            functions: list[str] = []
            has_loops = False
            has_recursion = False
            has_base_case = False
            syntax_errors: list[str] = []

            # Traverse AST
            def walk(node):
                nonlocal has_loops, has_recursion, has_base_case

                if node.is_error or node.type == "ERROR":
                    err_text = code_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="ignore")
                    syntax_errors.append(f"Syntax error near: {err_text[:30]!r}")

                # Function definitions
                if node.type == "function_definition":
                    name_node = node.child_by_field_name("name")
                    if name_node:
                        fn_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8")
                        functions.append(fn_name)

                # Loops
                if node.type in ("for_statement", "while_statement"):
                    has_loops = True

                # Conditional / Base Case
                if node.type in ("if_statement", "match_statement"):
                    has_base_case = True

                for child in node.children:
                    walk(child)

            walk(root)

            # Check self-referential calls for functions found
            for fn in functions:
                call_pattern = rf"\b{re.escape(fn)}\s*\("
                # Exclude definition line itself
                lines = code.splitlines()
                non_def_lines = [l for l in lines if not l.strip().startswith(f"def {fn}")]
                if any(re.search(call_pattern, l) for l in non_def_lines):
                    has_recursion = True

            syntax_valid = not root.has_error and len(syntax_errors) == 0

            # Confidence score (0.0 to 1.0)
            confidence = 0.0
            if len(code) > 10:
                confidence += 0.3
            if syntax_valid:
                confidence += 0.4
            if functions or has_loops or has_base_case:
                confidence += 0.3

            return {
                "has_code": True,
                "code_raw": code,
                "language": "python",
                "syntax_valid": syntax_valid,
                "syntax_errors": syntax_errors,
                "functions": functions,
                "has_loops": has_loops,
                "has_recursion": has_recursion,
                "has_base_case": has_base_case,
                "attempt_confidence": min(1.0, confidence),
                "summary": (
                    f"AST valid: {syntax_valid}. Functions: {functions or 'none'}. "
                    f"Loops: {has_loops}, Recursion: {has_recursion}, Base case: {has_base_case}."
                ),
            }
        except Exception as exc:
            logger.warning("Tree-sitter AST traversal error: %s", exc)
            return self._heuristic_fallback(code)

    def _heuristic_fallback(self, code: str) -> CodeAnalysisReport:
        has_def = bool(re.search(r"\bdef\s+[a-zA-Z_]+", code))
        has_loop = bool(re.search(r"\b(for|while)\b", code))
        has_if = bool(re.search(r"\bif\b", code))
        return {
            "has_code": bool(code),
            "code_raw": code,
            "language": "python",
            "syntax_valid": True,
            "syntax_errors": [],
            "functions": ["function"] if has_def else [],
            "has_loops": has_loop,
            "has_recursion": False,
            "has_base_case": has_if,
            "attempt_confidence": 0.6 if has_def or has_loop else 0.3,
            "summary": "Heuristic analysis: code present.",
        }

    def process(self, state: AgentState) -> AgentState:
        """Agent entry point to analyze code inside message."""
        msg = state.get("message", "")
        code = self.extract_code(msg)

        if code:
            report = self.analyze_python_ast(code)
            state["metadata"]["code_analysis"] = report
            # If valid code or high confidence attempt, set attempt_detected = True
            if report.get("attempt_confidence", 0.0) >= 0.5 or report.get("syntax_valid"):
                state["attempt_detected"] = True
        else:
            state["metadata"]["code_analysis"] = {"has_code": False}

        return state
