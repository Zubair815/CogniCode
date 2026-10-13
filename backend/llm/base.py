"""
Module: backend.llm.base
Purpose: Common interface for LLM providers (Claude, Ollama).

         All providers must implement `generate()` with the same
         signature so the agent layer is provider-agnostic.

Created: 10/10/2026
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
    ) -> LLMResponse:
        """
        Generate a completion.

        Args:
            system_prompt: Instructions for the model.
            user_message: The student's message.
            max_tokens: Response length limit.
            temperature: Sampling randomness (0.0-1.0).

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