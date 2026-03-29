"""Memory management system for the TaskPilot Agent.

Implements three memory tiers:
- Short-term: Current conversation context (limited window)
- Working: Active task state and observations
- Long-term: Persistent learned patterns and past interactions
"""

from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Any, Optional

import numpy as np

from config import settings
from models import MemoryEntry


class MemoryManager:
    """Manages agent memory across three tiers: short-term, working, and long-term."""

    def __init__(self) -> None:
        self.short_term: list[MemoryEntry] = []
        self.working: list[MemoryEntry] = []
        self.long_term: list[MemoryEntry] = []
        self._embedding_cache: dict[str, list[float]] = {}

    def store_short_term(self, content: str, metadata: Optional[dict[str, Any]] = None) -> MemoryEntry:
        """Store an entry in short-term memory (current conversation context)."""
        entry = MemoryEntry(
            content=content,
            memory_type="short_term",
            metadata=metadata or {},
        )
        self.short_term.append(entry)

        if len(self.short_term) > settings.MEMORY_CAPACITY_SHORT_TERM:
            oldest = self.short_term.pop(0)
            self._promote_to_long_term(oldest)

        return entry

    def store_working(self, content: str, metadata: Optional[dict[str, Any]] = None) -> MemoryEntry:
        """Store an entry in working memory (active task state)."""
        entry = MemoryEntry(
            content=content,
            memory_type="working",
            metadata=metadata or {},
        )
        self.working.append(entry)
        return entry

    def store_long_term(self, content: str, metadata: Optional[dict[str, Any]] = None) -> MemoryEntry:
        """Store an entry in long-term memory with an embedding for retrieval."""
        embedding = self._compute_embedding(content)
        entry = MemoryEntry(
            content=content,
            memory_type="long_term",
            metadata=metadata or {},
            embedding=embedding,
        )
        self.long_term.append(entry)

        if len(self.long_term) > settings.MEMORY_CAPACITY_LONG_TERM:
            self.long_term.sort(key=lambda e: e.relevance_score)
            self.long_term.pop(0)

        return entry

    def store_interaction(
        self,
        thought: str,
        action: str,
        observation: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        """Store a full agent interaction cycle across memory tiers."""
        combined = f"Thought: {thought}\nAction: {action}\nObservation: {observation}"
        self.store_short_term(combined, metadata)

        self.store_working(
            f"Action: {action} -> Result: {observation}",
            {**(metadata or {}), "interaction_type": "action_result"},
        )

        if self._is_significant(thought, observation):
            self.store_long_term(
                combined,
                {**(metadata or {}), "interaction_type": "significant_learning"},
            )

    def retrieve_relevant(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        """Retrieve the most relevant memories across all tiers for a query."""
        query_embedding = self._compute_embedding(query)
        scored_memories: list[tuple[float, MemoryEntry]] = []

        for entry in self.short_term[-10:]:
            score = self._text_similarity(query, entry.content) * 1.5
            scored_memories.append((score, entry))

        for entry in self.working:
            score = self._text_similarity(query, entry.content) * 1.2
            scored_memories.append((score, entry))

        for entry in self.long_term:
            if entry.embedding:
                score = self._cosine_similarity(query_embedding, entry.embedding)
            else:
                score = self._text_similarity(query, entry.content)
            scored_memories.append((score, entry))

        scored_memories.sort(key=lambda x: x[0], reverse=True)

        results: list[MemoryEntry] = []
        for score, entry in scored_memories[:top_k]:
            entry.relevance_score = score
            results.append(entry)

        return results

    def get_context_window(self) -> str:
        """Build a context window from recent short-term and working memory."""
        lines: list[str] = []

        if self.working:
            lines.append("=== Current Working Context ===")
            for entry in self.working[-5:]:
                lines.append(f"- {entry.content}")

        if self.short_term:
            lines.append("\n=== Recent Conversation ===")
            for entry in self.short_term[-8:]:
                lines.append(f"- {entry.content}")

        return "\n".join(lines) if lines else "No previous context available."

    def clear_short_term(self) -> None:
        """Clear short-term memory (e.g., when starting a new conversation)."""
        for entry in self.short_term:
            if self._is_significant_entry(entry):
                self._promote_to_long_term(entry)
        self.short_term.clear()

    def clear_working(self) -> None:
        """Clear working memory (e.g., when task completes)."""
        self.working.clear()

    def get_all_memories(self) -> dict[str, list[dict[str, Any]]]:
        """Return all memories organized by tier."""
        return {
            "short_term": [self._entry_to_dict(e) for e in self.short_term],
            "working": [self._entry_to_dict(e) for e in self.working],
            "long_term": [self._entry_to_dict(e) for e in self.long_term],
        }

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory entry by ID from any tier."""
        for tier in [self.short_term, self.working, self.long_term]:
            for i, entry in enumerate(tier):
                if entry.id == memory_id:
                    tier.pop(i)
                    return True
        return False

    def update_memory(self, memory_id: str, new_content: str) -> Optional[MemoryEntry]:
        """Update the content of a memory entry."""
        for tier in [self.short_term, self.working, self.long_term]:
            for entry in tier:
                if entry.id == memory_id:
                    entry.content = new_content
                    if entry.memory_type == "long_term":
                        entry.embedding = self._compute_embedding(new_content)
                    return entry
        return None

    def _promote_to_long_term(self, entry: MemoryEntry) -> None:
        """Promote a short-term memory to long-term storage."""
        self.store_long_term(entry.content, {**entry.metadata, "promoted_from": "short_term"})

    def _is_significant(self, thought: str, observation: str) -> bool:
        """Determine if an interaction is significant enough for long-term storage."""
        significance_keywords = [
            "important", "learned", "pattern", "preference", "always",
            "never", "critical", "error", "success", "completed",
            "blocked", "risk", "priority", "deadline",
        ]
        combined = f"{thought} {observation}".lower()
        matches = sum(1 for kw in significance_keywords if kw in combined)
        return matches >= 2 or len(combined) > 300

    def _is_significant_entry(self, entry: MemoryEntry) -> bool:
        """Check if a memory entry is significant enough to promote."""
        return self._is_significant(entry.content, "")

    def _compute_embedding(self, text: str) -> list[float]:
        """Compute a simple TF-IDF-style embedding for text.

        In production, this would use OpenAI embeddings or a local model.
        This implementation uses a deterministic hash-based approach for
        consistent similarity computation without requiring an API.
        """
        if text in self._embedding_cache:
            return self._embedding_cache[text]

        dim = 128
        embedding = [0.0] * dim
        words = text.lower().split()

        for i, word in enumerate(words):
            for j, char in enumerate(word):
                idx = (ord(char) * 31 + j * 7 + i * 13) % dim
                weight = 1.0 / (1.0 + math.log1p(i))
                embedding[idx] += weight

        norm = math.sqrt(sum(x * x for x in embedding)) or 1.0
        embedding = [x / norm for x in embedding]

        self._embedding_cache[text] = embedding
        return embedding

    def _cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norm_b = math.sqrt(sum(x * x for x in b)) or 1.0
        return dot / (norm_a * norm_b)

    def _text_similarity(self, query: str, text: str) -> float:
        """Compute a simple text similarity based on word overlap."""
        query_words = set(query.lower().split())
        text_words = set(text.lower().split())
        if not query_words or not text_words:
            return 0.0
        intersection = query_words & text_words
        union = query_words | text_words
        return len(intersection) / len(union)

    @staticmethod
    def _entry_to_dict(entry: MemoryEntry) -> dict[str, Any]:
        """Convert a MemoryEntry to a serializable dict (without embedding)."""
        return {
            "id": entry.id,
            "content": entry.content,
            "memory_type": entry.memory_type,
            "metadata": entry.metadata,
            "created_at": entry.created_at.isoformat(),
            "relevance_score": entry.relevance_score,
        }
