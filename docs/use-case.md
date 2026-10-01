# Use Case — Kurma Travel

## 1. Aktor

Sistem Kurma Travel memiliki dua aktor utama:

### Calon Jamaah

Pengguna yang mengakses website untuk mendapatkan informasi mengenai Kurma Travel dan layanan Umroh dan Haji.

### Admin

Pihak yang mengelola informasi dan konten yang ditampilkan pada website.

## 2. Daftar Use Case

### 👤 Calon Jamaah

#### UC-01 — Melihat Profil

Melihat informasi mengenai Kurma Travel.

#### UC-02 — Melihat Paket

Melihat daftar paket Umroh dan Haji yang tersedia.

#### UC-03 — Melihat Detail Paket

Melihat informasi lengkap dan fasilitas dari paket yang dipilih.

#### UC-04 — Melihat Galeri

Melihat dokumentasi kegiatan Kurma Travel.

#### UC-05 — Membaca Artikel

Membaca artikel dan informasi yang tersedia di website.

#### UC-06 — Menghubungi Kurma Travel

Menghubungi Kurma Travel melalui WhatsApp atau informasi kontak yang tersedia.

#### UC-07 — Mengirim Pesan

Mengirim pertanyaan atau pesan melalui form kontak.

### 🔐 Admin

#### UC-08 — Mengelola Profil

Menambah atau mengubah informasi perusahaan.

#### UC-09 — Mengelola Paket

Menambah, mengubah, atau menghapus data paket Umroh dan Haji.

#### UC-10 — Mengelola Fasilitas

Menambah, mengubah, atau menghapus fasilitas pada suatu paket.

#### UC-11 — Mengelola Galeri

Menambah, mengubah, atau menghapus dokumentasi kegiatan.

#### UC-12 — Mengelola Artikel

Menambah, mengubah, atau menghapus artikel pada website.

#### UC-13 — Melihat Pesan

Melihat pesan yang dikirim oleh pengguna melalui halaman kontak.
                |

## 3. Use Case Diagram

Gambaran hubungan aktor dengan sistem:

```text
                    ┌──────────────────────────┐
                    │     KURMA TRAVEL         │
                    │          SYSTEM          │
                    │                          │
                    │  Melihat Profil          │
                    │  Melihat Paket           │
                    │  Melihat Detail Paket    │
                    │  Melihat Galeri          │
                    │  Membaca Artikel         │
                    │  Menghubungi Kurma       │
                    │  Mengirim Pesan          │
                    │                          │
                    │  Mengelola Profil        │
                    │  Mengelola Paket         │
                    │  Mengelola Fasilitas     │
                    │  Mengelola Galeri        │
                    │  Mengelola Artikel       │
                    │  Melihat Pesan           │
                    └──────────────────────────┘
                         ▲              ▲
                         │              │
                    ┌────┴────┐    ┌────┴────┐
                    │ Calon   │    │  Admin  │
                    │ Jamaah  │    │         │
                    └─────────┘    └─────────┘
```

## 4. Detail Use Case

### UC-01 — Melihat Profil

**Aktor:** Calon Jamaah

**Tujuan:** Melihat informasi mengenai Kurma Travel.

**Alur:**

1. Pengguna membuka website.
2. Pengguna memilih halaman profil.
3. Sistem menampilkan informasi perusahaan.
4. Pengguna dapat melihat informasi yang tersedia.

### UC-02 — Melihat Paket

**Aktor:** Calon Jamaah

**Tujuan:** Melihat paket Umroh dan Haji yang tersedia.

**Alur:**

1. Pengguna membuka halaman paket.
2. Sistem mengambil data paket.
3. Sistem menampilkan daftar paket.
4. Pengguna dapat memilih salah satu paket.

### UC-03 — Melihat Detail Paket

**Aktor:** Calon Jamaah

**Tujuan:** Melihat informasi lebih lengkap mengenai paket.

**Alur:**

1. Pengguna memilih salah satu paket.
2. Sistem membuka halaman detail paket.
3. Sistem menampilkan harga, durasi, hotel, informasi keberangkatan, dan fasilitas.
4. Pengguna dapat menghubungi Kurma Travel jika membutuhkan informasi lebih lanjut.

### UC-04 — Melihat Galeri

**Aktor:** Calon Jamaah

**Tujuan:** Melihat dokumentasi kegiatan Kurma Travel.

**Alur:**

1. Pengguna membuka halaman galeri.
2. Sistem mengambil data galeri.
3. Sistem menampilkan foto kegiatan.
4. Pengguna dapat melihat dokumentasi yang tersedia.

### UC-05 — Membaca Artikel

**Aktor:** Calon Jamaah

**Tujuan:** Mendapatkan informasi melalui artikel.

**Alur:**

1. Pengguna membuka halaman artikel.
2. Sistem menampilkan daftar artikel.
3. Pengguna memilih artikel.
4. Sistem menampilkan isi artikel.

### UC-06 — Menghubungi Kurma Travel

**Aktor:** Calon Jamaah

**Tujuan:** Menghubungi pihak Kurma Travel.

**Alur:**

1. Pengguna membuka halaman kontak atau menekan tombol WhatsApp.
2. Sistem menampilkan informasi kontak.
3. Pengguna memilih WhatsApp atau kontak yang tersedia.
4. Pengguna dapat menghubungi Kurma Travel.

### UC-07 — Mengirim Pesan

**Aktor:** Calon Jamaah

**Tujuan:** Mengirim pertanyaan atau pesan kepada Kurma Travel.

**Alur:**

1. Pengguna membuka halaman kontak.
2. Pengguna mengisi nama, email, WhatsApp, dan pesan.
3. Pengguna mengirim form.
4. Sistem memvalidasi data.
5. Sistem menyimpan pesan ke database.

### UC-08 — Mengelola Profil

**Aktor:** Admin

**Tujuan:** Mengelola informasi perusahaan.

**Alur:**

1. Admin membuka halaman pengelolaan profil.
2. Sistem menampilkan data profil.
3. Admin mengubah informasi yang diperlukan.
4. Admin menyimpan perubahan.
5. Sistem memperbarui data.

### UC-09 — Mengelola Paket

**Aktor:** Admin

**Tujuan:** Mengelola informasi paket Umroh dan Haji.

**Alur:**

1. Admin membuka halaman paket.
2. Sistem menampilkan daftar paket.
3. Admin dapat menambah, mengubah, atau menghapus paket.
4. Sistem menyimpan perubahan ke database.

### UC-10 — Mengelola Fasilitas

**Aktor:** Admin

**Tujuan:** Mengelola fasilitas yang tersedia pada paket.

**Alur:**

1. Admin memilih sebuah paket.
2. Sistem menampilkan fasilitas paket.
3. Admin dapat menambah, mengubah, atau menghapus fasilitas.
4. Sistem menyimpan perubahan.

### UC-11 — Mengelola Galeri

**Aktor:** Admin

**Tujuan:** Mengelola dokumentasi kegiatan.

**Alur:**

1. Admin membuka halaman galeri.
2. Sistem menampilkan data galeri.
3. Admin dapat menambah, mengubah, atau menghapus galeri.
4. Sistem menyimpan perubahan.

### UC-12 — Mengelola Artikel

**Aktor:** Admin

**Tujuan:** Mengelola artikel pada website.

**Alur:**

1. Admin membuka halaman artikel.
2. Sistem menampilkan daftar artikel.
3. Admin dapat membuat, mengubah, atau menghapus artikel.
4. Admin menentukan status publikasi.
5. Sistem menyimpan perubahan.

### UC-13 — Melihat Pesan

**Aktor:** Admin

**Tujuan:** Melihat pesan yang dikirim oleh pengguna.

**Alur:**

1. Admin membuka halaman pesan.
2. Sistem mengambil data pesan.
3. Sistem menampilkan pesan yang masuk.
4. Admin dapat melihat detail pesan.
