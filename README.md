# Portal UEST

Dashboard internal tim: kanban, kalender task, dokumen, dan koleksi link per project.

## Stack

- **SvelteKit 3** + Svelte 5 (runes)
- **Tailwind CSS 4**
- **PostgreSQL** + Drizzle ORM
- **Better Auth** (email + password)
- **Adapter Node** + Docker
- **Cloudflare R2** (opsional) untuk penyimpanan dokumen

## Setup lokal

```sh
pnpm install
```

Isi `.env` (lihat `.env.example`):

```env
DATABASE_URL="postgres://user:password@127.0.0.1:5432/portal_uest"
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="<32+ karakter acak>"
ALLOW_REGISTRATION="false"
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
```

Buat schema/tabel untuk development:

```sh
pnpm db:push
```

Jalankan dev server:

```sh
pnpm dev
```

## Peran pengguna

| Role     | Hak akses                                                               |
| -------- | ----------------------------------------------------------------------- |
| `owner`  | Semua project dan aksi, termasuk mengelola role anggota workspace       |
| `admin`  | Semua project, membuat/menghapus project, mengelola kolom dan anggota   |
| `member` | Hanya project yang diikuti; task, dokumen, dan link di project tersebut |

User pertama yang mendaftar otomatis menjadi **owner** dan mendapat workspace
default beserta project **General**. Setelah itu pendaftaran publik ditutup
secara default (`ALLOW_REGISTRATION=false`), dan anggota berikutnya dibuat oleh
owner/admin melalui halaman **Tim** (nama, email, password awal, dan role).

Pendaftaran user pertama tetap diizinkan meskipun `ALLOW_REGISTRATION=false`,
selama database belum memiliki user sama sekali. Ini memungkinkan bootstrap
deployment baru tanpa membuka registrasi publik.

Setiap user yang sudah login dapat mengganti password sendiri melalui halaman
**Akun** (`/settings`) dengan memverifikasi password saat ini.

### Log aktivitas (khusus owner)

Owner dapat membuka menu **Log aktivitas** (`/activity`) untuk melihat:

- siapa yang login dan logout, termasuk waktu, alamat IP, dan user agent;
- aktivitas project, task, dokumen, link, dan anggota;
- perubahan role, reset password, pembuatan/penghapusan akun, serta perubahan
  nama/password akun sendiri.

Log bersifat sementara: hanya disimpan maksimal **24 jam**, lalu dihapus
otomatis. Halaman ini tidak dapat diakses admin atau member.

### Anggota per project

Setiap project memiliki daftar anggotanya sendiri (`project_member`). Ini
memisahkan akses antar sie/divisi:

- `owner`/`admin` tetap dapat mengakses semua project untuk pengawasan.
- `member` hanya dapat membuka project tempat ia terdaftar.
- Assignee task wajib merupakan anggota project tersebut.
- Owner/admin mengelola anggota lewat tab **Anggota** pada project.
- Setelah membuat akun baru di halaman **Tim**, tambahkan user tersebut ke
  project yang relevan lewat tab **Anggota**.
- Mengeluarkan anggota dari project akan melepas task yang di-assign kepadanya
  tanpa menghapus assignee lain pada task tersebut.

Nama, deskripsi, dan warna project dapat diubah lewat tombol **Edit project**
pada header project.

### Task

- Task memiliki field **Platform / Format** yang bisa diisi lebih dari satu,
  misalnya `IG` dan `A4`.
- Pilihan cepat tersedia: IG, Feed, Story, Reels, A4, A3, A5, Banner, Website.
- Format lain bisa ditambahkan manual (mis. `1080x1080`).
- Format tampil sebagai chip pada kartu kanban.
- Task dapat memiliki **lebih dari satu assignee**. Semua assignee harus
  merupakan anggota project tersebut.
- Avatar assignee tampil bertumpuk pada kartu kanban (maksimal 3, sisanya `+N`).
- Mengeluarkan anggota dari project otomatis melepas task yang di-assign
  kepadanya tanpa mengganggu assignee lain.

### Dokumen

- Menu **Dokumen** di sidebar menampilkan dokumen dari **semua project di
  workspace**, sehingga sie lain dapat melihat dan mengunduh dokumen yang
  dibutuhkan.
- Semua anggota workspace dapat melihat daftar, mengunduh, dan preview PDF.
- Preview PDF memakai `Content-Disposition: inline`; file non-PDF tetap diunduh
  sebagai attachment.
- Hanya pengunggah dokumen atau owner/admin yang dapat mengubah nama dan
  menghapus dokumen.
- Upload tetap dilakukan dari tab **Dokumen** pada project; hanya anggota project
  tersebut yang dapat mengunggah.
- Upload video ditolak berdasarkan MIME type dan ekstensi file.
- Kuota penyimpanan dokumen workspace adalah **8 GB** (default
  `STORAGE_QUOTA_BYTES=8589934592`), menyisakan ambang aman dari kuota R2 free
  10 GB. Upload ditolak jika total melebihi kuota.
- Indikator sisa kuota tampil di sidebar dan halaman **Dokumen**.

## Struktur data

- `workspace` / `workspace_member` — satu workspace tim dengan role.
- `project` — pengelompokan pekerjaan.
- `project_member` — daftar anggota yang boleh mengakses sebuah project.
- `board_column` — kolom kanban kustom + flag `is_done`.
- `task` — task dengan prioritas, platform/format, dan tenggat (dipakai kalender).
- `task_assignee` — relasi many-to-many antara task dan anggota project.
- `document` — metadata file; isi file disimpan di `UPLOAD_DIR` atau R2.
- `link_note` — bookmark dengan deskripsi dan tag.
- `activity_log` — audit aktivitas sementara (retensi 24 jam) untuk halaman
  Log aktivitas khusus owner.
- Tabel `user`, `session`, `account`, `verification` dikelola Better Auth.

## Konvensi backend

- Route `+page.server.ts` / `+server.ts` berperan sebagai controller: cek akses,
  parse input, lalu panggil helper domain di `src/lib/server/`.
- Validasi input memakai schema Zod di `src/lib/server/schemas.ts` dan helper
  `parseFormData` di `src/lib/server/validation.ts`.
- Error yang memang bisa ditampilkan ke user memakai `fail()` atau `error()`.
- Error tak terduga ditangani terpusat oleh `handleError` di `src/hooks.server.ts`;
  error 5xx dicatat ke log dan diberi `errorId` untuk tracing tanpa membocorkan
  detail internal ke browser.

## Deploy dengan Docker

Dockerfile sudah disiapkan (multi-stage, non-root user, healthcheck, dan
migration otomatis saat container start).

Build dan jalankan secara lokal:

```sh
docker compose up --build
```

Atau tanpa compose:

```sh
docker build -t portal-uest .
docker run --rm -p 3000:3000 --env-file .env portal-uest
```

### Deploy di Dokploy (GitHub)

1. Push project ini ke GitHub.
2. Di Dokploy, buat **Application** baru dan hubungkan repository GitHub.
3. Pilih build type **Dockerfile**:
   - Dockerfile Path: `Dockerfile`
   - Docker Context Path: `.`
4. Isi environment variables (tab **Environment**).
5. Tambahkan domain di tab **Domains**, arahkan ke container port **3000**, dan
   aktifkan HTTPS.
6. Deploy.

Saat container start, `docker-entrypoint.sh` menjalankan migration ke database
(`scripts/migrate.mjs` + folder `drizzle/`) sebelum aplikasi dijalankan. Migration
bersifat idempotent; set `RUN_MIGRATIONS=false` jika ingin mengelolanya manual.
Jika database belum siap, migration dicoba ulang otomatis (default 10 retry,
delay awal 3 detik). Untuk lebih dari satu replica, jalankan migration sebagai
job terpisah.

### Environment variables di Dokploy

| Variable                   | Contoh / keterangan                                      |
| -------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`             | Internal Connection URL dari service PostgreSQL          |
| `ORIGIN`                   | `https://portal.example.com` (harus sama dengan domain)  |
| `BETTER_AUTH_SECRET`       | 32+ karakter acak, jangan diubah setelah ada user        |
| `ALLOW_REGISTRATION`       | `false` (disarankan); user pertama tetap bisa mendaftar  |
| `STORAGE_DRIVER`           | `r2` untuk produksi, `local` untuk fallback              |
| `R2_ACCOUNT_ID`            | Account ID Cloudflare                                    |
| `R2_ACCESS_KEY_ID`         | Access key dari R2 API token                             |
| `R2_SECRET_ACCESS_KEY`     | Secret key dari R2 API token                             |
| `R2_BUCKET`                | Nama bucket R2                                           |
| `R2_ENDPOINT`              | Opsional; otomatis dari `R2_ACCOUNT_ID` bila kosong      |
| `BODY_SIZE_LIMIT`          | `12M` agar upload 10 MB berjalan di adapter Node         |
| `STORAGE_QUOTA_BYTES`      | Kuota dokumen, default `8589934592` (8 GiB)              |
| `PROTOCOL_HEADER`          | `x-forwarded-proto` (di belakang Traefik/Dokploy)        |
| `HOST_HEADER`              | `x-forwarded-host` (di belakang Traefik/Dokploy)         |
| `UPLOAD_DIR`               | `uploads` (hanya dipakai jika `STORAGE_DRIVER=local`)    |
| `RUN_MIGRATIONS`           | Default `true`; set `false` untuk menonaktifkan otomatis |
| `MIGRATION_RETRIES`        | Jumlah retry migration saat DB belum siap (default `10`) |
| `MIGRATION_RETRY_DELAY_MS` | Delay awal antar retry dalam ms (default `3000`)         |
| `R2_FORCE_PATH_STYLE`      | Opsional; `true` hanya untuk MinIO/path-style endpoint   |

Contoh:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BODY_SIZE_LIMIT=12M
STORAGE_QUOTA_BYTES=8589934592
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host

ORIGIN=https://portal.example.com
BETTER_AUTH_SECRET=<openssl rand -hex 32>
ALLOW_REGISTRATION=false
DATABASE_URL=postgres://portal_user:password@postgres-xxxxx:5432/portal_uest

STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=portal-uest
```

### PostgreSQL di project Dokploy lain

`postgres-xxxxx` di atas hanya contoh. Ambil hostname sebenarnya dari halaman
service PostgreSQL di Dokploy → **Connection** → **Internal Connection URL**.
Jangan menebak nama host seperti `postgres-service`; hostname internal Dokploy
biasanya berbentuk nama service + hash.

Dokploy mengisolasi service antar project/environment. Jika PostgreSQL berada di
**project atau environment yang berbeda**, hostname internal database biasanya
tidak bisa di-resolve dari container aplikasi (gejalanya
`getaddrinfo ENOTFOUND <host>`). Pilihan yang tersedia:

1. **Rekomendasi:** buat Application ini di project/environment yang sama dengan
   PostgreSQL, lalu copy **Internal Connection URL** dari halaman database.
   Koneksi tetap privat dan tidak keluar dari server.
2. Jika harus tetap terpisah: aktifkan **External Port** pada PostgreSQL dan
   gunakan **External Connection URL**. Ini membuka database ke internet, jadi
   wajib dibatasi lewat firewall/VPN dan gunakan password kuat.
3. Opsi lanjutan: hubungkan kedua service ke Docker network yang sama di luar
   alur standar Dokploy. Cara ini tidak otomatis dipertahankan saat redeploy.

Cara cepat memastikan host bisa di-resolve dari container aplikasi:

```sh
getent hosts <host-dari-database-url>
```

Jika kosong atau `not found`, berarti aplikasi dan database tidak berada di
network yang sama.

Gunakan database khusus untuk aplikasi ini (misalnya `portal_uest`), jangan
berbagi database dengan aplikasi lain. Jika password mengandung karakter khusus
seperti `@`, `:`, `/`, atau `#`, encode dulu sebagai URL (misalnya `@` → `%40`).

### Cloudflare R2

1. Buat bucket privat di Cloudflare R2.
2. Buat API token R2 dengan permission **Object Read & Write** untuk bucket
   tersebut.
3. Isi `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan
   `R2_BUCKET`, lalu set `STORAGE_DRIVER=r2`.
4. Redeploy aplikasi.

Upload dan download diproksikan lewat server SvelteKit, sehingga bucket tidak
perlu public dan tidak perlu konfigurasi CORS. Jika memakai `STORAGE_DRIVER=local`,
mount volume persisten ke `/app/uploads` (sudah disediakan di `docker-compose.yml`).

### Healthcheck

Endpoint `GET /api/health` mengecek koneksi database dan mengembalikan
`{"status":"ok"}`. Dockerfile sudah memakai endpoint ini sebagai `HEALTHCHECK`;
di Dokploy Anda juga bisa mengisi healthcheck path `/api/health` pada port 3000.

## Catatan produksi

- `ORIGIN` harus sama persis dengan origin browser (skema + domain + port).
- Upload dibatasi 10 MB per file dan 5 file per aksi. Set `BODY_SIZE_LIMIT=12M`.
- `BETTER_AUTH_SECRET` harus stabil; menggantinya akan membatalkan semua sesi.
- Folder `uploads/` hanya perlu persisten jika memakai `STORAGE_DRIVER=local`.
- Belum termasuk: reset password via email (forgot password), verifikasi email,
  undangan/approval anggota, real-time collaboration, dan audit log.
