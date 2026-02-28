"""QICACHE Router — Query Intelligence Cache API.

Endpoints:
  POST   /api/v1/cache/query            — Check cache before LLM
  POST   /api/v1/cache/store            — Store LLM response in cache
  POST   /api/v1/cache/regenerate/{hash} — Replace cached entry with fresh response
  DELETE /api/v1/cache/{hash}            — Invalidate a cache entry
  GET    /api/v1/cache/analytics         — Cache performance metrics
  POST   /api/v1/cache/settings          — Update cache settings
"""

import hashlib
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from config import get_settings
from models import QueryCache, CacheAnalytics
from schemas import CacheQueryRequest, CacheQueryResponse, CacheAnalyticsResponse

router = APIRouter(prefix="/api/v1/cache", tags=["qicache"])

settings = get_settings()


def _normalize_query(text: str) -> str:
    """Normalize: lowercase, strip punctuation, remove stopwords, sort."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    stopwords = {"the", "a", "an", "is", "are", "was", "were", "for", "of", "to", "in", "on"}
    words = [w for w in text.split() if w not in stopwords]
    return " ".join(sorted(words))


def _compute_hash(normalized: str, agent_role: str, context: dict) -> str:
    """Context-aware hash: same text + different context = different key."""
    payload = (
        f"{normalized}|{agent_role}"
        f"|{context.get('dispute_type', '')}"
        f"|{context.get('amount_range', '')}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()


@router.post("/query", response_model=CacheQueryResponse)
async def query_cache(request: CacheQueryRequest, db: AsyncSession = Depends(get_db)):
    """Check cache before routing to LLM."""
    if request.bypass or not request.cache_enabled or not settings.qicache_enabled:
        normalized = _normalize_query(request.query_text)
        qhash = _compute_hash(normalized, request.agent_role, request.context)
        return CacheQueryResponse(hit=False, source="llm", query_hash=qhash)

    normalized = _normalize_query(request.query_text)
    qhash = _compute_hash(normalized, request.agent_role, request.context)

    # Check PostgreSQL cache
    result = await db.execute(
        select(QueryCache).where(
            QueryCache.query_hash == qhash,
            QueryCache.expires_at > datetime.utcnow(),
        )
    )
    cached = result.scalar_one_or_none()

    if cached:
        # Touch TTL and increment hit count
        cached.last_accessed_at = datetime.utcnow()
        cached.expires_at = datetime.utcnow() + timedelta(days=settings.qicache_ttl_days)
        cached.hit_count += 1
        await db.flush()

        tokens_saved = cached.response_metadata.get("tokens_consumed", 0) if cached.response_metadata else 0
        return CacheQueryResponse(
            hit=True,
            response=cached.response_text,
            source="postgres_warm",
            tokens_saved=tokens_saved,
            query_hash=qhash,
        )

    return CacheQueryResponse(hit=False, source="llm", query_hash=qhash)


@router.post("/store")
async def store_in_cache(
    query_hash: str,
    query_text: str,
    response_text: str,
    agent_role: str = "",
    metadata: dict | None = None,
    save_enabled: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Store an LLM response in cache (respects save_enabled toggle)."""
    if not save_enabled or not settings.qicache_enabled:
        return {"stored": False, "reason": "save_disabled"}

    normalized = _normalize_query(query_text)
    entry = QueryCache(
        query_hash=query_hash,
        query_text=query_text,
        query_normalized=normalized,
        response_text=response_text,
        response_metadata=metadata or {},
        agent_role=agent_role,
        expires_at=datetime.utcnow() + timedelta(days=settings.qicache_ttl_days),
    )
    db.add(entry)
    await db.flush()
    return {"stored": True, "query_hash": query_hash}


@router.post("/regenerate/{query_hash}")
async def regenerate(query_hash: str, db: AsyncSession = Depends(get_db)):
    """Invalidate a cached entry so next query gets a fresh LLM response."""
    await db.execute(delete(QueryCache).where(QueryCache.query_hash == query_hash))
    await db.flush()
    return {"invalidated": True, "query_hash": query_hash}


@router.delete("/{query_hash}")
async def invalidate_entry(query_hash: str, db: AsyncSession = Depends(get_db)):
    """Manually remove a cached entry."""
    await db.execute(delete(QueryCache).where(QueryCache.query_hash == query_hash))
    await db.flush()
    return {"deleted": True}


@router.get("/analytics", response_model=CacheAnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Cache performance metrics."""
    total = (await db.execute(select(func.count()).select_from(QueryCache))).scalar() or 0
    total_hits = (
        await db.execute(select(func.sum(QueryCache.hit_count)).select_from(QueryCache))
    ).scalar() or 0
    hit_rate = (total_hits / (total_hits + total)) * 100 if (total_hits + total) > 0 else 0.0

    return CacheAnalyticsResponse(
        total_queries=total + total_hits,
        cache_hits=total_hits,
        cache_misses=total,
        hit_rate=round(hit_rate, 2),
        tokens_saved=0,  # Computed from response_metadata in production
        cost_saved=0,
    )


@router.post("/evict-expired")
async def evict_expired(db: AsyncSession = Depends(get_db)):
    """Purge entries past their TTL (called by Celery beat hourly)."""
    result = await db.execute(
        delete(QueryCache).where(
            QueryCache.expires_at < datetime.utcnow(),
            QueryCache.is_pinned == False,
        )
    )
    await db.flush()
    return {"evicted": result.rowcount}
