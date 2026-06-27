from __future__ import annotations

import os
from typing import Optional

import google.generativeai as genai

from providers.base import BaseLLMProvider, LLMRequest, LLMResponse

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("GEMINI_DEFAULT_MODEL", "gemini-2.5-flash")

GEMINI_MODELS = [
    {"id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash"},
    {"id": "gemini-2.5-pro", "label": "Gemini 2.5 Pro"},
    {"id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash"},
]

_ALIASES = {
    "gemini-3-flash": "gemini-2.5-flash",
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-3.1-flash-preview": "gemini-2.5-flash",
    "gemini-3.1-flash-lite": "gemini-2.5-flash",
}


def _resolve_gemini_model(model: str) -> str:
    key = _ALIASES.get(model, model)
    ids = {m["id"] for m in GEMINI_MODELS}
    return key if key in ids else DEFAULT_MODEL


class GeminiProvider(BaseLLMProvider):
    provider_id = "gemini"
    label = "Google Gemini (paid API key)"
    requires_api_key = True
    is_free = False

    def is_available(self, api_key: Optional[str] = None) -> bool:
        return bool((api_key or GEMINI_API_KEY).strip())

    def list_models(self) -> list[dict]:
        return GEMINI_MODELS

    def generate(self, request: LLMRequest) -> LLMResponse:
        key = (request.api_key or GEMINI_API_KEY).strip()
        if not key:
            raise RuntimeError("GEMINI_API_KEY is required")
        model = _resolve_gemini_model(request.model or DEFAULT_MODEL)
        genai.configure(api_key=key)
        gmodel = genai.GenerativeModel(model)
        full = request.prompt
        if request.system.strip():
            full = f"{request.system.strip()}\n\n{full}"
        resp = gmodel.generate_content(full)
        text = (resp.text or "").strip()
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return LLMResponse(text=text, provider=self.provider_id, model=model)
