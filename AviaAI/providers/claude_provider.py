from __future__ import annotations

import os
from typing import Optional

import httpx

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

CLAUDE_MODELS = [
    {"id": "claude-3-5-haiku-20241022", "label": "Claude 3.5 Haiku"},
    {"id": "claude-sonnet-4-20250514", "label": "Claude Sonnet 4"},
    {"id": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet"},
]


class ClaudeProvider(BaseLLMProvider):
    provider_id = "claude"
    label = "Anthropic Claude (paid API key)"
    requires_api_key = True
    is_free = False

    def is_available(self, api_key: Optional[str] = None) -> bool:
        return bool((api_key or ANTHROPIC_API_KEY).strip())

    def list_models(self) -> list[dict]:
        return CLAUDE_MODELS

    def generate(self, request: LLMRequest) -> LLMResponse:
        key = (request.api_key or ANTHROPIC_API_KEY).strip()
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY is required")
        model = request.model or DEFAULT_MODEL
        headers = {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload: dict = {
            "model": model,
            "max_tokens": min(request.max_tokens, 4096),
            "temperature": request.temperature,
            "messages": [{"role": "user", "content": request.prompt}],
        }
        if request.system.strip():
            payload["system"] = request.system.strip()
        with httpx.Client(timeout=180.0) as client:
            resp = client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        parts = data.get("content", [])
        text = ""
        if parts and isinstance(parts, list):
            text = str(parts[0].get("text", "")).strip()
        if not text:
            raise RuntimeError("Claude returned an empty response")
        return LLMResponse(text=text, provider=self.provider_id, model=model)
