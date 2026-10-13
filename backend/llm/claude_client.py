"""
Module: backend.llm.claude_client
Purpose: Anthropic Claude API client.
         Included for production use — not required in development
         if OLLAMA is being used. Activated by setting LLM_PROVIDER=claude
         and providing LLM_API_KEY.

Created: 10/10/2026
"""

import time

from config import get_settings
from llm.base import LLMClient, LLMError, LLMResponse


class ClaudeClient(LLMClient):
    """Claude API client (Anthropic SDK)."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.llm_api_key
        self.model = model or settings.llm_model

        if not self.api_key:
            # Client is instantiated but unusable without a key.
            self._client = None
        else:
            try:
                from anthropic import AsyncAnthropic
                self._client = AsyncAnthropic(api_key=self.api_key)
            except ImportError as exc:
                raise LLMError("anthropic SDK not installed.") from exc

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Send a message to Claude and return the response."""
        if self._client is None:
            raise LLMError("Claude API key is not configured.")

        started = time.perf_counter()
        try:
            response = await self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
        except Exception as exc:
            raise LLMError(f"Claude API error: {exc}") from exc

        elapsed = time.perf_counter() - started
        text = "".join(
            block.text for block in response.content if hasattr(block, "text")
        ).strip()

        if not text:
            raise LLMError("Claude returned an empty response.")

        return LLMResponse(
            text=text,
            model=self.model,
            provider="claude",
            prompt_tokens=getattr(response.usage, "input_tokens", None),
            completion_tokens=getattr(response.usage, "output_tokens", None),
            elapsed_seconds=round(elapsed, 2),
        )

    async def is_available(self) -> bool:
        return self._client is not None