"""
Module: backend.llm.base
Purpose: Common interface for LLM providers (Claude, Ollama).

         All providers must implement `generate()` with the same
         signature so the agent layer is provider-agnostic.

Created: 10/10/2026
Updated: 17/11/2026
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResponse:
    """Normalized response from any LLM provider."""

    text: str
    model: str
    provider: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    elapsed_seconds: Optional[float] = None


class LLMClient(ABC):
    """
    Abstract base for LLM clients.

    Concrete providers (Claude, Ollama) implement `generate()`
    and `is_available()`.
    """

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        messages: Optional[list[dict[str, str]]] = None,
    ) -> LLMResponse:
        """
        Generate a completion using native multi-turn messages when provided.

        Args:
            system_prompt: Instructions for the model.
            user_message: The latest student message (used if `messages` is None).
            max_tokens: Response length limit.
            temperature: Sampling randomness (0.0-1.0).
            messages: Optional full conversation turn list
                      [{"role": "user"|"assistant", "content": "..."}].

        Returns:
            Normalized LLMResponse.

        Raises:
            LLMError: on any provider failure.
        """
        raise NotImplementedError

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True if the provider is reachable and ready."""
        raise NotImplementedError


class LLMError(Exception):
    """Raised when an LLM provider fails to generate a response."""

    pass
