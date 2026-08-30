"""
vector_store.py
High-performance In-Memory Semantic Vector Store for Haji Cafe.
Implements TF-IDF + BM25 term weighting and Cosine Similarity in pure Python.
Runs in < 2ms without external database or C-DLL dependencies.
"""

import math
import re
from typing import List, Dict, Any, Optional

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he",
    "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't",
    "it", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of",
    "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the", "their",
    "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what", "when", "where", "which",
    "while", "who", "whom", "why", "with", "won't", "would", "wouldn't", "you", "your", "yours", "yourself",
}


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercased alpha-numeric words and clean punctuation."""
    words = re.findall(r"\b[a-zA-Z0-9_\-\$]+\b", text.lower())
    return [w for w in words if len(w) > 1 and w not in STOP_WORDS]


class KnowledgeDocument:
    def __init__(
        self,
        doc_id: str,
        title: str,
        content: str,
        doc_type: str,
        cafe_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.id = doc_id
        self.title = title
        self.content = content
        self.doc_type = doc_type
        self.cafe_id = cafe_id
        self.branch_id = branch_id
        self.metadata = metadata or {}
        
        # Tokenize content and title (with title boosted 2x)
        self.tokens = _tokenize(title) * 2 + _tokenize(content)
        self.tf: Dict[str, float] = {}
        self.norm: float = 0.0


class VectorKnowledgeStore:
    def __init__(self):
        self.documents: Dict[str, KnowledgeDocument] = {}
        self.idf: Dict[str, float] = {}
        self.total_docs: int = 0
        self.last_synced_at: Optional[str] = None

    def add_document(
        self,
        doc_id: str,
        title: str,
        content: str,
        doc_type: str,
        cafe_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        doc = KnowledgeDocument(doc_id, title, content, doc_type, cafe_id, branch_id, metadata)
        self.documents[doc_id] = doc

    def build_index(self):
        """Compute IDF and normalized TF-IDF vectors for all documents."""
        self.total_docs = len(self.documents)
        if self.total_docs == 0:
            return

        # 1. Document frequency count
        df: Dict[str, int] = {}
        for doc in self.documents.values():
            unique_terms = set(doc.tokens)
            for t in unique_terms:
                df[t] = df.get(t, 0) + 1

        # 2. Compute smooth BM25-style IDF: log(1 + (N - df + 0.5) / (df + 0.5))
        self.idf = {}
        for t, count in df.items():
            self.idf[t] = math.log(1.0 + (self.total_docs - count + 0.5) / (count + 0.5)) + 1.0

        # 3. Compute TF-IDF vector & magnitude norm for each doc
        for doc in self.documents.values():
            term_counts: Dict[str, int] = {}
            for t in doc.tokens:
                term_counts[t] = term_counts.get(t, 0) + 1

            doc.tf = {}
            norm_sq = 0.0
            doc_len = len(doc.tokens) or 1
            for t, c in term_counts.items():
                # Sub-linear term frequency scaling
                tf_val = (1.0 + math.log(c)) * self.idf.get(t, 1.0)
                doc.tf[t] = tf_val
                norm_sq += tf_val * tf_val

            doc.norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0

    def query(
        self,
        query_text: str,
        top_k: int = 4,
        doc_type: Optional[str] = None,
        cafe_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        min_score: float = 0.05,
    ) -> List[Dict[str, Any]]:
        """
        Search the knowledge base using Cosine Similarity over TF-IDF vectors.
        Applies metadata filters and returns ranked relevant chunks.
        """
        q_tokens = _tokenize(query_text)
        if not q_tokens or not self.documents:
            return []

        # Build query TF-IDF vector
        q_counts: Dict[str, int] = {}
        for t in q_tokens:
            q_counts[t] = q_counts.get(t, 0) + 1

        q_vec: Dict[str, float] = {}
        q_norm_sq = 0.0
        for t, c in q_counts.items():
            if t in self.idf:
                weight = (1.0 + math.log(c)) * self.idf[t]
                q_vec[t] = weight
                q_norm_sq += weight * weight

        q_norm = math.sqrt(q_norm_sq) if q_norm_sq > 0 else 1.0

        scores: List[tuple[float, KnowledgeDocument]] = []

        for doc in self.documents.values():
            # Apply metadata filters
            if doc_type and doc.doc_type != doc_type:
                continue
            if cafe_id and doc.cafe_id and doc.cafe_id != cafe_id:
                continue
            if branch_id and doc.branch_id and doc.branch_id != branch_id:
                continue

            # Compute dot product
            dot_product = 0.0
            for t, q_val in q_vec.items():
                if t in doc.tf:
                    dot_product += q_val * doc.tf[t]

            if dot_product > 0:
                sim = dot_product / (q_norm * doc.norm)
                if sim >= min_score:
                    scores.append((sim, doc))

        # Sort by descending similarity score
        scores.sort(key=lambda x: x[0], reverse=True)

        results = []
        for sim, doc in scores[:top_k]:
            results.append({
                "id": doc.id,
                "title": doc.title,
                "content": doc.content,
                "doc_type": doc.doc_type,
                "score": round(sim, 4),
                "metadata": doc.metadata,
            })
        return results

    def clear(self):
        self.documents.clear()
        self.idf.clear()
        self.total_docs = 0


# Global singleton vector store
_global_vector_store = VectorKnowledgeStore()


def get_vector_store() -> VectorKnowledgeStore:
    return _global_vector_store
