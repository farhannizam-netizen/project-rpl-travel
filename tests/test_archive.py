import tempfile
import unittest
from pathlib import Path

import database


class ArchiveDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "content.db"
        self.data_path = Path(self.temp_dir.name) / "content.json"
        self.initial_content = {
            "packages": [{"id": "package-1", "title": "Umrah", "image": "/poster.jpg"}],
            "gallery": [{"id": "gallery-1", "title": "Foto", "image": "/gallery.jpg", "hidden": True}],
            "articles": [{"id": "article-1", "title": "Artikel", "url": "/artikel"}],
            "information": [{"id": "info-1", "title": "Informasi"}],
            "staff": [{"id": "staff-1", "title": "Staf"}],
            "contacts": [{"id": "contact-1", "title": "Nomor WhatsApp"}],
            "theme": {},
        }
        database.initialize_database(
            self.db_path,
            self.data_path,
            lambda: self.initial_content,
        )
        database.replace_content(self.db_path, self.initial_content, {})

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_archives_are_hidden_from_public_and_restored_without_losing_payload(self):
        for section in database.ARCHIVABLE_SECTIONS:
            item_id = self.initial_content[section][0]["id"]
            self.assertTrue(database.archive_item(self.db_path, section, item_id, "admin@example.com"))

            public_content = database.load_content(self.db_path, {})
            admin_content = database.load_content(self.db_path, {}, include_archived=True)
            self.assertNotIn(item_id, [item["id"] for item in public_content[section]])
            archived = next(item for item in admin_content["archives"][section] if item["id"] == item_id)
            self.assertEqual(archived["archived_by"], "admin@example.com")
            self.assertTrue(archived["archived_at"])

            restored, item = database.restore_item(self.db_path, section, item_id)
            self.assertTrue(restored)
            self.assertEqual(item["title"], self.initial_content[section][0]["title"])
            self.assertEqual(
                len([candidate for candidate in database.load_content(
                    self.db_path, {}, include_hidden=True
                )[section]
                     if candidate["id"] == item_id]),
                1,
                section,
            )
            if section == "gallery":
                self.assertTrue(item["hidden"])

    def test_permanent_delete_only_removes_archived_records(self):
        self.assertFalse(database.permanently_delete_item(self.db_path, "packages", "package-1"))
        self.assertTrue(database.archive_item(self.db_path, "packages", "package-1"))
        self.assertTrue(database.permanently_delete_item(self.db_path, "packages", "package-1"))
        self.assertFalse(database.permanently_delete_item(self.db_path, "packages", "package-1"))
        self.assertEqual(database.load_content(self.db_path, {}, include_archived=True)["archives"]["packages"], [])

    def test_archived_records_and_actor_survive_content_replacement(self):
        self.assertTrue(database.archive_item(self.db_path, "articles", "article-1", "admin"))
        content = database.load_content(self.db_path, {}, include_archived=True)
        database.replace_content(self.db_path, content, {})
        restored_content = database.load_content(self.db_path, {}, include_archived=True)
        archived_article = restored_content["archives"]["articles"][0]
        self.assertEqual(archived_article["id"], "article-1")
        self.assertEqual(archived_article["archived_by"], "admin")
        self.assertEqual(restored_content["articles"], [])

    def test_public_contact_settings_cannot_be_archived(self):
        self.assertFalse(database.archive_item(self.db_path, "contacts", "contact-1"))
        self.assertEqual(
            database.load_content(self.db_path, {})["contacts"],
            self.initial_content["contacts"],
        )


if __name__ == "__main__":
    unittest.main()
