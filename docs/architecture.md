# Architecture Document — Kurma Travel

## 1. Gambaran Umum

Kurma Travel merupakan website informasi dan profil perusahaan travel Umroh dan Haji. Aplikasi ini dibuat untuk membantu perusahaan memiliki website resmi yang dapat digunakan oleh calon jamaah untuk mendapatkan informasi mengenai perusahaan, paket perjalanan, fasilitas, galeri, artikel, dan kontak.

Aplikasi menggunakan arsitektur berbasis web dengan pemisahan antara frontend, backend, dan database.

## 2. Tujuan Sistem

Sistem dibuat untuk:

* Menampilkan informasi resmi Kurma Travel.
* Menampilkan paket Umroh dan Haji.
* Menampilkan fasilitas setiap paket.
* Menampilkan galeri kegiatan.
* Menampilkan artikel dan informasi seputar Umroh dan Haji.
* Menyediakan informasi kontak dan WhatsApp.
* Membantu admin mengelola konten website.

## 3. Target Pengguna

### Calon Jamaah

Calon jamaah dapat:

* Melihat profil perusahaan.
* Melihat paket Umroh dan Haji.
* Melihat detail paket dan fasilitas.
* Melihat galeri.
* Membaca artikel.
* Menghubungi Kurma Travel melalui WhatsApp atau form kontak.

### Admin

Admin dapat:

* Mengelola profil perusahaan.
* Mengelola paket perjalanan.
* Mengelola fasilitas paket.
* Mengelola galeri.
* Mengelola artikel.
* Melihat pesan dari pengguna.

## 4. Arsitektur Sistem

Aplikasi menggunakan pola **Client–Server Architecture**.

```text
┌──────────────────────────────┐
│          User / Admin        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Frontend Web           │
│     React + TypeScript       │
│          Vite                │
└──────────────┬───────────────┘
               │ REST API
               ▼
┌──────────────────────────────┐
│          Backend             │
│    Node.js + Express         │
│        TypeScript            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│            Prisma            │
│             ORM              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           MySQL              │
│          Database            │
└──────────────────────────────┘
```

## 5. Teknologi yang Digunakan

| Bagian               | Teknologi          |
| -------------------- | ------------------ |
| Frontend             | React + TypeScript |
| Build Tool           | Vite               |
| Styling              | Tailwind CSS       |
| Backend              | Node.js + Express  |
| Bahasa               | TypeScript         |
| Database             | MySQL              |
| ORM                  | Prisma             |
| API                  | REST API           |
| Version Control      | Git + GitHub       |
| Development Database | Docker Compose     |

## 6. Struktur Project

```text
rpl-kurma-travel/
│
├── README.md
│
├── docs/
│   ├── architecture.md
│   ├── requirements.md
│   ├── use-case.md
│   └── database.md
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   └── shared/
│
├── prisma/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── package.json
```

## 7. Frontend

Frontend digunakan untuk menampilkan halaman website yang dapat diakses oleh pengguna.

Halaman utama yang direncanakan:

* Home
* Profil
* Paket Umroh & Haji
* Detail Paket
* Galeri
* Artikel
* Kontak
* Admin Dashboard

Frontend menggunakan React dan TypeScript. Data yang membutuhkan database akan diambil melalui REST API dari backend.

## 8. Backend

Backend bertugas menangani proses bisnis dan komunikasi dengan database.

Backend menggunakan:

* Node.js
* Express
* TypeScript
* Prisma

Struktur backend:

```text
apps/api/src/
├── controllers/
├── routes/
├── services/
├── middleware/
├── validators/
└── server.ts
```

### Tanggung Jawab Backend

Backend bertugas untuk:

* Menerima request dari frontend.
* Melakukan validasi data.
* Mengambil dan mengubah data database.
* Mengirim response melalui REST API.
* Menangani error.
* Mengelola data website.

## 9. Database

Database menggunakan MySQL dan diakses menggunakan Prisma ORM.

### Entity Utama

#### CompanyProfile

Menyimpan informasi perusahaan.

```text
CompanyProfile
- Id
- CompanyName
- Description
- Vision
- Mission
- Address
- WhatsApp
- Email
- Instagram
- TikTok
- CreatedAt
- UpdatedAt
```

#### Package

Menyimpan data paket Umroh dan Haji.

```text
Package
- Id
- Name
- Type
- Price
- Duration
- Hotel
- DepartureInfo
- Description
- IsActive
- CreatedAt
- UpdatedAt
```

#### Facility

Menyimpan fasilitas dari sebuah paket.

```text
Facility
- Id
- PackageId
- Name
- Description
- CreatedAt
```

#### Gallery

Menyimpan foto kegiatan perusahaan.

```text
Gallery
- Id
- Title
- ImageUrl
- Description
- EventDate
- IsPublished
- CreatedAt
- UpdatedAt
```

#### Article

Menyimpan artikel website.

```text
Article
- Id
- Title
- Slug
- Content
- ThumbnailUrl
- Category
- IsPublished
- PublishedAt
- CreatedAt
- UpdatedAt
```

#### ContactMessage

Menyimpan pesan yang dikirim pengguna.

```text
ContactMessage
- Id
- Name
- Email
- WhatsApp
- Message
- CreatedAt
```

## 10. Relasi Database

Relasi utama dalam database:

```text
Package
   │
   │ 1
   │
   └──────────< Facility
                 *
```

Satu paket dapat memiliki beberapa fasilitas.

Entity lainnya digunakan untuk kebutuhan masing-masing fitur website.

## 11. REST API

### Company Profile

```text
GET    /api/company
POST   /api/company
PUT    /api/company/:Id
```

### Packages

```text
GET    /api/packages
POST   /api/packages
GET    /api/packages/:Id
PUT    /api/packages/:Id
DELETE /api/packages/:Id
```

### Facilities

```text
GET    /api/packages/:PackageId/facilities
POST   /api/packages/:PackageId/facilities
PUT    /api/facilities/:Id
DELETE /api/facilities/:Id
```

### Gallery

```text
GET    /api/gallery
POST   /api/gallery
GET    /api/gallery/:Id
PUT    /api/gallery/:Id
DELETE /api/gallery/:Id
```

### Articles

```text
GET    /api/articles
POST   /api/articles
GET    /api/articles/:Id
PUT    /api/articles/:Id
DELETE /api/articles/:Id
```

### Contact Messages

```text
GET    /api/contact-messages
POST   /api/contact-messages
GET    /api/contact-messages/:Id
DELETE /api/contact-messages/:Id
```

## 12. Struktur Shared Package

Data yang digunakan bersama frontend dan backend ditempatkan pada package `shared`.

```text
packages/shared/src/
├── models/
│   ├── CompanyProfile.ts
│   ├── Package.ts
│   ├── Facility.ts
│   ├── Gallery.ts
│   └── Article.ts
│
├── enums/
│   ├── PackageType.ts
│   └── ArticleCategory.ts
│
├── dto/
│   ├── PackageResponse.ts
│   ├── ArticleResponse.ts
│   └── CompanyResponse.ts
│
└── index.ts
```

## 13. Aturan Database

Database menggunakan Prisma ORM.

Aturan utama:

* Setiap tabel memiliki primary key.
* `Article.Slug` harus unik.
* Data paket memiliki status `IsActive`.
* Data galeri dan artikel memiliki status publikasi.
* Perubahan struktur database dilakukan menggunakan Prisma Migration.
* Data awal dapat dimasukkan menggunakan Prisma Seed.

## 14. Environment Variable

Informasi konfigurasi yang bersifat pribadi tidak ditulis langsung di source code.

Contoh file `.env.example`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/kurma_travel"
PORT=3000
```

File `.env` digunakan untuk konfigurasi lokal dan tidak di-upload ke GitHub.

## 15. Fitur yang Tidak Termasuk

Untuk menjaga agar proyek tetap realistis dalam waktu pengerjaan perkuliahan, sistem tidak mencakup:

* Registrasi jamaah.
* Login calon jamaah.
* Database data jamaah.
* Sistem booking online.
* Payment gateway.
* Sistem pembayaran.
* E-ticket.
* Pengelolaan visa.
* Sistem notifikasi otomatis.
* Aplikasi mobile.
* Dashboard keuangan.
* Integrasi sistem internal perusahaan.

## 16. Deployment

Pada tahap development, aplikasi dapat dijalankan secara lokal.

Frontend:

```text
React + Vite
```

Backend:

```text
Node.js + Express
```

Database:

```text
MySQL
```

Docker Compose dapat digunakan untuk menjalankan database secara lokal agar environment development lebih mudah disiapkan.

## 17. Kriteria Keberhasilan

Aplikasi dianggap berhasil apabila:

1. Website dapat dijalankan tanpa error yang menghambat penggunaan.
2. Informasi perusahaan dapat ditampilkan.
3. Paket Umroh dan Haji dapat ditampilkan.
4. Detail paket dan fasilitas dapat ditampilkan.
5. Galeri dapat ditampilkan.
6. Artikel dapat ditampilkan.
7. Pengguna dapat mengirim pesan melalui halaman kontak.
8. Tombol WhatsApp dapat digunakan.
9. Frontend dapat mengambil data dari REST API.
10. Backend dapat terhubung dengan database MySQL.
11. Prisma migration dapat dijalankan.
12. Website dapat digunakan pada perangkat desktop maupun mobile.
13. Dokumentasi proyek tersedia di repository GitHub.
