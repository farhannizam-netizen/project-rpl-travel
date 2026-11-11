import tempfile
import unittest
from pathlib import Path

import database
import supabase_database


_initialize_database = database.initialize_database
_initialize_supabase = supabase_database.initialize_supabase
database.initialize_database = lambda *args, **kwargs: None
supabase_database.initialize_supabase = lambda *args, **kwargs: None
try:
    import app as app_module
finally:
    database.initialize_database = _initialize_database
    supabase_database.initialize_supabase = _initialize_supabase

app_module.USE_SUPABASE = False


class ArchiveApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        app_module.DB_FILE = Path(self.temp_dir.name) / "api-content.db"
        self.content = {
            "packages": [{"id": "package-api", "title": "Umrah API"}],
            "gallery": [{"id": "gallery-api", "title": "Foto API", "hidden": True}],
            "articles": [{"id": "article-api", "title": "Artikel API", "url": "/artikel-tips"}],
            "information": [{"id": "information-api", "title": "Informasi API"}],
            "staff": [{"id": "staff-api", "title": "Staf API"}],
            "contacts": [{"id": "contact-api", "title": "Kontak Perusahaan"}],
            "theme": {},
        }
        database.initialize_database(app_module.DB_FILE, Path(self.temp_dir.name) / "empty.json", lambda: self.content)
        database.replace_content(app_module.DB_FILE, self.content, {})
        self.client = app_module.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def authenticate(self):
        with self.client.session_transaction() as session:
            session["admin_logged_in"] = True
            session["admin_username"] = "archive-test-admin"

    def test_archive_routes_require_admin(self):
        self.assertEqual(self.client.get("/api/admin/content").status_code, 401)
        self.assertEqual(
            self.client.delete("/api/admin/content/packages/package-api").status_code,
            401,
        )
        self.assertEqual(
            database.load_content(app_module.DB_FILE, {})["packages"][0]["id"],
            "package-api",
        )

    def test_all_archivable_modules_support_archive_restore_and_permanent_delete(self):
        self.authenticate()
        for section in sorted(database.ARCHIVABLE_SECTIONS):
            item_id = self.content[section][0]["id"]
            archive_response = self.client.delete(f"/api/admin/content/{section}/{item_id}")
            self.assertEqual(archive_response.status_code, 200, archive_response.get_json())

            public_content = self.client.get("/api/content").get_json()
            self.assertNotIn("archives", public_content)
            self.assertNotIn("gallery_trash", public_content)
            self.assertNotIn(item_id, [item["id"] for item in public_content[section]])
            admin_content = self.client.get("/api/admin/content").get_json()
            archived = next(
                item for item in admin_content["archives"][section]
                if item["id"] == item_id
            )
            self.assertEqual(archived["archived_by"], "archive-test-admin")
            self.assertTrue(archived["archived_at"])

            if section == "articles":
                self.assertEqual(
                    self.client.get("/api/page/artikel-tips.html").status_code,
                    404,
                )

            restore_response = self.client.post(
                f"/api/admin/content/{section}/{item_id}/restore"
            )
            self.assertEqual(restore_response.status_code, 200, restore_response.get_json())
            public_content = self.client.get("/api/content").get_json()
            if section == "gallery":
                self.assertNotIn(item_id, [item["id"] for item in public_content[section]])
                restored_admin_item = next(
                    item for item in self.client.get("/api/admin/content").get_json()[section]
                    if item["id"] == item_id
                )
                self.assertTrue(restored_admin_item["hidden"])
            else:
                self.assertIn(item_id, [item["id"] for item in public_content[section]])

            self.assertEqual(
                self.client.delete(f"/api/admin/content/{section}/{item_id}").status_code,
                200,
            )
            self.assertEqual(
                self.client.delete(
                    f"/api/admin/content/{section}/{item_id}/permanent"
                ).status_code,
                200,
            )
            final_content = self.client.get("/api/admin/content").get_json()
            self.assertNotIn(
                item_id,
                [item["id"] for item in final_content["archives"][section]],
            )

    def test_contact_settings_have_no_archive_route(self):
        self.authenticate()
        response = self.client.post(
            "/api/admin/content/contacts/contact-api/restore"
        )
        self.assertEqual(response.status_code, 400)
        contacts = self.client.get("/api/content").get_json()["contacts"]
        self.assertEqual([item["id"] for item in contacts], ["contact-api"])

    def test_existing_package_staff_and_contact_records_can_be_hidden_and_restored(self):
        self.authenticate()
        admin_content = self.client.get("/api/admin/content").get_json()
        for section in ("packages", "staff", "contacts"):
            self.assertEqual(
                [item["id"] for item in admin_content[section]],
                [self.content[section][0]["id"]],
            )
            item = admin_content[section][0]
            hidden_response = self.client.put(
                f"/api/admin/content/{section}/{item['id']}",
                json={**item, "hidden": True},
            )
            self.assertEqual(hidden_response.status_code, 200, hidden_response.get_json())

            public_items = self.client.get("/api/content").get_json()[section]
            self.assertNotIn(item["id"], [public_item["id"] for public_item in public_items])
            public_visibility = self.client.get("/api/content").get_json()["visibility"][section]
            self.assertEqual(public_visibility, {"active": 1, "visible": 0})
            admin_items = self.client.get("/api/admin/content").get_json()[section]
            hidden_item = next(
                admin_item for admin_item in admin_items if admin_item["id"] == item["id"]
            )
            self.assertTrue(hidden_item["hidden"])

            visible_response = self.client.put(
                f"/api/admin/content/{section}/{item['id']}",
                json={**hidden_item, "hidden": False},
            )
            self.assertEqual(visible_response.status_code, 200, visible_response.get_json())
            public_items = self.client.get("/api/content").get_json()[section]
            self.assertIn(item["id"], [public_item["id"] for public_item in public_items])
            public_visibility = self.client.get("/api/content").get_json()["visibility"][section]
            self.assertEqual(public_visibility, {"active": 1, "visible": 1})

    def test_all_content_sections_persist_active_item_order(self):
        self.authenticate()
        sections = ("packages", "gallery", "articles", "information", "staff", "contacts")
        for section in sections:
            database.add_item(
                app_module.DB_FILE,
                section,
                {"id": f"{section}-second", "title": f"{section} kedua"},
            )
            current_ids = [
                item["id"]
                for item in self.client.get("/api/admin/content").get_json()[section]
            ]
            ordered_ids = list(reversed(current_ids))
            response = self.client.put(
                f"/api/admin/content/{section}/order",
                json={"ids": ordered_ids},
            )
            self.assertEqual(response.status_code, 200, response.get_json())
            loaded_ids = [
                item["id"]
                for item in self.client.get("/api/admin/content").get_json()[section]
            ]
            self.assertEqual(loaded_ids, ordered_ids)

    def test_order_endpoint_rejects_duplicate_and_stale_item_ids(self):
        self.authenticate()
        duplicate_response = self.client.put(
            "/api/admin/content/packages/order",
            json={"ids": ["package-api", "package-api"]},
        )
        self.assertEqual(duplicate_response.status_code, 400)

        stale_response = self.client.put(
            "/api/admin/content/packages/order",
            json={"ids": ["missing-package"]},
        )
        self.assertEqual(stale_response.status_code, 409)


if __name__ == "__main__":
    unittest.main()
