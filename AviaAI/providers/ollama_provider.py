from __future__ import annotations

import os
from typing import Optional

import httpx

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse

DEFAULT_BASE = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

OLLAMA_MODELS = [
    {"id": "qwen2.5-coder:7b", "label": "Qwen 2.5 Coder 7B"},
    {"id": "qwen2.5-coder:3b", "label": "Qwen 2.5 Coder 3B"},
    {"id": "llama3.2:3b", "label": "Llama 3.2 3B"},
    {"id": "mistral:7b", "label": "Mistral 7B"},
    {"id": "deepseek-coder:6.7b", "label": "DeepSeek Coder 6.7B"},
]


class OllamaProvider(BaseLLMProvider):
    provider_id = "ollama"
    label = "Ollama (local, free)"
    requires_api_key = False
    is_free = True

    def __init__(self) -> None:
        self.base_url = DEFAULT_BASE.rstrip("/")

    def is_available(self, api_key: Optional[str] = None) -> bool:
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    def list_models(self) -> list[dict]:
        return OLLAMA_MODELS

    def generate(self, request: LLMRequest) -> LLMResponse:
        model = request.model or OLLAMA_MODELS[0]["id"]
        messages = []
        if request.system.strip():
            messages.append({"role": "system", "content": request.system.strip()})
        messages.append({"role": "user", "content": request.prompt})
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": request.temperature},
        }
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(f"{self.base_url}/v1/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not text:
            raise RuntimeError("Ollama returned an empty response")
        return LLMResponse(text=text, provider=self.provider_id, model=model)
