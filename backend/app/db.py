from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
_kwargs: dict = {"check_same_thread": False} if _is_sqlite else {"pool_pre_ping": True}
engine = create_engine(settings.database_url, connect_args=_kwargs if _is_sqlite else {}, pool_pre_ping=not _is_sqlite)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
