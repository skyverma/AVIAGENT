from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMRequest:
    prompt: str
    system: str = ""
    model: Optional[str] = None
    api_key: Optional[str] = None
    temperature: float = 0.2
    max_tokens: int = 4096


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str


class BaseLLMProvider(ABC):
    provider_id: str
    label: str
    requires_api_key: bool = False
    is_free: bool = False

    @abstractmethod
    def is_available(self, api_key: Optional[str] = None) -> bool:
        ...

    @abstractmethod
    def generate(self, request: LLMRequest) -> LLMResponse:
        ...

    def list_models(self) -> list[dict]:
        return []
