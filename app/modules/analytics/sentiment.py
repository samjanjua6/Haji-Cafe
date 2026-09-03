"""
sentiment.py
Customer Review & Feedback Sentiment Analysis Engine.
Analyzes reviews for:
1. Overall Polarity (-1.0 to +1.0) and Sentiment (POSITIVE, NEUTRAL, NEGATIVE)
2. Aspect-Based Extraction (Coffee Quality, Service Speed, Cleanliness, Value)
3. Urgent Manager Alerts on negative reviews (rating <= 2 or negative sentiment)
4. Executive Sentiment KPIs & Net Sentiment Index
"""

import datetime
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.modules.chatbot.core.llm import _chat_completions_create_with_fallback, GROQ_MODEL

logger = logging.getLogger("analytics.sentiment")

# In-memory resilient store for reviews
_REVIEWS_STORE: List[Dict[str, Any]] = [
    {
        "id": 1,
        "branch_id": 1,
        "customer_name": "Sarah Miller",
        "customer_phone": "+923009876541",
        "rating": 5,
        "comment": "The Spanish Latte is absolute perfection! Super smooth and rich, and the barista was lovely.",
        "sentiment": "POSITIVE",
        "sentiment_score": 0.92,
        "key_aspects": {"coffee_quality": "POSITIVE", "service_speed": "POSITIVE", "cleanliness_ambience": "POSITIVE", "value_for_money": "POSITIVE"},
        "manager_alert": False,
        "manager_reply": "Thank you Sarah! Glad you loved the Spanish Latte!",
        "created_at": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2),
    },
    {
        "id": 2,
        "branch_id": 1,
        "customer_name": "David Chen",
        "customer_phone": "+923009876542",
        "rating": 2,
        "comment": "Waited over 20 minutes for a cold brew and the table was not cleaned after the previous guests.",
        "sentiment": "NEGATIVE",
        "sentiment_score": -0.75,
        "key_aspects": {"coffee_quality": "NEUTRAL", "service_speed": "NEGATIVE", "cleanliness_ambience": "NEGATIVE", "value_for_money": "NEUTRAL"},
        "manager_alert": True,
        "manager_reply": None,
        "created_at": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1),
    },
    {
        "id": 3,
        "branch_id": 1,
        "customer_name": "Ayesha Khan",
        "customer_phone": "+923009876543",
        "rating": 4,
        "comment": "Great coffee and cozy atmosphere to work from, but prices are slightly on the higher side.",
        "sentiment": "POSITIVE",
        "sentiment_score": 0.65,
        "key_aspects": {"coffee_quality": "POSITIVE", "service_speed": "POSITIVE", "cleanliness_ambience": "POSITIVE", "value_for_money": "NEUTRAL"},
        "manager_alert": False,
        "manager_reply": None,
        "created_at": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=8),
    },
]
_NEXT_REVIEW_ID = 4


class ReviewCreateRequest(BaseModel):
    branch_id: int = Field(default=1, description="Branch ID")
    customer_name: Optional[str] = Field(default="Guest Customer")
    customer_phone: Optional[str] = None
    rating: int = Field(default=5, ge=1, le=5)
    comment: str = Field(..., min_length=3, description="Customer review comment")


class ReviewResponse(BaseModel):
    id: int
    branch_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    rating: int
    comment: str
    sentiment: str
    sentiment_score: float
    key_aspects: Optional[Dict[str, Any]] = None
    manager_alert: bool
    manager_reply: Optional[str] = None
    created_at: datetime.datetime


class SentimentKPIsResponse(BaseModel):
    total_reviews: int
    overall_sentiment_index_pct: float
    positive_count: int
    neutral_count: int
    negative_count: int
    positive_pct: float
    negative_pct: float
    urgent_alerts_count: int
    aspect_satisfaction: Dict[str, float]
    recent_reviews: List[ReviewResponse]


def _lexical_sentiment_score(text: str) -> tuple[float, str]:
    """Fast lexical polarity scorer."""
    lower = text.lower()
    pos_words = {
        "great", "amazing", "perfection", "love", "loved", "lovely", "smooth", "rich",
        "best", "delicious", "fresh", "cozy", "friendly", "fast", "super", "excellent", "clean", "wonderful"
    }
    neg_words = {
        "bad", "terrible", "worst", "slow", "cold", "dirty", "waited", "horrible",
        "stale", "rude", "poor", "expensive", "disappointed", "never", "hate", "unclean"
    }

    words = lower.split()
    pos_matches = sum(1 for w in words if any(pw in w for pw in pos_words))
    neg_matches = sum(1 for w in words if any(nw in w for nw in neg_words))

    total = pos_matches + neg_matches
    if total == 0:
        return 0.0, "NEUTRAL"

    score = (pos_matches - neg_matches) / total
    score = max(-1.0, min(1.0, score))

    if score >= 0.2:
        return round(score, 2), "POSITIVE"
    elif score <= -0.2:
        return round(score, 2), "NEGATIVE"
    return round(score, 2), "NEUTRAL"


async def analyze_and_record_review(body: ReviewCreateRequest) -> ReviewResponse:
    """Analyze sentiment via Groq LLM (with lexical fallback) and record review."""
    global _NEXT_REVIEW_ID

    lexical_score, lexical_sentiment = _lexical_sentiment_score(body.comment)
    sentiment = lexical_sentiment
    score = lexical_score
    aspects = {
        "coffee_quality": "POSITIVE" if body.rating >= 4 else "NEUTRAL" if body.rating == 3 else "NEGATIVE",
        "service_speed": "POSITIVE" if body.rating >= 4 else "NEGATIVE" if "wait" in body.comment.lower() else "NEUTRAL",
        "cleanliness_ambience": "NEGATIVE" if "dirty" in body.comment.lower() else "POSITIVE",
        "value_for_money": "NEGATIVE" if "expensive" in body.comment.lower() else "POSITIVE",
    }

    # Use Groq LLM for deep aspect breakdown if available
    try:
        prompt = (
            f"Analyze this café review and return JSON with:\n"
            f"- 'sentiment': 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'\n"
            f"- 'sentiment_score': float from -1.0 to 1.0\n"
            f"- 'aspects': object mapping 'coffee_quality', 'service_speed', 'cleanliness_ambience', 'value_for_money' to 'POSITIVE'|'NEUTRAL'|'NEGATIVE'\n"
            f"Review: \"{body.comment}\" (Rating: {body.rating}/5)"
        )
        response = await _chat_completions_create_with_fallback(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a hospitality sentiment classification engine. Return JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content or "{}")
        if data.get("sentiment"):
            sentiment = data["sentiment"].upper()
        if data.get("sentiment_score") is not None:
            score = round(float(data["sentiment_score"]), 2)
        if data.get("aspects") and isinstance(data["aspects"], dict):
            aspects = data["aspects"]
    except Exception as e:
        logger.debug(f"Using lexical sentiment: {e}")

    # Urgent manager alert if rating <= 2 or sentiment is negative
    manager_alert = (body.rating <= 2) or (sentiment == "NEGATIVE")

    review_obj = {
        "id": _NEXT_REVIEW_ID,
        "branch_id": body.branch_id,
        "customer_name": body.customer_name or "Guest",
        "customer_phone": body.customer_phone,
        "rating": body.rating,
        "comment": body.comment,
        "sentiment": sentiment,
        "sentiment_score": score,
        "key_aspects": aspects,
        "manager_alert": manager_alert,
        "manager_reply": None,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }
    _NEXT_REVIEW_ID += 1
    _REVIEWS_STORE.insert(0, review_obj)

    # Broadcast urgent negative review to branch WebSockets
    if manager_alert:
        try:
            from app.modules.realtime.manager import order_ws_manager
            await order_ws_manager.broadcast_to_branch(
                branch_id=body.branch_id,
                event="NEGATIVE_REVIEW_ALERT",
                payload={"review_id": review_obj["id"], "customer_name": review_obj["customer_name"], "comment": body.comment, "rating": body.rating},
            )
        except Exception:
            pass

    return ReviewResponse(**review_obj)


async def get_sentiment_kpis(branch_id: Optional[int] = None) -> SentimentKPIsResponse:
    """Calculate executive sentiment KPIs and aspect satisfaction indices."""
    filtered = [r for r in _REVIEWS_STORE if not branch_id or r["branch_id"] == branch_id]
    total = len(filtered)
    if total == 0:
        return SentimentKPIsResponse(
            total_reviews=0,
            overall_sentiment_index_pct=100.0,
            positive_count=0,
            neutral_count=0,
            negative_count=0,
            positive_pct=100.0,
            negative_pct=0.0,
            urgent_alerts_count=0,
            aspect_satisfaction={"coffee_quality": 100.0, "service_speed": 100.0, "cleanliness_ambience": 100.0, "value_for_money": 100.0},
            recent_reviews=[],
        )

    pos_count = sum(1 for r in filtered if r["sentiment"] == "POSITIVE")
    neu_count = sum(1 for r in filtered if r["sentiment"] == "NEUTRAL")
    neg_count = sum(1 for r in filtered if r["sentiment"] == "NEGATIVE")
    alerts_count = sum(1 for r in filtered if r.get("manager_alert"))

    pos_pct = round((pos_count / total) * 100.0, 1)
    neg_pct = round((neg_count / total) * 100.0, 1)

    # Aspect satisfaction percentages
    aspects = ["coffee_quality", "service_speed", "cleanliness_ambience", "value_for_money"]
    aspect_scores = {}
    for asp in aspects:
        asp_pos = sum(1 for r in filtered if r.get("key_aspects", {}).get(asp) == "POSITIVE")
        aspect_scores[asp] = round((asp_pos / total) * 100.0, 1)

    avg_score = sum(r["sentiment_score"] for r in filtered) / total
    # Convert -1.0..+1.0 into 0..100%
    overall_index = round(((avg_score + 1.0) / 2.0) * 100.0, 1)

    return SentimentKPIsResponse(
        total_reviews=total,
        overall_sentiment_index_pct=overall_index,
        positive_count=pos_count,
        neutral_count=neu_count,
        negative_count=neg_count,
        positive_pct=pos_pct,
        negative_pct=neg_pct,
        urgent_alerts_count=alerts_count,
        aspect_satisfaction=aspect_scores,
        recent_reviews=[ReviewResponse(**r) for r in filtered[:10]],
    )


async def list_reviews(
    branch_id: Optional[int] = None,
    sentiment: Optional[str] = None,
    manager_alert: Optional[bool] = None,
) -> List[ReviewResponse]:
    """List filtered reviews."""
    results = []
    for r in _REVIEWS_STORE:
        if branch_id and r["branch_id"] != branch_id:
            continue
        if sentiment and r["sentiment"] != sentiment:
            continue
        if manager_alert is not None and r["manager_alert"] != manager_alert:
            continue
        results.append(ReviewResponse(**r))
    return results


async def reply_to_review(review_id: int, manager_reply: str) -> Optional[ReviewResponse]:
    """Manager response to a customer review."""
    for r in _REVIEWS_STORE:
        if r["id"] == review_id:
            r["manager_reply"] = manager_reply
            r["manager_alert"] = False  # marked as handled
            return ReviewResponse(**r)
    return None
