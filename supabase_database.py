import json
from datetime import datetime

from supabase import create_client


SECTIONS = {"packages", "gallery", "articles", "information", "staff", "contacts"}
ARCHIVABLE_SECTIONS = {"packages", "gallery", "articles", "information", "staff"}


def client(supabase_url, service_role_key):
    url = str(supabase_url).strip().strip("\"'")
    if url.endswith("/"):
        url = url[:-1]
    if not url.startswith("https://") or "/rest/v1" in url.lower():
        raise ValueError(
            "SUPABASE_URL harus memakai URL project dasar, "
            "contoh https://PROJECT-ID.supabase.co, bukan endpoint /rest/v1."
        )
    return create_client(url, str(service_role_key).strip().strip("\"'"))


def initialize_supabase(supabase_url, service_role_key, default_theme):
    if not supabase_url or not service_role_key:
        raise RuntimeError("Konfigurasi Supabase belum lengkap")
    supabase = client(supabase_url, service_role_key)
    try:
        supabase.table("content_items").select("id").limit(1).execute()
    except Exception as exc:
        raise RuntimeError(
            "Koneksi Supabase gagal. Pastikan SUPABASE_URL berisi URL project dasar "
            "(https://PROJECT-ID.supabase.co), schema.sql sudah dijalankan, "
            "dan SUPABASE_SERVICE_ROLE_KEY berasal dari halaman Secret keys. "
            f"Detail: {exc}"
        ) from exc


def authenticate_admin(supabase_url, anon_or_service_key, email, password, service_role_key=None):
    supabase = client(supabase_url, anon_or_service_key)
    try:
        result = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except Exception:
        return None
    user = getattr(result, "user", None)
    if not user:
        return None

    try:
        profile_client = client(
            supabase_url,
            service_role_key or anon_or_service_key,
        )
        profile = (
            profile_client.table("admin_profiles")
            .select("user_id,role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .limit(1)
            .execute()
        )
    except Exception:
        return None
    if not profile.data:
        return None
    return {"user_id": user.id, "email": getattr(user, "email", email)}


def load_content(
    supabase_url,
    service_role_key,
    default_theme,
    include_archived=False,
    include_hidden=False,
):
    supabase = client(supabase_url, service_role_key)
    response = supabase.table("content_items").select(
        "section,id,position,payload,hidden,deleted_at"
    ).order("position").execute()
    content = {section: [] for section in SECTIONS}
    visibility = {
        section: {"active": 0, "visible": 0}
        for section in SECTIONS
    }
    for row in response.data or []:
        section = row["section"]
        if section not in content:
            continue
        if row.get("deleted_at"):
            continue
        visibility[section]["active"] += 1
        if not row.get("hidden"):
            visibility[section]["visible"] += 1
        if row.get("hidden") and not include_hidden:
            continue
        item = dict(row["payload"] or {})
        item["id"] = row["id"]
        item.pop("hidden", None)
        if row["hidden"]:
            item["hidden"] = True
        content[section].append(item)

    archives = {section: [] for section in ARCHIVABLE_SECTIONS}
    if include_archived:
        trash_response = (
            supabase.table("content_items")
            .select("section,id,payload,hidden,deleted_at")
            .not_.is_("deleted_at", "null")
            .order("deleted_at", desc=True)
            .execute()
        )
        for row in trash_response.data or []:
            section = row.get("section")
            if section not in archives:
                continue
            item = dict(row.get("payload") or {})
            item["id"] = row["id"]
            item.pop("deleted_at", None)
            item["archived_at"] = row["deleted_at"]
            archive_metadata = item.pop("_archive_meta", {}) or {}
            if archive_metadata.get("archived_by"):
                item["archived_by"] = archive_metadata["archived_by"]
            if row.get("hidden"):
                item["hidden"] = True
            archives[section].append(item)

    theme_response = supabase.table("site_theme").select("key,value").execute()
    theme = default_theme.copy()
    theme.update({row["key"]: row["value"] for row in (theme_response.data or [])})
    content["theme"] = theme
    content["visibility"] = visibility
    if include_archived:
        content["archives"] = archives
    return dict(content)


def _build_content_rows(content, existing_archives=()):
    archives_by_key = {}
    for row in existing_archives:
        section = row.get("section")
        if section not in ARCHIVABLE_SECTIONS:
            continue
        item = dict(row.get("payload") or {})
        item.pop("deleted_at", None)
        item.update({"id": row["id"], "archived_at": row["deleted_at"]})
        archive_metadata = item.pop("_archive_meta", {}) or {}
        if archive_metadata.get("archived_by"):
            item["archived_by"] = archive_metadata["archived_by"]
        archives_by_key[(section, row["id"])] = item
    for section, items in (content.get("archives") or {}).items():
        if section not in ARCHIVABLE_SECTIONS:
            continue
        for item in items:
            if isinstance(item, dict) and item.get("id"):
                archives_by_key[(section, item["id"])] = dict(item)
    for item in content.get("gallery_trash", []):
        if isinstance(item, dict) and item.get("id"):
            archives_by_key[("gallery", item["id"])] = dict(item)

    active_ids = {
        (section, item.get("id"))
        for section in SECTIONS
        for item in content.get(section, [])
        if isinstance(item, dict) and item.get("id")
    }
    archives = {section: [] for section in ARCHIVABLE_SECTIONS}
    for (section, item_id), item in archives_by_key.items():
        if (section, item_id) not in active_ids:
            archives[section].append(item)

    rows = []
    for section in SECTIONS:
        for position, item in enumerate(content.get(section, [])):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            rows.append({
                "section": section,
                "id": item["id"],
                "position": position,
                "payload": item,
                "hidden": bool(item.get("hidden")),
                "deleted_at": None,
            })
    for section in ARCHIVABLE_SECTIONS:
        for position, item in enumerate(archives[section]):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            stored_item = dict(item)
            archived_at = stored_item.pop("archived_at", None)
            archived_by = stored_item.pop("archived_by", None)
            stored_item.pop("deleted_at", None)
            if archived_by:
                stored_item["_archive_meta"] = {"archived_by": archived_by}
            rows.append({
                "section": section,
                "id": item["id"],
                "position": position,
                "payload": stored_item,
                "hidden": bool(stored_item.get("hidden")),
                "deleted_at": archived_at or datetime.now().isoformat(timespec="seconds"),
            })
    return rows


def _select_all(supabase, table_name, fields, page_size=1000):
    rows = []
    start = 0
    while True:
        response = (
            supabase.table(table_name)
            .select(fields)
            .range(start, start + page_size - 1)
            .execute()
        )
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size:
            return rows
        start += page_size


def merge_missing_content(
    supabase_url,
    service_role_key,
    content,
    default_theme,
    *,
    apply=False,
    transform_item=None,
):
    supabase = client(supabase_url, service_role_key)
    existing_rows = _select_all(
        supabase,
        "content_items",
        "section,id,position,deleted_at",
    )
    existing_keys = {
        (row["section"], row["id"])
        for row in existing_rows
    }
    next_positions = {}
    for section in SECTIONS:
        active_positions = [
            int(row.get("position") or 0)
            for row in existing_rows
            if row["section"] == section and not row.get("deleted_at")
        ]
        next_positions[section] = max(active_positions, default=-1) + 1

    source_rows = _build_content_rows(content)
    source_keys = set()
    rows_to_insert = []
    for row in source_rows:
        key = (row["section"], row["id"])
        if key in source_keys:
            raise ValueError(f"Data lokal memiliki ID duplikat: {key[0]}/{key[1]}")
        source_keys.add(key)
        if key in existing_keys:
            continue
        if row.get("deleted_at") is None:
            row["position"] = next_positions[row["section"]]
            next_positions[row["section"]] += 1
        if apply and transform_item:
            row["payload"] = transform_item(dict(row["payload"]))
            row["hidden"] = bool(row["payload"].get("hidden"))
        rows_to_insert.append(row)

    merged_theme = default_theme.copy()
    merged_theme.update(content.get("theme") or {})
    existing_theme = {
        row["key"]
        for row in _select_all(supabase, "site_theme", "key")
    }
    themes_to_insert = [
        {"key": key, "value": str(value)}
        for key, value in merged_theme.items()
        if key not in existing_theme
    ]

    if apply:
        for start in range(0, len(rows_to_insert), 500):
            supabase.table("content_items").insert(rows_to_insert[start:start + 500]).execute()
        if themes_to_insert:
            supabase.table("site_theme").insert(themes_to_insert).execute()

    return {
        "items_inserted": len(rows_to_insert),
        "items_skipped": len(source_rows) - len(rows_to_insert),
        "theme_keys_inserted": len(themes_to_insert),
        "applied": bool(apply),
    }


def replace_content(supabase_url, service_role_key, content, default_theme):
    supabase = client(supabase_url, service_role_key)
    existing_archives = (
        supabase.table("content_items")
        .select("section,id,payload,deleted_at")
        .not_.is_("deleted_at", "null")
        .execute()
    )
    rows = _build_content_rows(content, existing_archives.data or [])
    supabase.table("content_items").delete().neq("id", "").execute()
    if rows:
        supabase.table("content_items").insert(rows).execute()
    save_theme(supabase_url, service_role_key, content.get("theme") or {}, default_theme)


def save_theme(supabase_url, service_role_key, theme, default_theme):
    supabase = client(supabase_url, service_role_key)
    merged = default_theme.copy()
    merged.update(theme)
    supabase.table("site_theme").upsert([
        {"key": key, "value": str(value)} for key, value in merged.items()
    ], on_conflict="key").execute()
    return merged


def add_item(supabase_url, service_role_key, section, item):
    supabase = client(supabase_url, service_role_key)
    existing = (
        supabase.table("content_items")
        .select("position")
        .eq("section", section)
        .is_("deleted_at", "null")
        .order("position")
        .limit(1)
        .execute()
    )
    position = (existing.data[0]["position"] - 1) if existing.data else 0
    supabase.table("content_items").insert({
        "section": section,
        "id": item["id"],
        "position": position,
        "payload": item,
        "hidden": bool(item.get("hidden")),
        "deleted_at": None,
    }).execute()


def update_item(supabase_url, service_role_key, section, item_id, item):
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .update({"payload": item, "hidden": bool(item.get("hidden"))})
        .eq("section", section)
        .eq("id", item_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return bool(response.data)


def update_content_order(supabase_url, service_role_key, section, ordered_ids):
    if section not in SECTIONS:
        return False
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .select("id,payload,position,hidden,deleted_at")
        .eq("section", section)
        .is_("deleted_at", "null")
        .execute()
    )
    rows_by_id = {row["id"]: row for row in (response.data or [])}
    if len(ordered_ids) != len(rows_by_id) or set(ordered_ids) != set(rows_by_id):
        return False
    reordered_rows = []
    for display_order, item_id in enumerate(ordered_ids):
        row = rows_by_id[item_id]
        item = dict(row.get("payload") or {})
        if section == "staff":
            item["display_order"] = display_order
        reordered_rows.append({
            "section": section,
            "id": item_id,
            "position": display_order,
            "payload": item,
            "hidden": bool(row.get("hidden")),
            "deleted_at": row.get("deleted_at"),
        })
    if not reordered_rows:
        return True
    result = supabase.table("content_items").upsert(
        reordered_rows, on_conflict="section,id"
    ).execute()
    return bool(result.data)


def update_staff_order(supabase_url, service_role_key, ordered_ids):
    return update_content_order(supabase_url, service_role_key, "staff", ordered_ids)


def delete_item(supabase_url, service_role_key, section, item_id):
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .select("payload,hidden")
        .eq("section", section)
        .eq("id", item_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not response.data:
        return False, None
    if section == "gallery":
        deleted_at = datetime.now().isoformat(timespec="seconds")
        item = dict(response.data[0]["payload"] or {})
        item["id"] = item_id
        item["deleted_at"] = deleted_at
        supabase.table("content_items").update({
            "payload": item,
            "hidden": False,
            "deleted_at": deleted_at,
        }).eq("section", section).eq("id", item_id).execute()
        return True, item
    supabase.table("content_items").delete().eq("section", section).eq("id", item_id).execute()
    return True, None


def archive_item(supabase_url, service_role_key, section, item_id, archived_by=None):
    if section not in ARCHIVABLE_SECTIONS:
        return False
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .select("payload")
        .eq("section", section)
        .eq("id", item_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not response.data:
        return False
    item = dict(response.data[0].get("payload") or {})
    item["_archive_meta"] = {"archived_by": archived_by} if archived_by else {}
    updated = (
        supabase.table("content_items")
        .update({
            "payload": item,
            "deleted_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        })
        .eq("section", section)
        .eq("id", item_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return bool(updated.data)


def restore_item(supabase_url, service_role_key, section, item_id):
    if section not in ARCHIVABLE_SECTIONS:
        return False, None
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .select("payload,hidden")
        .eq("section", section)
        .eq("id", item_id)
        .not_.is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not response.data:
        return False, None
    item = dict(response.data[0]["payload"] or {})
    item["id"] = item_id
    item.pop("deleted_at", None)
    item.pop("_archive_meta", None)
    existing = (
        supabase.table("content_items")
        .select("position")
        .eq("section", section)
        .is_("deleted_at", "null")
        .order("position")
        .limit(1)
        .execute()
    )
    position = (existing.data[0]["position"] - 1) if existing.data else 0
    updated = supabase.table("content_items").update({
        "position": position,
        "payload": item,
        "hidden": bool(response.data[0]["hidden"]),
        "deleted_at": None,
    }).eq("section", section).eq("id", item_id).not_.is_("deleted_at", "null").execute()
    return bool(updated.data), item if updated.data else None


def permanently_delete_item(supabase_url, service_role_key, section, item_id):
    if section not in ARCHIVABLE_SECTIONS:
        return False
    supabase = client(supabase_url, service_role_key)
    response = (
        supabase.table("content_items")
        .delete()
        .eq("section", section)
        .eq("id", item_id)
        .not_.is_("deleted_at", "null")
        .execute()
    )
    return bool(response.data)


def restore_gallery_item(supabase_url, service_role_key, item_id):
    return restore_item(supabase_url, service_role_key, "gallery", item_id)


def permanently_delete_gallery_item(supabase_url, service_role_key, item_id):
    return permanently_delete_item(supabase_url, service_role_key, "gallery", item_id)
