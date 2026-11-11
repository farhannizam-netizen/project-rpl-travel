import copy
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import migrate_to_supabase
import supabase_database


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, supabase, table_name):
        self.supabase = supabase
        self.table_name = table_name
        self.fields = None
        self.start = 0
        self.end = None
        self.insert_rows = None

    def select(self, fields):
        self.fields = fields
        return self

    def range(self, start, end):
        self.start = start
        self.end = end
        return self

    def insert(self, rows):
        self.insert_rows = copy.deepcopy(rows)
        return self

    def execute(self):
        if self.insert_rows is not None:
            if self.table_name == "content_items":
                self.supabase.content_rows.extend(self.insert_rows)
            else:
                self.supabase.theme_rows.extend(self.insert_rows)
            return FakeResponse(self.insert_rows)

        rows = (
            self.supabase.content_rows
            if self.table_name == "content_items"
            else self.supabase.theme_rows
        )
        if self.end is not None:
            rows = rows[self.start:self.end + 1]
        if self.fields != "*":
            fields = self.fields.split(",")
            rows = [{field: row[field] for field in fields} for row in rows]
        return FakeResponse(copy.deepcopy(rows))


class FakeSupabase:
    def __init__(self):
        self.content_rows = [
            {
                "section": "packages",
                "id": "shared-package",
                "position": 7,
                "payload": {"title": "Versi Supabase"},
                "hidden": False,
                "deleted_at": None,
            },
            {
                "section": "packages",
                "id": "remote-archive",
                "position": 0,
                "payload": {"title": "Arsip remote"},
                "hidden": False,
                "deleted_at": "2026-01-01T00:00:00",
            },
        ]
        self.theme_rows = [{"key": "primary", "value": "warna remote"}]

    def table(self, name):
        return FakeQuery(self, name)


class SupabaseSafeMigrationTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase()
        self.client_patch = patch.object(
            supabase_database,
            "client",
            return_value=self.supabase,
        )
        self.client_patch.start()
        self.addCleanup(self.client_patch.stop)
        self.content = {
            "packages": [
                {"id": "shared-package", "title": "Versi lokal"},
                {"id": "new-package", "title": "Paket lokal baru"},
            ],
            "gallery": [{"id": "hidden-gallery", "title": "Foto tersembunyi", "hidden": True}],
            "archives": {
                "packages": [
                    {
                        "id": "new-archive",
                        "title": "Arsip lokal baru",
                        "archived_at": "2026-02-01T00:00:00",
                        "archived_by": "admin-lokal",
                    }
                ]
            },
            "theme": {"primary": "warna lokal", "accent": "oranye"},
        }

    def test_apply_inserts_only_missing_rows_and_preserves_remote_records(self):
        transformed = []

        def transform_item(item):
            transformed.append(item["id"])
            item["image"] = "https://storage.example/new-image"
            return item

        result = supabase_database.merge_missing_content(
            "https://example.supabase.co",
            "service-key",
            self.content,
            {"primary": "default", "background": "cream"},
            apply=True,
            transform_item=transform_item,
        )

        self.assertEqual(result["items_inserted"], 3)
        self.assertEqual(result["items_skipped"], 1)
        self.assertEqual(result["theme_keys_inserted"], 2)
        self.assertTrue(result["applied"])
        self.assertCountEqual(
            transformed,
            ["new-package", "hidden-gallery", "new-archive"],
        )

        shared = next(row for row in self.supabase.content_rows if row["id"] == "shared-package")
        self.assertEqual(shared["payload"]["title"], "Versi Supabase")
        self.assertEqual(shared["position"], 7)
        remote_archive = next(row for row in self.supabase.content_rows if row["id"] == "remote-archive")
        self.assertEqual(remote_archive["payload"]["title"], "Arsip remote")

        new_package = next(row for row in self.supabase.content_rows if row["id"] == "new-package")
        self.assertEqual(new_package["position"], 8)
        hidden_gallery = next(row for row in self.supabase.content_rows if row["id"] == "hidden-gallery")
        self.assertTrue(hidden_gallery["hidden"])
        self.assertTrue(hidden_gallery["payload"]["hidden"])
        new_archive = next(row for row in self.supabase.content_rows if row["id"] == "new-archive")
        self.assertEqual(new_archive["deleted_at"], "2026-02-01T00:00:00")
        self.assertEqual(new_archive["payload"]["_archive_meta"]["archived_by"], "admin-lokal")

        theme = {row["key"]: row["value"] for row in self.supabase.theme_rows}
        self.assertEqual(theme, {
            "primary": "warna remote",
            "background": "cream",
            "accent": "oranye",
        })

    def test_default_dry_run_does_not_write_or_transform(self):
        transformed = []
        initial_content = copy.deepcopy(self.supabase.content_rows)
        initial_theme = copy.deepcopy(self.supabase.theme_rows)

        result = supabase_database.merge_missing_content(
            "https://example.supabase.co",
            "service-key",
            self.content,
            {"primary": "default", "background": "cream"},
            transform_item=lambda item: transformed.append(item),
        )

        self.assertFalse(result["applied"])
        self.assertEqual(result["items_inserted"], 3)
        self.assertEqual(result["items_skipped"], 1)
        self.assertEqual(transformed, [])
        self.assertEqual(self.supabase.content_rows, initial_content)
        self.assertEqual(self.supabase.theme_rows, initial_theme)

    def test_merge_is_idempotent_and_rejects_duplicate_local_ids(self):
        first = supabase_database.merge_missing_content(
            "https://example.supabase.co",
            "service-key",
            self.content,
            {},
            apply=True,
        )
        second = supabase_database.merge_missing_content(
            "https://example.supabase.co",
            "service-key",
            self.content,
            {},
            apply=True,
        )

        self.assertEqual(first["items_inserted"], 3)
        self.assertEqual(second["items_inserted"], 0)
        self.assertEqual(second["theme_keys_inserted"], 0)

        duplicate_content = {
            **self.content,
            "packages": [
                {"id": "duplicate", "title": "Pertama"},
                {"id": "duplicate", "title": "Kedua"},
            ],
        }
        with self.assertRaisesRegex(ValueError, "ID duplikat"):
            supabase_database.merge_missing_content(
                "https://example.supabase.co",
                "service-key",
                duplicate_content,
                {},
            )


class LocalMigrationSourceTests(unittest.TestCase):
    def test_existing_sqlite_database_is_upgraded_before_loading_archives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_file = Path(temp_dir) / "old-content.db"
            json_file = Path(temp_dir) / "missing-content.json"
            connection = sqlite3.connect(db_file)
            try:
                connection.executescript(
                    """
                    CREATE TABLE content_items (
                        section TEXT NOT NULL,
                        id TEXT NOT NULL,
                        position INTEGER NOT NULL DEFAULT 0,
                        payload TEXT NOT NULL,
                        hidden INTEGER NOT NULL DEFAULT 0,
                        deleted_at TEXT,
                        PRIMARY KEY (section, id)
                    );
                    INSERT INTO content_items
                        (section, id, position, payload, hidden, deleted_at)
                    VALUES ('packages', 'existing', 4, '{"id":"existing","title":"Paket lama"}', 0, NULL);
                    CREATE TABLE site_theme (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                    """
                )
            finally:
                connection.close()

            content, source = migrate_to_supabase.load_local_content(db_file, json_file)

            self.assertEqual(source, "SQLite")
            self.assertEqual(content["packages"], [{"title": "Paket lama", "id": "existing"}])
            connection = sqlite3.connect(db_file)
            try:
                columns = {
                    row[1] for row in connection.execute("PRAGMA table_info(content_items)")
                }
            finally:
                connection.close()
            self.assertIn("archived_by", columns)


if __name__ == "__main__":
    unittest.main()
