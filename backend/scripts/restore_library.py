"""
One-time recovery: rebuild the public library from the deck files left in R2 after the database was lost.

The database (deck list) was replaced with an empty one, but the deck JSON files are still in R2 at
<category-slug>/<old-id>.json. New uploads reuse those names (ids restart at 1), so this works in
three separate steps, each safe to re-run:

  1. backup  — download every deck file from R2 (everything except downloads/) into a local folder.
  2. clean   — delete those old deck files from R2. Refuses unless the backup is complete.
  3. import  — upload each backed-up deck through the admin API into its original category.
               Title comes from the deck's "deckTitle" (else the file name); language "en", free.

Usage (run from backend/ with venv active):
  R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=yyy R2_SECRET_ACCESS_KEY=zzz R2_BUCKET=myflashcard \
  python scripts/restore_library.py backup  --dir ~/myflashcard-library-backup
  python scripts/restore_library.py clean   --dir ~/myflashcard-library-backup
  python scripts/restore_library.py import  --dir ~/myflashcard-library-backup \
      --api https://myflashcard-api.onrender.com

Add --dry-run to any step to see what it would do. The import step asks for the admin password
(or reads MYFLASHCARD_ADMIN_TOKEN). Progress is kept in <dir>/manifest.json.
"""
import argparse
import getpass
import json
import os
import sys
from pathlib import Path

import httpx

KEEP_PREFIX = "downloads/"   # Android APK builds — never touched
MANIFEST = "manifest.json"


# ── Helpers ───────────────────────────────────────────────────────────────

def r2_client():
    import boto3
    missing = [k for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY") if not os.environ.get(k)]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)}")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def bucket() -> str:
    return os.environ.get("R2_BUCKET", "myflashcard")


def deck_keys(r2) -> list[dict]:
    """Every object in the bucket except downloads/, as [{key, size}]."""
    keys = []
    for page in r2.get_paginator("list_objects_v2").paginate(Bucket=bucket()):
        for obj in page.get("Contents", []):
            if not obj["Key"].startswith(KEEP_PREFIX) and not obj["Key"].endswith("/"):
                keys.append({"key": obj["Key"], "size": obj["Size"]})
    return keys


def load_manifest(folder: Path) -> dict:
    path = folder / MANIFEST
    if not path.exists():
        sys.exit(f"No {MANIFEST} in {folder} — run the backup step first.")
    return json.loads(path.read_text())


def save_manifest(folder: Path, manifest: dict) -> None:
    (folder / MANIFEST).write_text(json.dumps(manifest, indent=2))


def backup_complete(folder: Path, manifest: dict) -> list[str]:
    """Keys whose local copy is missing or has the wrong size."""
    return [
        o["key"] for o in manifest["objects"]
        if not (folder / o["key"]).is_file() or (folder / o["key"]).stat().st_size != o["size"]
    ]


# ── Steps ─────────────────────────────────────────────────────────────────

def cmd_backup(folder: Path, dry_run: bool) -> None:
    if (folder / MANIFEST).exists() and load_manifest(folder).get("cleaned"):
        sys.exit("R2 was already cleaned — backing up again would overwrite the backup. Use a new --dir.")
    r2 = r2_client()
    objects = deck_keys(r2)
    print(f"{len(objects)} deck file(s) in R2 (excluding {KEEP_PREFIX})")
    for o in objects:
        target = folder / o["key"]
        if target.is_file() and target.stat().st_size == o["size"]:
            print(f"  have      {o['key']}")
            continue
        print(f"  download  {o['key']}")
        if not dry_run:
            target.parent.mkdir(parents=True, exist_ok=True)
            r2.download_file(bucket(), o["key"], str(target))
    if dry_run:
        return
    folder.mkdir(parents=True, exist_ok=True)
    save_manifest(folder, {"objects": objects, "cleaned": False, "imported": {}})
    bad = backup_complete(folder, {"objects": objects})
    print(f"Backup in {folder}: " + ("complete." if not bad else f"{len(bad)} file(s) incomplete: {bad}"))


def cmd_clean(folder: Path, dry_run: bool) -> None:
    manifest = load_manifest(folder)
    if manifest.get("cleaned"):
        print("Already cleaned — nothing to do (a second clean could delete newly imported decks).")
        return
    bad = backup_complete(folder, manifest)
    if bad:
        sys.exit(f"Backup incomplete, not deleting anything. Re-run backup. Missing/wrong size: {bad}")
    r2 = r2_client()
    for o in manifest["objects"]:
        print(f"  delete    {o['key']}")
        if not dry_run:
            r2.delete_object(Bucket=bucket(), Key=o["key"])
    if not dry_run:
        manifest["cleaned"] = True
        save_manifest(folder, manifest)
        print(f"Deleted {len(manifest['objects'])} old deck file(s) from R2. {KEEP_PREFIX} untouched.")


def cmd_import(folder: Path, api: str, dry_run: bool) -> None:
    manifest = load_manifest(folder)
    if not manifest.get("cleaned") and not dry_run:
        sys.exit("Run the clean step first, otherwise new uploads overwrite old files still in R2.")
    api = api.rstrip("/")
    slugs = {c["slug"] for c in httpx.get(f"{api}/categories", timeout=90).json()}
    token = os.environ.get("MYFLASHCARD_ADMIN_TOKEN") or ("" if dry_run else getpass.getpass("Admin password: "))
    headers = {"Authorization": f"Bearer {token}"}

    done, skipped, failed = 0, [], []
    for o in sorted(manifest["objects"], key=lambda o: o["key"]):
        key = o["key"]
        if key in manifest["imported"]:
            print(f"  already   {key} → deck {manifest['imported'][key]}")
            continue
        slug = key.split("/")[0] if "/" in key else ""
        if slug not in slugs:
            skipped.append(f"{key} (no category {slug!r} — create it in Admin → Categories and re-run)")
            continue
        content = (folder / key).read_bytes()
        try:
            title = json.loads(content).get("deckTitle") or Path(key).stem
        except json.JSONDecodeError:
            failed.append(f"{key}: not valid JSON")
            continue
        print(f"  upload    {key} → {slug}: {title}")
        if dry_run:
            continue
        r = httpx.post(
            f"{api}/admin/decks",
            headers=headers,
            data={"category_slug": slug, "title": title, "language": "en", "is_free": "true"},
            files={"json_file": (Path(key).name, content, "application/json")},
            timeout=120,
        )
        if r.status_code == 401:
            sys.exit("Admin password rejected — nothing more uploaded.")
        if r.status_code != 201:
            failed.append(f"{key}: HTTP {r.status_code} {r.text[:200]}")
            continue
        manifest["imported"][key] = r.json()["id"]
        save_manifest(folder, manifest)   # after each deck, so a re-run never uploads twice
        done += 1

    print(f"\nImported {done} deck(s).")
    for line in skipped:
        print(f"  skipped   {line}")
    for line in failed:
        print(f"  failed    {line}")
    if not skipped and not failed:
        print("All done. Fix titles, descriptions and free/premium in Admin → Manage.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("step", choices=["backup", "clean", "import"])
    parser.add_argument("--dir", required=True, type=Path, help="local backup folder")
    parser.add_argument("--api", default="https://myflashcard-api.onrender.com", help="API base URL (import)")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen, change nothing")
    args = parser.parse_args()
    folder = args.dir.expanduser()
    if args.step == "backup":
        cmd_backup(folder, args.dry_run)
    elif args.step == "clean":
        cmd_clean(folder, args.dry_run)
    else:
        cmd_import(folder, args.api, args.dry_run)


if __name__ == "__main__":
    main()
