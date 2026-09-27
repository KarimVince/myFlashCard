"""
One-time migration: copy deck JSON files from Supabase Storage → Cloudflare R2.

Usage (run from backend/ with venv active):
  R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=yyy R2_SECRET_ACCESS_KEY=zzz \
  R2_BUCKET=myflashcard R2_PUBLIC_URL=https://pub-xxx.r2.dev \
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... \
  python scripts/migrate_supabase_to_r2.py

Or set all vars in .env and just run:
  python scripts/migrate_supabase_to_r2.py
"""
import sys
from pathlib import Path

# Make app importable
sys.path.insert(0, str(Path(__file__).parent.parent))

import boto3
from supabase import create_client
from app.config import settings


def main():
    if not settings.supabase_url or "fake" in settings.supabase_url:
        print("ERROR: SUPABASE_URL not set — nothing to migrate.")
        sys.exit(1)
    if not settings.r2_access_key_id or settings.r2_access_key_id == "local":
        print("ERROR: R2_ACCESS_KEY_ID not set — cannot upload.")
        sys.exit(1)

    sb = create_client(settings.supabase_url, settings.supabase_service_key)
    r2 = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )

    bucket = settings.storage_bucket  # Supabase bucket name (deck-json)
    r2_bucket = settings.r2_bucket

    # List all files in Supabase bucket (paginate if needed)
    files = sb.storage.from_(bucket).list("", {"limit": 1000, "offset": 0})
    if not files:
        print("No files found in Supabase bucket.")
        return

    # Supabase list() returns top-level folders; recurse one level
    all_paths: list[str] = []
    for item in files:
        if item.get("id") is None:  # it's a folder
            folder = item["name"]
            children = sb.storage.from_(bucket).list(folder, {"limit": 1000})
            for child in children:
                all_paths.append(f"{folder}/{child['name']}")
        else:
            all_paths.append(item["name"])

    print(f"Found {len(all_paths)} files to migrate.")

    ok = 0
    for path in all_paths:
        try:
            data = sb.storage.from_(bucket).download(path)
            r2.put_object(
                Bucket=r2_bucket,
                Key=path,
                Body=data,
                ContentType="application/json",
            )
            print(f"  ✓  {path}")
            ok += 1
        except Exception as e:
            print(f"  ✗  {path}  —  {e}")

    print(f"\nMigrated {ok}/{len(all_paths)} files to R2 bucket '{r2_bucket}'.")


if __name__ == "__main__":
    main()
