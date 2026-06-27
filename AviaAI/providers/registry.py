from __future__ import annotations

import os
from typing import Optional

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse
from providers.claude_provider import ClaudeProvider
from providers.gemini_provider import GeminiProvider
from providers.huggingface_provider import HuggingFaceProvider
from providers.ollama_provider import OllamaProvider
from providers.openai_provider import OpenAIProvider

PROVIDERS = {
    "huggingface": HuggingFaceProvider(),
    "gemini": GeminiProvider(),
}

DEFAULT_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama")
DEFAULT_MODEL = os.environ.get("LLM_MODEL", "")


def resolve_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> tuple[BaseLLMProvider, str, Optional[str]]:
    pid = (provider or DEFAULT_PROVIDER or "ollama").strip().lower()
    if pid not in PROVIDERS:
        pid = DEFAULT_PROVIDER if DEFAULT_PROVIDER in PROVIDERS else "ollama"
    prov = PROVIDERS[pid]
    resolved_model = (model or DEFAULT_MODEL or "").strip()
    if not resolved_model:
        models = prov.list_models()
        resolved_model = models[0]["id"] if models else ""
    return prov, resolved_model, api_key


def generate_text(
    prompt: str,
    system: str = "",
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> LLMResponse:
    prov, resolved_model, key = resolve_llm(provider, model, api_key)
    if not prov.is_available(key):
        raise RuntimeError(
            f"Provider '{prov.provider_id}' is not configured. "
            + ("Add an API key in settings or .env." if prov.requires_api_key else "Check that the service is running.")
        )
    return prov.generate(
        LLMRequest(prompt=prompt, system=system, model=resolved_model, api_key=key)
    )


def list_providers() -> dict:
    default_provider = DEFAULT_PROVIDER if DEFAULT_PROVIDER in PROVIDERS else "ollama"
    default_model = DEFAULT_MODEL
    if not default_model:
        default_model = (
            PROVIDERS[default_provider].list_models()[0]["id"]
            if PROVIDERS[default_provider].list_models()
            else ""
        )
    return {
        "default_provider": default_provider,
        "default_model": default_model,
        "providers": [
            {
                "id": p.provider_id,
                "label": p.label,
                "requires_api_key": p.requires_api_key,
                "is_free": p.is_free,
                "available": p.is_available(),
                "models": p.list_models(),
            }
            for p in PROVIDERS.values()
        ],
    }
