import json
import sqlite3
from datetime import datetime
from pathlib import Path


SECTIONS = {"packages", "gallery", "articles", "information", "staff", "contacts"}
ARCHIVABLE_SECTIONS = {"packages", "gallery", "articles", "information", "staff"}


def connect(db_file):
    connection = sqlite3.connect(db_file, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database(db_file, json_file, default_content_factory):
    db_file = Path(db_file)
    json_file = Path(json_file)
    db_file.parent.mkdir(parents=True, exist_ok=True)

    connection = connect(db_file)
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS content_items (
            section TEXT NOT NULL,
            id TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            hidden INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            archived_by TEXT,
            PRIMARY KEY (section, id)
        );

        CREATE TABLE IF NOT EXISTS site_theme (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )
    columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(content_items)")
    }
    if "archived_by" not in columns:
        connection.execute("ALTER TABLE content_items ADD COLUMN archived_by TEXT")
    connection.commit()

    has_items = connection.execute("SELECT 1 FROM content_items LIMIT 1").fetchone()
    has_theme = connection.execute("SELECT 1 FROM site_theme LIMIT 1").fetchone()
    if not has_items and not has_theme and json_file.exists():
        try:
            source = json.loads(json_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            source = default_content_factory()
        migrate_content(connection, source)
    elif not has_items and not has_theme:
        migrate_content(connection, default_content_factory())

    connection.close()
    return db_file


def migrate_content(connection, content):
    for section in SECTIONS:
        items = content.get(section, [])
        if not isinstance(items, list):
            continue
        for position, item in enumerate(items):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            payload = json.dumps(item, ensure_ascii=False)
            connection.execute(
                """
                INSERT OR REPLACE INTO content_items
                (section, id, position, payload, hidden, deleted_at)
                VALUES (?, ?, ?, ?, ?, NULL)
                """,
                (section, item["id"], position, payload, 1 if item.get("hidden") else 0),
            )

    for item in content.get("gallery_trash", []):
        if isinstance(item, dict) and item.get("id"):
            connection.execute(
                """
                INSERT OR REPLACE INTO content_items
                (section, id, position, payload, hidden, deleted_at, archived_by)
                VALUES ('gallery', ?, 0, ?, 0, ?, NULL)
                """,
                (
                    item["id"],
                    json.dumps(item, ensure_ascii=False),
                    item.get("deleted_at") or datetime.now().isoformat(timespec="seconds"),
                ),
            )

    for key, value in (content.get("theme") or {}).items():
        connection.execute(
            "INSERT OR REPLACE INTO site_theme (key, value) VALUES (?, ?)",
            (key, str(value)),
        )
    connection.commit()


def load_content(db_file, default_theme, include_archived=False, include_hidden=False):
    connection = connect(db_file)
    content = {section: [] for section in SECTIONS}
    visibility = {
        section: {"active": 0, "visible": 0}
        for section in SECTIONS
    }
    for section in SECTIONS:
        rows = connection.execute(
            """
            SELECT payload, hidden FROM content_items
            WHERE section = ? AND deleted_at IS NULL
            ORDER BY position ASC
            """,
            (section,),
        ).fetchall()
        for row in rows:
            try:
                visibility[section]["active"] += 1
                if not row["hidden"]:
                    visibility[section]["visible"] += 1
                if row["hidden"] and not include_hidden:
                    continue
                item = json.loads(row["payload"])
                item.pop("hidden", None)
                if row["hidden"]:
                    item["hidden"] = True
                content[section].append(item)
            except json.JSONDecodeError:
                continue

    archives = {section: [] for section in ARCHIVABLE_SECTIONS}
    if include_archived:
        archived_rows = connection.execute(
            """
            SELECT section, payload, deleted_at, archived_by FROM content_items
            WHERE deleted_at IS NOT NULL AND section IN (?, ?, ?, ?, ?)
            ORDER BY deleted_at DESC
            """,
            tuple(sorted(ARCHIVABLE_SECTIONS)),
        ).fetchall()
        for row in archived_rows:
            try:
                item = json.loads(row["payload"])
                item.pop("deleted_at", None)
                item["archived_at"] = row["deleted_at"]
                if row["archived_by"]:
                    item["archived_by"] = row["archived_by"]
                archives[row["section"]].append(item)
            except json.JSONDecodeError:
                continue

    theme_rows = connection.execute("SELECT key, value FROM site_theme").fetchall()
    theme = default_theme.copy()
    theme.update({row["key"]: row["value"] for row in theme_rows})

    connection.close()
    content["theme"] = theme
    content["visibility"] = visibility
    if include_archived:
        content["archives"] = archives
    return dict(content)


def replace_content(db_file, content, default_theme):
    connection = connect(db_file)
    connection.execute("BEGIN IMMEDIATE")
    archives_by_key = {}
    existing_archives = connection.execute(
        """
        SELECT section, id, payload, deleted_at, archived_by FROM content_items
        WHERE deleted_at IS NOT NULL AND section IN (?, ?, ?, ?, ?)
        """,
        tuple(sorted(ARCHIVABLE_SECTIONS)),
    ).fetchall()
    for row in existing_archives:
        try:
            item = json.loads(row["payload"])
        except json.JSONDecodeError:
            continue
        item.pop("deleted_at", None)
        item.update({"id": row["id"], "archived_at": row["deleted_at"]})
        if row["archived_by"]:
            item["archived_by"] = row["archived_by"]
        archives_by_key[(row["section"], row["id"])] = item
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

    connection.execute("DELETE FROM content_items")
    for section in SECTIONS:
        for position, item in enumerate(content.get(section, [])):
            if not isinstance(item, dict):
                continue
            item_id = item.get("id") or ""
            if not item_id:
                continue
            connection.execute(
                """
                INSERT INTO content_items
                (section, id, position, payload, hidden, deleted_at, archived_by)
                VALUES (?, ?, ?, ?, ?, NULL, NULL)
                """,
                (
                    section,
                    item_id,
                    position,
                    json.dumps(item, ensure_ascii=False),
                    1 if item.get("hidden") else 0,
                ),
            )
    for section in ARCHIVABLE_SECTIONS:
        for position, item in enumerate(archives[section]):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            stored_item = dict(item)
            archived_at = stored_item.pop("archived_at", None)
            archived_by = stored_item.pop("archived_by", None)
            stored_item.pop("deleted_at", None)
            connection.execute(
                """
                INSERT INTO content_items
                (section, id, position, payload, hidden, deleted_at, archived_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    section,
                    item["id"],
                    position,
                    json.dumps(stored_item, ensure_ascii=False),
                    1 if stored_item.get("hidden") else 0,
                    archived_at or datetime.now().isoformat(timespec="seconds"),
                    archived_by,
                ),
            )
    connection.execute("DELETE FROM site_theme")
    theme = default_theme.copy()
    theme.update(content.get("theme") or {})
    for key, value in theme.items():
        connection.execute(
            "INSERT INTO site_theme (key, value) VALUES (?, ?)",
            (key, str(value)),
        )
    connection.commit()
    connection.close()


def save_theme(db_file, theme, default_theme):
    connection = connect(db_file)
    merged_theme = default_theme.copy()
    merged_theme.update(theme)
    connection.execute("BEGIN")
    connection.execute("DELETE FROM site_theme")
    for key, value in merged_theme.items():
        connection.execute(
            "INSERT INTO site_theme (key, value) VALUES (?, ?)",
            (key, str(value)),
        )
    connection.commit()
    connection.close()
    return merged_theme


def add_item(db_file, section, item):
    connection = connect(db_file)
    row = connection.execute(
        "SELECT COALESCE(MIN(position) - 1, 0) FROM content_items WHERE section = ? AND deleted_at IS NULL",
        (section,),
    ).fetchone()
    connection.execute(
        """
        INSERT INTO content_items
        (section, id, position, payload, hidden, deleted_at)
        VALUES (?, ?, ?, ?, ?, NULL)
        """,
        (
            section,
            item["id"],
            row[0],
            json.dumps(item, ensure_ascii=False),
            1 if item.get("hidden") else 0,
        ),
    )
    connection.commit()
    connection.close()


def update_item(db_file, section, item_id, item):
    connection = connect(db_file)
    cursor = connection.execute(
        """
        UPDATE content_items
        SET payload = ?, hidden = ?
        WHERE section = ? AND id = ? AND deleted_at IS NULL
        """,
        (
            json.dumps(item, ensure_ascii=False),
            1 if item.get("hidden") else 0,
            section,
            item_id,
        ),
    )
    connection.commit()
    updated = cursor.rowcount > 0
    connection.close()
    return updated


def update_content_order(db_file, section, ordered_ids):
    if section not in SECTIONS:
        return False
    connection = connect(db_file)
    try:
        connection.execute("BEGIN IMMEDIATE")
        rows = connection.execute(
            """
            SELECT id, payload FROM content_items
            WHERE section = ? AND deleted_at IS NULL
            """,
            (section,),
        ).fetchall()
        items = {row["id"]: json.loads(row["payload"]) for row in rows}
        if len(ordered_ids) != len(items) or set(ordered_ids) != set(items):
            connection.rollback()
            return False
        for display_order, item_id in enumerate(ordered_ids):
            item = items[item_id]
            if section == "staff":
                item["display_order"] = display_order
            connection.execute(
                """
                UPDATE content_items SET position = ?, payload = ?
                WHERE section = ? AND id = ? AND deleted_at IS NULL
                """,
                (
                    display_order,
                    json.dumps(item, ensure_ascii=False),
                    section,
                    item_id,
                ),
            )
        connection.commit()
        return True
    finally:
        connection.close()


def update_staff_order(db_file, ordered_ids):
    return update_content_order(db_file, "staff", ordered_ids)


def delete_item(db_file, section, item_id):
    connection = connect(db_file)
    row = connection.execute(
        "SELECT payload FROM content_items WHERE section = ? AND id = ? AND deleted_at IS NULL",
        (section, item_id),
    ).fetchone()
    if not row:
        connection.close()
        return False, None

    if section == "gallery":
        deleted_at = datetime.now().isoformat(timespec="seconds")
        item = json.loads(row["payload"])
        item["deleted_at"] = deleted_at
        connection.execute(
            "UPDATE content_items SET payload = ?, hidden = 0, deleted_at = ? WHERE section = ? AND id = ?",
            (json.dumps(item, ensure_ascii=False), deleted_at, section, item_id),
        )
        result = True
    else:
        connection.execute(
            "DELETE FROM content_items WHERE section = ? AND id = ?",
            (section, item_id),
        )
        result = True
        item = None
    connection.commit()
    connection.close()
    return result, item


def archive_item(db_file, section, item_id, archived_by=None):
    if section not in ARCHIVABLE_SECTIONS:
        return False
    connection = connect(db_file)
    try:
        connection.execute("BEGIN IMMEDIATE")
        cursor = connection.execute(
            """
            UPDATE content_items
            SET deleted_at = ?, archived_by = ?
            WHERE section = ? AND id = ? AND deleted_at IS NULL
            """,
            (
                datetime.now().isoformat(timespec="seconds"),
                archived_by,
                section,
                item_id,
            ),
        )
        connection.commit()
        return cursor.rowcount > 0
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def restore_item(db_file, section, item_id):
    if section not in ARCHIVABLE_SECTIONS:
        return False, None
    connection = connect(db_file)
    try:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            """
            SELECT payload, hidden FROM content_items
            WHERE section = ? AND id = ? AND deleted_at IS NOT NULL
            """,
            (section, item_id),
        ).fetchone()
        if not row:
            connection.rollback()
            return False, None
        item = json.loads(row["payload"])
        item.pop("deleted_at", None)
        position_row = connection.execute(
            """
            SELECT COALESCE(MIN(position) - 1, 0) FROM content_items
            WHERE section = ? AND deleted_at IS NULL
            """,
            (section,),
        ).fetchone()
        cursor = connection.execute(
            """
            UPDATE content_items
            SET position = ?, payload = ?, hidden = ?, deleted_at = NULL, archived_by = NULL
            WHERE section = ? AND id = ? AND deleted_at IS NOT NULL
            """,
            (
                position_row[0],
                json.dumps(item, ensure_ascii=False),
                row["hidden"],
                section,
                item_id,
            ),
        )
        if cursor.rowcount != 1:
            connection.rollback()
            return False, None
        connection.commit()
        return True, item
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def permanently_delete_item(db_file, section, item_id):
    if section not in ARCHIVABLE_SECTIONS:
        return False
    connection = connect(db_file)
    try:
        cursor = connection.execute(
            """
            DELETE FROM content_items
            WHERE section = ? AND id = ? AND deleted_at IS NOT NULL
            """,
            (section, item_id),
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def restore_gallery_item(db_file, item_id):
    return restore_item(db_file, "gallery", item_id)


def permanently_delete_gallery_item(db_file, item_id):
    return permanently_delete_item(db_file, "gallery", item_id)
