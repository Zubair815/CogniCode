"""
Module: backend.llm.ollama_client
Purpose: Ollama HTTP client for local LLM inference.
         Uses the /api/chat endpoint with streaming disabled
         (simpler for V1; streaming will come in a later sprint).

         No external dependency — uses httpx which is already
         in requirements.txt.

Created: 10/10/2026
"""

import time

import httpx

from config import get_settings
from llm.base import LLMClient, LLMError, LLMResponse


class OllamaClient(LLMClient):
    """
    Ollama client for a locally hosted model (e.g., llama3.2).

    The model must be pulled first: `ollama pull llama3.2`.
    The service must be running: `ollama serve` (or the desktop app).
    """

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 120.0,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model
        # Local models can be slow on first request (model load).
        self.timeout = timeout_seconds

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Send a chat request to Ollama and return the response."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise LLMError("The AI is taking longer than usual. Please try again.") from exc
        except httpx.ConnectError as exc:
            raise LLMError(
                "Local AI service is not reachable. Ensure Ollama is running."
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise LLMError(
                f"AI service error (HTTP {exc.response.status_code})."
            ) from exc
        except Exception as exc:
            raise LLMError(f"Unexpected LLM error: {exc}") from exc

        elapsed = time.perf_counter() - started
        text = (data.get("message") or {}).get("content", "").strip()

        if not text:
            raise LLMError("AI returned an empty response.")

        return LLMResponse(
            text=text,
            model=data.get("model", self.model),
            provider="ollama",
            prompt_tokens=data.get("prompt_eval_count"),
            completion_tokens=data.get("eval_count"),
            elapsed_seconds=round(elapsed, 2),
        )

    async def is_available(self) -> bool:
        """Check whether the Ollama service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False