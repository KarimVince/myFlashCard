"""
Storage backend — Cloudflare R2 in production, local disk in dev.

R2 is S3-compatible; we use boto3 with a custom endpoint.
Local files land in  backend/local_storage/<bucket>/<path>
and are served by FastAPI at  http://localhost:8000/local-storage/<path>
"""
from pathlib import Path

from app.config import settings

# ── Local storage helpers ─────────────────────────────────────────────────

_LOCAL_ROOT = Path(__file__).parent.parent / "local_storage"


def _is_local() -> bool:
    return not settings.r2_access_key_id or settings.r2_access_key_id == "local"


def _local_path(storage_path: str) -> Path:
    p = _LOCAL_ROOT / settings.r2_bucket / storage_path
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _local_url(storage_path: str) -> str:
    return f"http://localhost:8000/local-storage/{settings.r2_bucket}/{storage_path}"


# ── R2 / boto3 client (lazy) ──────────────────────────────────────────────

_r2_client = None


def _get_r2():
    global _r2_client
    if _r2_client is None:
        import boto3
        _r2_client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    return _r2_client


def _public_url(storage_path: str) -> str:
    base = settings.r2_public_url.rstrip("/")
    return f"{base}/{storage_path}"


# ── Public API ────────────────────────────────────────────────────────────

def upload_deck(category_slug: str, deck_id: int, content: bytes) -> tuple[str, str]:
    """Upload JSON content. Returns (storage_path, public_url)."""
    path = f"{category_slug}/{deck_id}.json"
    if _is_local():
        _local_path(path).write_bytes(content)
        return path, _local_url(path)
    _get_r2().put_object(
        Bucket=settings.r2_bucket,
        Key=path,
        Body=content,
        ContentType="application/json",
    )
    return path, _public_url(path)


def delete_deck(storage_path: str) -> None:
    """Remove a file (best-effort; ignores not-found)."""
    if _is_local():
        _local_path(storage_path).unlink(missing_ok=True)
        return
    _get_r2().delete_object(Bucket=settings.r2_bucket, Key=storage_path)


def upload_build(filename: str, content: bytes, content_type: str) -> str:
    """Upload an app build (APK, AAB, IPA) to downloads/. Returns public URL."""
    path = f"downloads/{filename}"
    if _is_local():
        _local_path(path).write_bytes(content)
        return _local_url(path)
    _get_r2().put_object(
        Bucket=settings.r2_bucket,
        Key=path,
        Body=content,
        ContentType=content_type,
    )
    return _public_url(path)


def list_builds() -> list[dict]:
    """Return [{filename, size_mb, url}] for all files in downloads/."""
    prefix = "downloads/"
    if _is_local():
        folder = _LOCAL_ROOT / settings.r2_bucket / "downloads"
        if not folder.exists():
            return []
        items = []
        for p in sorted(folder.iterdir()):
            if p.is_file():
                items.append({
                    "filename": p.name,
                    "size_mb": round(p.stat().st_size / 1_048_576, 2),
                    "url": _local_url(f"downloads/{p.name}"),
                })
        return items
    r2 = _get_r2()
    resp = r2.list_objects_v2(Bucket=settings.r2_bucket, Prefix=prefix)
    items = []
    for obj in resp.get("Contents", []):
        key: str = obj["Key"]
        filename = key[len(prefix):]
        if not filename:
            continue
        items.append({
            "filename": filename,
            "size_mb": round(obj["Size"] / 1_048_576, 2),
            "url": _public_url(key),
        })
    return items


def delete_build(filename: str) -> None:
    """Remove a file from downloads/."""
    path = f"downloads/{filename}"
    if _is_local():
        _local_path(path).unlink(missing_ok=True)
        return
    _get_r2().delete_object(Bucket=settings.r2_bucket, Key=path)


def replace_deck(storage_path: str, content: bytes) -> str:
    """Replace an existing file and return its public URL."""
    if _is_local():
        _local_path(storage_path).write_bytes(content)
        return _local_url(storage_path)
    _get_r2().put_object(
        Bucket=settings.r2_bucket,
        Key=storage_path,
        Body=content,
        ContentType="application/json",
    )
    return _public_url(storage_path)
