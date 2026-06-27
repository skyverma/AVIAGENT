from __future__ import annotations

import os
from typing import Optional

import httpx

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse

HF_API_KEY = os.environ.get("HUGGINGFACE_API_KEY", "")
DEFAULT_MODEL = os.environ.get("HUGGINGFACE_MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct")
HF_ROUTER_URL = os.environ.get("HUGGINGFACE_BASE_URL", "https://router.huggingface.co/v1").rstrip("/")

HF_MODELS = [
    {"id": "Qwen/Qwen2.5-Coder-32B-Instruct", "label": "Qwen 2.5 Coder 32B (best for data/code)"},
    {"id": "deepseek-ai/DeepSeek-V3-0324", "label": "DeepSeek V3 (best reasoning)"},
    {"id": "Qwen/Qwen3-235B-A22B-Instruct-2507", "label": "Qwen3 235B (largest)"},
    {"id": "meta-llama/Llama-3.3-70B-Instruct", "label": "Llama 3.3 70B"},
    {"id": "Qwen/Qwen2.5-Coder-7B-Instruct", "label": "Qwen 2.5 Coder 7B (fast)"},
]


class HuggingFaceProvider(BaseLLMProvider):
    provider_id = "huggingface"
    label = "Hugging Face (hosted, free tier)"
    requires_api_key = True
    is_free = True

    def is_available(self, api_key: Optional[str] = None) -> bool:
        return bool((api_key or HF_API_KEY).strip())

    def list_models(self) -> list[dict]:
        return HF_MODELS

    def generate(self, request: LLMRequest) -> LLMResponse:
        key = (request.api_key or HF_API_KEY).strip()
        if not key:
            raise RuntimeError("HUGGINGFACE_API_KEY is required")
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
            "max_tokens": min(request.max_tokens, 2048),
        }
        url = f"{HF_ROUTER_URL}/chat/completions"
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 503:
                raise RuntimeError("Hugging Face model is loading — retry in a few seconds")
            if resp.status_code == 401:
                raise RuntimeError("Invalid Hugging Face API key — check HUGGINGFACE_API_KEY")
            if resp.status_code == 403:
                raise RuntimeError("Hugging Face token lacks Inference Providers permission")
            resp.raise_for_status()
            data = resp.json()
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not text:
            raise RuntimeError("Hugging Face returned an empty response")
        return LLMResponse(text=text, provider=self.provider_id, model=model)
