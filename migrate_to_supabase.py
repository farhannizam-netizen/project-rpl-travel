import argparse
import hashlib
import os
from pathlib import Path

from dotenv import load_dotenv

import database
import supabase_database
import supabase_storage


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "data" / "kurmatravel.db"
JSON_FILE = BASE_DIR / "data" / "cms.json"

DEFAULT_THEME = {
    "primary": "#e87824",
    "primary_dark": "#bd5416",
    "navbar": "#f18b3c",
    "green": "#244b3a",
    "green_dark": "#173528",
    "background": "#fffdf9",
}


def load_local_content(db_file=DB_FILE, json_file=JSON_FILE):
    if db_file.exists():
        database.initialize_database(db_file, json_file, lambda: {})
        return database.load_content(
            db_file,
            DEFAULT_THEME,
            include_archived=True,
            include_hidden=True,
        ), "SQLite"
    if json_file.exists():
        import json

        return json.loads(json_file.read_text(encoding="utf-8")), "JSON"
    raise SystemExit("Tidak ada data SQLite atau JSON untuk dimigrasikan.")


def main():
    parser = argparse.ArgumentParser(description="Import local CMS data into Supabase without replacing remote rows.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Insert local records whose (section, id) do not already exist. Default is dry-run.",
    )
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not service_role_key:
        raise SystemExit(
            "Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sebelum menjalankan migrasi."
        )

    upload_dir = BASE_DIR / "kurmatravel" / "static" / "uploads"

    content, source = load_local_content()

    supabase_database.initialize_supabase(supabase_url, service_role_key, DEFAULT_THEME)

    def migrate_upload_urls(value):
        if isinstance(value, dict):
            return {key: migrate_upload_urls(item) for key, item in value.items()}
        if isinstance(value, list):
            return [migrate_upload_urls(item) for item in value]
        if not isinstance(value, str) or "/static/uploads/" not in value:
            return value

        filename = value.rsplit("/static/uploads/", 1)[-1].split("?", 1)[0]
        filename = Path(filename.replace("\\", "/")).name
        local_file = upload_dir / filename
        if not local_file.is_file():
            raise FileNotFoundError(
                f"File upload lokal yang dibutuhkan konten baru tidak ditemukan: {filename}"
            )
        file_bytes = local_file.read_bytes()
        extension = local_file.suffix.lower()
        content_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".pdf": "application/pdf",
        }
        return supabase_storage.upload_public_file(
            supabase_url,
            service_role_key,
            f"imports/{hashlib.sha256(file_bytes).hexdigest()[:24]}/{filename}",
            file_bytes,
            content_types.get(extension, "application/octet-stream"),
        )

    result = supabase_database.merge_missing_content(
        supabase_url,
        service_role_key,
        content,
        DEFAULT_THEME,
        apply=args.apply,
        transform_item=migrate_upload_urls if args.apply else None,
    )
    action = "ditambahkan" if args.apply else "akan ditambahkan"
    print(f"Sumber data lokal: {source}")
    print(f"Konten {action}: {result['items_inserted']}")
    print(f"Konten lokal dilewati karena ID sudah ada: {result['items_skipped']}")
    print(f"Kunci tema baru {action}: {result['theme_keys_inserted']}")
    if not args.apply:
        print("Dry run: Supabase belum diubah. Jalankan dengan --apply untuk menerapkan merge aman.")


if __name__ == "__main__":
    main()
