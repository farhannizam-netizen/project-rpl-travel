import unittest
from unittest.mock import patch

import supabase_database


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.filters = {}
        self.update_values = None
        self.negate_next_filter = False
        self.archived_query = False

    @property
    def not_(self):
        self.negate_next_filter = True
        return self

    def select(self, fields):
        if self.table_name == "content_items":
            self.database.selected_fields.append(fields)
            if "archived_by" in fields.split(","):
                raise AssertionError("Supabase query must not require archived_by column")
        return self

    def update(self, values):
        self.update_values = values
        return self

    def eq(self, field, value):
        self.filters[field] = value
        return self

    def is_(self, field, value):
        if self.negate_next_filter:
            self.archived_query = True
            self.negate_next_filter = False
        self.filters[field] = value
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args):
        return self

    def execute(self):
        if self.table_name == "site_theme":
            return FakeResponse([])
        if self.update_values is not None:
            for row in self.database.rows:
                if row["section"] == self.filters.get("section") and row["id"] == self.filters.get("id"):
                    row.update(self.update_values)
                    return FakeResponse([row])
            return FakeResponse([])
        if self.archived_query:
            return FakeResponse([row for row in self.database.rows if row.get("deleted_at")])
        return FakeResponse([row for row in self.database.rows if not row.get("deleted_at")])


class FakeSupabase:
    def __init__(self):
        self.selected_fields = []
        self.rows = [
            {
                "section": "packages",
                "id": "active-package",
                "position": 0,
                "payload": {"title": "Paket aktif"},
                "hidden": False,
                "deleted_at": None,
            },
            {
                "section": "staff",
                "id": "hidden-staff",
                "position": 0,
                "payload": {"title": "Staf tersembunyi"},
                "hidden": True,
                "deleted_at": None,
            },
            {
                "section": "packages",
                "id": "archived-package",
                "position": 1,
                "payload": {
                    "title": "Paket arsip",
                    "_archive_meta": {"archived_by": "admin@example.com"},
                },
                "hidden": False,
                "deleted_at": "2026-11-11T00:00:00",
            },
        ]

    def table(self, name):
        return FakeQuery(self, name)


class SupabaseArchiveCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase()
        self.client_patch = patch.object(
            supabase_database,
            "client",
            return_value=self.supabase,
        )
        self.client_patch.start()
        self.addCleanup(self.client_patch.stop)

    def test_content_load_works_without_archived_by_column(self):
        content = supabase_database.load_content("https://example.supabase.co", "key", {}, include_archived=True)

        self.assertEqual([item["id"] for item in content["packages"]], ["active-package"])
        self.assertEqual(content["staff"], [])
        self.assertEqual(content["visibility"]["staff"], {"active": 1, "visible": 0})
        archived = content["archives"]["packages"][0]
        self.assertEqual(archived["archived_by"], "admin@example.com")
        self.assertNotIn("_archive_meta", archived)

        admin_content = supabase_database.load_content(
            "https://example.supabase.co",
            "key",
            {},
            include_hidden=True,
        )
        self.assertEqual([item["id"] for item in admin_content["staff"]], ["hidden-staff"])
        self.assertTrue(admin_content["staff"][0]["hidden"])

    def test_archive_action_stores_actor_without_optional_database_column(self):
        archived = supabase_database.archive_item(
            "https://example.supabase.co",
            "key",
            "packages",
            "active-package",
            "admin@example.com",
        )

        self.assertTrue(archived)
        row = next(row for row in self.supabase.rows if row["id"] == "active-package")
        self.assertIn("archived_by", row["payload"]["_archive_meta"])
        self.assertTrue(row["deleted_at"])


if __name__ == "__main__":
    unittest.main()
