"""Groq Cloud chat completions client using the existing LLM interface."""

import time

import httpx

from config import get_settings
from llm.base import LLMClient, LLMError, LLMResponse


class GroqClient(LLMClient):
    """Call Groq's OpenAI-compatible chat completions endpoint."""

    base_url = "https://api.groq.com/openai/v1"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.llm_api_key
        self.model = model or settings.groq_model

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        if not self.api_key:
            raise LLMError("Groq API key is not configured. Add LLM_API_KEY to backend/.env.")

        started = time.perf_counter()
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_completion_tokens": max_tokens,
            "temperature": temperature,
            "reasoning_effort": "low",
            "reasoning_format": "hidden",
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise LLMError("Groq took too long to respond. Please try again.") from exc
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code == 401:
                message = "Groq rejected the API key. Check LLM_API_KEY in backend/.env."
            elif status_code == 429:
                message = "Groq rate limit or usage limit reached. Please try again later."
            else:
                message = f"Groq API request failed (HTTP {status_code})."
            raise LLMError(message) from exc
        except httpx.RequestError as exc:
            raise LLMError("Could not reach Groq. Check your internet connection.") from exc

        choices = data.get("choices") or []
        text = ((choices[0].get("message") or {}).get("content") or "").strip() if choices else ""
        if not text:
            raise LLMError("Groq returned an empty response.")

        usage = data.get("usage") or {}
        return LLMResponse(
            text=text,
            model=data.get("model", self.model),
            provider="groq",
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            elapsed_seconds=round(time.perf_counter() - started, 2),
        )

    async def is_available(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return response.status_code == 200
        except httpx.RequestError:
            return False
