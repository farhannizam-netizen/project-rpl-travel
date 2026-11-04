import os
from pathlib import Path

from dotenv import load_dotenv

from supabase_database import client, load_content


load_dotenv(
    dotenv_path=Path(__file__).resolve().with_name(".env"),
    override=os.environ.get("RENDER") is None,
)


def main():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SystemExit("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi.")

    supabase = client(url, key)
    active = (
        supabase.table("content_items")
        .select("section,id,hidden")
        .eq("section", "gallery")
        .is_("deleted_at", "null")
        .execute()
    )
    trash = (
        supabase.table("content_items")
        .select("id")
        .eq("section", "gallery")
        .not_.is_("deleted_at", "null")
        .execute()
    )
    theme = supabase.table("site_theme").select("key").limit(1).execute()
    content = load_content(url, key, {})

    rows = active.data or []
    visible = sum(1 for row in rows if not row["hidden"])
    hidden = sum(1 for row in rows if row["hidden"])
    print("Koneksi dan API key Supabase: OK")
    print(f"Akses tabel site_theme: OK ({len(theme.data or [])} warna)")
    for section in ("packages", "gallery", "articles", "information", "staff", "contacts"):
        print(f"{section}: {len(content.get(section, []))}")
    print(f"Galeri aktif: {len(rows)}")
    print(f"Galeri terlihat publik: {visible}")
    print(f"Galeri tersembunyi: {hidden}")
    print(f"Galeri sampah: {len(trash.data or [])}")


if __name__ == "__main__":
    main()
