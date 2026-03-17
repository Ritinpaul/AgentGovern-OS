"""
AgentGovern OS — Memory Package.

Provides persistent semantic memory for agent decision precedent lookup.
"""

from .chroma_store import ChromaStore, DECISIONS_COLLECTION, POLICIES_COLLECTION, EVIDENCE_COLLECTION
from .decision_embedder import DecisionEmbedder, get_embedder

__all__ = [
    "ChromaStore",
    "DecisionEmbedder",
    "get_embedder",
    "DECISIONS_COLLECTION",
    "POLICIES_COLLECTION",
    "EVIDENCE_COLLECTION",
]
