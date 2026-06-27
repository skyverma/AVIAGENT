from __future__ import annotations

import os
from typing import Optional

import httpx

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

OPENAI_MODELS = [
    {"id": "gpt-4o-mini", "label": "GPT-4o Mini"},
    {"id": "gpt-4o", "label": "GPT-4o"},
    {"id": "gpt-4.1-mini", "label": "GPT-4.1 Mini"},
    {"id": "o3-mini", "label": "o3 Mini"},
]


class OpenAIProvider(BaseLLMProvider):
    provider_id = "openai"
    label = "OpenAI (paid API key)"
    requires_api_key = True
    is_free = False

    def is_available(self, api_key: Optional[str] = None) -> bool:
        return bool((api_key or OPENAI_API_KEY).strip())

    def list_models(self) -> list[dict]:
        return OPENAI_MODELS

    def generate(self, request: LLMRequest) -> LLMResponse:
        key = (request.api_key or OPENAI_API_KEY).strip()
        if not key:
            raise RuntimeError("OPENAI_API_KEY is required")
        model = request.model or DEFAULT_MODEL
        messages = []
        if request.system.strip():
            messages.append({"role": "system", "content": request.system.strip()})
        messages.append({"role": "user", "content": request.prompt})
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(f"{OPENAI_BASE}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not text:
            raise RuntimeError("OpenAI returned an empty response")
        return LLMResponse(text=text, provider=self.provider_id, model=model)
