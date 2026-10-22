"""
Book similarity / duplicate-detection service.

METHOD (stated plainly, no overclaiming): TF-IDF vectorization of
"title + author + publication" text, compared with cosine similarity against
the existing catalogue. This is a real, working, explainable similarity
search using scikit-learn — not a large embedding model, and not a chatbot.
Its purpose is to flag likely-duplicate procurement requests before money is
spent, e.g. a request for "Python Data Analysis" should surface the existing
catalogue entry "Python for Data Analysis" with a high similarity score.

Swappable later: if a stronger method (e.g. sentence embeddings) is wanted,
only this file needs to change — the API contract (POST /similarity) stays
the same, so the Node backend doesn't need to change.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

app = FastAPI(title="Library Book Similarity Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("API_ORIGIN", "http://localhost:4000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BookQuery(BaseModel):
    title: str
    author: str = ""


class CatalogueEntry(BaseModel):
    id: str
    title: str
    author: str
    publication: str | None = None


class SimilarityRequest(BaseModel):
    query: BookQuery
    catalogue: list[CatalogueEntry]


class Match(BaseModel):
    id: str
    title: str
    author: str
    publication: str | None
    similarity: float


class SimilarityResponse(BaseModel):
    matches: list[Match]
    method: str


def to_text(title: str, author: str, publication: str | None = "") -> str:
    return f"{title} {author} {publication or ''}".lower().strip()


@app.get("/health")
def health():
    return {"ok": True, "service": "similarity", "method": "tfidf-cosine-similarity"}


@app.post("/similarity", response_model=SimilarityResponse)
def similarity(req: SimilarityRequest):
    if not req.catalogue:
        return SimilarityResponse(matches=[], method="tfidf-cosine-similarity")

    corpus_texts = [to_text(c.title, c.author, c.publication) for c in req.catalogue]
    query_text = to_text(req.query.title, req.query.author)

    documents = corpus_texts + [query_text]

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(documents)

    query_vector = tfidf_matrix[-1]
    catalogue_vectors = tfidf_matrix[:-1]

    scores = cosine_similarity(query_vector, catalogue_vectors)[0]

    ranked = sorted(
        zip(req.catalogue, scores), key=lambda pair: pair[1], reverse=True
    )

    matches = [
        Match(
            id=book.id,
            title=book.title,
            author=book.author,
            publication=book.publication,
            similarity=round(float(score) * 100, 1),
        )
        for book, score in ranked
        if score > 0.15  # filter out near-zero noise matches
    ][:5]

    return SimilarityResponse(matches=matches, method="tfidf-cosine-similarity")
