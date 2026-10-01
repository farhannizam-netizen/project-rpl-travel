# Database Design — Kurma Travel

## 1. Gambaran Database

Database Kurma Travel digunakan untuk menyimpan data yang dibutuhkan oleh website, seperti informasi perusahaan, paket Umroh dan Haji, fasilitas paket, galeri, artikel, dan pesan dari pengguna.

Database menggunakan **MySQL** dan pengelolaannya menggunakan **Prisma ORM**.

## 2. Daftar Tabel

Database memiliki beberapa tabel utama:

| No | Tabel          | Fungsi                                   |
| -- | -------------- | ---------------------------------------- |
| 1  | CompanyProfile | Menyimpan informasi perusahaan           |
| 2  | Package        | Menyimpan data paket Umroh dan Haji      |
| 3  | Facility       | Menyimpan fasilitas setiap paket         |
| 4  | Gallery        | Menyimpan foto atau dokumentasi kegiatan |
| 5  | Article        | Menyimpan artikel website                |
| 6  | ContactMessage | Menyimpan pesan dari pengguna            |

## 3. Entity Relationship Diagram

Relasi utama database dapat digambarkan sebagai berikut:

```text
┌─────────────────────┐
│   CompanyProfile    │
├─────────────────────┤
│ Id                  │
│ CompanyName         │
│ Description         │
│ Vision              │
│ Mission             │
│ Address             │
│ WhatsApp            │
│ Email               │
│ Instagram           │
│ TikTok              │
│ CreatedAt           │
│ UpdatedAt           │
└─────────────────────┘


┌─────────────────────┐
│       Package       │
├─────────────────────┤
│ Id                  │
│ Name                │
│ Type                │
│ Price               │
│ Duration            │
│ Hotel               │
│ DepartureInfo       │
│ Description         │
│ IsActive            │
│ CreatedAt           │
│ UpdatedAt           │
└──────────┬──────────┘
           │
           │ 1
           │
           │
           │ *
┌──────────▼──────────┐
│      Facility       │
├─────────────────────┤
│ Id                  │
│ PackageId           │
│ Name                │
│ Description         │
│ CreatedAt           │
└─────────────────────┘


┌─────────────────────┐
│       Gallery       │
├─────────────────────┤
│ Id                  │
│ Title               │
│ ImageUrl            │
│ Description         │
│ EventDate           │
│ IsPublished         │
│ CreatedAt           │
│ UpdatedAt           │
└─────────────────────┘


┌─────────────────────┐
│       Article       │
├─────────────────────┤
│ Id                  │
│ Title               │
│ Slug                │
│ Content             │
│ ThumbnailUrl        │
│ Category            │
│ IsPublished         │
│ PublishedAt         │
│ CreatedAt           │
│ UpdatedAt           │
└─────────────────────┘


┌─────────────────────┐
│   ContactMessage    │
├─────────────────────┤
│ Id                  │
│ Name                │
│ Email               │
│ WhatsApp            │
│ Message             │
│ CreatedAt           │
└─────────────────────┘
```

## 4. Tabel CompanyProfile

Tabel `CompanyProfile` digunakan untuk menyimpan informasi utama mengenai perusahaan Kurma Travel.

| Field       | Tipe Data | Keterangan            |
| ----------- | --------- | --------------------- |
| Id          | Int       | Primary key           |
| CompanyName | String    | Nama perusahaan       |
| Description | Text      | Deskripsi perusahaan  |
| Vision      | Text      | Visi perusahaan       |
| Mission     | Text      | Misi perusahaan       |
| Address     | String    | Alamat perusahaan     |
| WhatsApp    | String    | Nomor WhatsApp        |
| Email       | String    | Email perusahaan      |
| Instagram   | String    | Akun Instagram        |
| TikTok      | String    | Akun TikTok           |
| CreatedAt   | DateTime  | Waktu data dibuat     |
| UpdatedAt   | DateTime  | Waktu data diperbarui |

## 5. Tabel Package

Tabel `Package` digunakan untuk menyimpan informasi paket perjalanan Umroh dan Haji.

| Field         | Tipe Data | Keterangan              |
| ------------- | --------- | ----------------------- |
| Id            | Int       | Primary key             |
| Name          | String    | Nama paket              |
| Type          | String    | Jenis paket             |
| Price         | Decimal   | Harga paket             |
| Duration      | String    | Durasi perjalanan       |
| Hotel         | String    | Informasi hotel         |
| DepartureInfo | String    | Informasi keberangkatan |
| Description   | Text      | Deskripsi paket         |
| IsActive      | Boolean   | Status paket            |
| CreatedAt     | DateTime  | Waktu data dibuat       |
| UpdatedAt     | DateTime  | Waktu data diperbarui   |

Contoh data:

```text
Name          : Umrah Regular + Thoif
Type          : Umrah
Price         : 29500000
Duration      : 12 Hari
Hotel         : Hotel 4*
IsActive      : true
```

## 6. Tabel Facility

Tabel `Facility` digunakan untuk menyimpan fasilitas yang tersedia pada setiap paket.

| Field       | Tipe Data | Keterangan             |
| ----------- | --------- | ---------------------- |
| Id          | Int       | Primary key            |
| PackageId   | Int       | Foreign key ke Package |
| Name        | String    | Nama fasilitas         |
| Description | Text      | Deskripsi fasilitas    |
| CreatedAt   | DateTime  | Waktu data dibuat      |

### Relasi

Satu `Package` dapat memiliki banyak `Facility`.

```text
Package 1 ─────────── * Facility
```

Contoh:

```text
Package:
Umrah Regular + Thoif

Facility:
- Tiket Pesawat PP
- Visa Umrah
- Bagasi 30 Kg
- Manasik
- Zamzam 5 Liter
```

## 7. Tabel Gallery

Tabel `Gallery` digunakan untuk menyimpan dokumentasi kegiatan Kurma Travel.

| Field       | Tipe Data | Keterangan            |
| ----------- | --------- | --------------------- |
| Id          | Int       | Primary key           |
| Title       | String    | Judul foto            |
| ImageUrl    | String    | Lokasi file gambar    |
| Description | Text      | Deskripsi foto        |
| EventDate   | DateTime  | Tanggal kegiatan      |
| IsPublished | Boolean   | Status publikasi      |
| CreatedAt   | DateTime  | Waktu data dibuat     |
| UpdatedAt   | DateTime  | Waktu data diperbarui |

## 8. Tabel Article

Tabel `Article` digunakan untuk menyimpan artikel atau informasi yang ditampilkan pada website.

| Field        | Tipe Data | Keterangan                   |
| ------------ | --------- | ---------------------------- |
| Id           | Int       | Primary key                  |
| Title        | String    | Judul artikel                |
| Slug         | String    | URL unik artikel             |
| Content      | Text      | Isi artikel                  |
| ThumbnailUrl | String    | Gambar thumbnail             |
| Category     | String    | Kategori artikel             |
| IsPublished  | Boolean   | Status publikasi             |
| PublishedAt  | DateTime  | Waktu artikel dipublikasikan |
| CreatedAt    | DateTime  | Waktu data dibuat            |
| UpdatedAt    | DateTime  | Waktu data diperbarui        |

Field `Slug` digunakan agar setiap artikel memiliki alamat URL yang mudah dibaca.

Contoh:

```text
Title:
Tips Persiapan Sebelum Berangkat Umrah

Slug:
tips-persiapan-sebelum-berangkat-umrah
```

## 9. Tabel ContactMessage

Tabel `ContactMessage` digunakan untuk menyimpan pesan yang dikirim oleh pengguna melalui halaman kontak.

| Field     | Tipe Data | Keterangan         |
| --------- | --------- | ------------------ |
| Id        | Int       | Primary key        |
| Name      | String    | Nama pengirim      |
| Email     | String    | Email pengirim     |
| WhatsApp  | String    | Nomor WhatsApp     |
| Message   | Text      | Isi pesan          |
| CreatedAt | DateTime  | Waktu pesan dibuat |

Contoh:

```text
Name     : Ahmad
Email    : ahmad@email.com
WhatsApp : 081234567890
Message  : Saya ingin bertanya mengenai paket Umrah Regular.
```

## 10. Relasi Antar Tabel

Relasi database yang digunakan dalam sistem:

### Package dan Facility

Satu paket dapat memiliki banyak fasilitas.

```text
Package
   │
   │ 1
   │
   └────────── * Facility
```

`Facility.PackageId` digunakan sebagai foreign key yang menghubungkan fasilitas dengan paket.

### Tabel Lain

`CompanyProfile`, `Gallery`, `Article`, dan `ContactMessage` tidak memiliki relasi langsung dengan tabel lainnya pada versi awal sistem.

## 11. Primary Key dan Foreign Key

Setiap tabel memiliki primary key berupa `Id`.

```text
CompanyProfile.Id
Package.Id
Facility.Id
Gallery.Id
Article.Id
ContactMessage.Id
```

Foreign key yang digunakan:

```text
Facility.PackageId → Package.Id
```

## 12. Aturan Data

Beberapa aturan yang diterapkan pada database:

1. Setiap data memiliki `Id` sebagai primary key.
2. `Article.Slug` harus bersifat unik.
3. `Facility.PackageId` harus mengacu pada paket yang tersedia.
4. Paket yang sudah tidak ditawarkan dapat diubah menjadi `IsActive = false`.
5. Artikel yang belum siap ditampilkan dapat menggunakan `IsPublished = false`.
6. Galeri yang belum ingin ditampilkan dapat menggunakan `IsPublished = false`.
7. Waktu pembuatan data disimpan pada `CreatedAt`.
8. Waktu perubahan data disimpan pada `UpdatedAt`.
9. Data penting tidak disimpan langsung di source code.

## 13. Prisma ORM

Database akan dikelola menggunakan Prisma ORM.

File utama Prisma:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

File `schema.prisma` digunakan untuk mendefinisikan struktur tabel dan relasi database.

`migrations` digunakan untuk mencatat perubahan struktur database.

`seed.ts` digunakan untuk memasukkan data awal ke database.

## 14. Contoh Struktur Relasi Prisma

Relasi antara `Package` dan `Facility` direncanakan menggunakan struktur seperti berikut:

```prisma
model Package {
  Id          Int        @id @default(autoincrement())
  Name        String
  Type        String
  Price       Decimal
  Duration    String
  Hotel       String
  DepartureInfo String?
  Description String?
  IsActive    Boolean    @default(true)
  CreatedAt   DateTime   @default(now())
  UpdatedAt   DateTime   @updatedAt

  Facilities  Facility[]
}

model Facility {
  Id          Int      @id @default(autoincrement())
  PackageId   Int
  Name        String
  Description String?
  CreatedAt   DateTime @default(now())

  Package     Package  @relation(fields: [PackageId], references: [Id], onDelete: Cascade)
}
```

## 15. Database Environment

Database menggunakan MySQL.

Contoh konfigurasi pada `.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/kurma_travel"
```

Nama database:

```text
kurma_travel
```

## 16. Pengembangan Database

Pengembangan database dilakukan secara bertahap:

1. Membuat database MySQL.
2. Membuat `schema.prisma`.
3. Membuat migration.
4. Menjalankan migration ke database.
5. Membuat seed data.
6. Menghubungkan backend dengan Prisma.
7. Melakukan pengujian CRUD melalui REST API.

## 17. Batasan Database

Database pada proyek ini hanya digunakan untuk kebutuhan website profil dan informasi Kurma Travel.

Database tidak mencakup:

* Data jamaah.
* Data paspor jamaah.
* Data pembayaran.
* Data booking.
* Data visa.
* Data tiket jamaah.
* Data keuangan perusahaan.
* Data administrasi internal perusahaan.

Batasan tersebut dibuat agar ruang lingkup proyek tetap sesuai dengan waktu pengerjaan perkuliahan.
