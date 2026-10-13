"""
Module: backend.llm
Purpose: LLM provider clients with a unified interface.

         The active provider is chosen via the LLM_PROVIDER env var
         (values: "ollama" | "claude"). Default: ollama.

Created: 10/10/2026
"""

from config import get_settings
from llm.base import LLMClient, LLMError, LLMResponse
from llm.ollama_client import OllamaClient
from llm.claude_client import ClaudeClient


_settings = get_settings()


def get_llm_client() -> LLMClient:
    """
    Return the configured LLM client.

    Reads LLM_PROVIDER from settings each call so tests can swap
    the provider without restarting the app.
    """
    provider = (_settings.llm_provider or "ollama").lower()
    if provider == "claude":
        return ClaudeClient()
    return OllamaClient()


__all__ = [
    "LLMClient",
    "LLMError",
    "LLMResponse",
    "OllamaClient",
    "ClaudeClient",
    "get_llm_client",
]