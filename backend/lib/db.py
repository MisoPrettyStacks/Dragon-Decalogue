"""In-memory database for questions."""

from typing import Any, Dict, List, Optional


class FindResult:
    """Result of a find query."""

    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, field: str, direction: int):
        """Sort results."""
        self.docs.sort(key=lambda d: d.get(field), reverse=(direction == -1))
        return self

    async def to_list(self, limit: Optional[int] = None) -> List[Dict]:
        """Convert to list."""
        return self.docs[:limit] if limit else self.docs


class DeleteResult:
    """Result of a delete query."""

    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class SimpleDB:
    """Simple in-memory database."""

    def __init__(self):
        self.questions: Dict[str, Dict[str, Any]] = {}

    async def insert_one(self, doc: Dict[str, Any]) -> None:
        """Insert a document."""
        self.questions[doc["id"]] = doc

    async def find(self, query: Dict[str, Any], projection: Optional[Dict] = None):
        """Find documents matching query."""
        return FindResult(self.questions.values())

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict] = None) -> Optional[Dict]:
        """Find single document."""
        for doc in self.questions.values():
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                return doc
        return None

    async def delete_one(self, query: Dict[str, Any]) -> DeleteResult:
        """Delete a document."""
        for doc_id, doc in list(self.questions.items()):
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                del self.questions[doc_id]
                return DeleteResult(deleted_count=1)
        return DeleteResult(deleted_count=0)


class QuestionsCollection:
    """Collection proxy."""

    def __init__(self):
        self._db = SimpleDB()

    async def insert_one(self, doc: Dict[str, Any]) -> None:
        return await self._db.insert_one(doc)

    async def find(self, query: Dict[str, Any], projection: Optional[Dict] = None):
        return await self._db.find(query, projection)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict] = None) -> Optional[Dict]:
        return await self._db.find_one(query, projection)

    async def delete_one(self, query: Dict[str, Any]) -> DeleteResult:
        return await self._db.delete_one(query)


# Global database instance
class DB:
    questions = QuestionsCollection()


db = DB()
