"""Gemini model registry — preset id → Google API model id."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

DEFAULT_PRESET_ID = "gemini-3-flash"


@dataclass(frozen=True)
class GeminiModel:
    preset_id: str
    label: str
    api_model: str


GEMINI_MODELS: list[GeminiModel] = [
    GeminiModel("gemini-2.5-flash", "Gemini 2.5 Flash", "gemini-2.5-flash"),
    GeminiModel("gemini-3-flash", "Gemini 3 Flash", "gemini-3-flash-preview"),
    GeminiModel("gemini-3.1-flash-preview", "Gemini 3.1 Flash Preview", "gemini-3.1-flash-lite"),
]

_ALIASES = {
    "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-preview",
    "gemini-3.1-flash-lite": "gemini-3.1-flash-preview",
    "trinity": "gemini-2.5-flash",
}
_BY_PRESET = {m.preset_id: m for m in GEMINI_MODELS}
_BY_API = {m.api_model: m for m in GEMINI_MODELS}


def resolve_model(model_or_preset: Optional[str] = None) -> GeminiModel:
    key = (model_or_preset or "").strip()
    if not key:
        import os
        key = os.environ.get("GEMINI_DEFAULT_MODEL", DEFAULT_PRESET_ID)
    key = _ALIASES.get(key, key)
    if key in _BY_PRESET:
        return _BY_PRESET[key]
    if key in _BY_API:
        return _BY_API[key]
    return _BY_PRESET.get(DEFAULT_PRESET_ID, GEMINI_MODELS[0])


def list_models() -> list[dict]:
    return [{"id": m.preset_id, "label": m.label, "api_model": m.api_model} for m in GEMINI_MODELS]
