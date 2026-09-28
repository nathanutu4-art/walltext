# Cara Mengembalikan (Revert) ke Versi Backup Ini

Versi ini telah di-backup menggunakan dua metode: **Git Tag** dan **ZIP Archive**.

---

### Versi: `v1.0.0-stable-editor`
* **Fitur Utama yang Termasuk:**
  * Kanvas $1920 \times 1080$ ($2,073,600$ slot) dengan titik awal $(960, 540)$
  * Koneksi penuh Supabase (Insert, Read, Realtime CDC)
  * Tema Neo-Brutalist Pixel Art (Grid kertas grafik putih, aksen kuning `#fbbf24`, font Press Start 2P & VT323)
  * Kursor persegi kuning retro (`#fbbf24`) pada pointer OS dan kanvas
  * Editor teks multi-baris (textarea) dengan live ghost preview dan kemampuan mengetik langsung di atas kanvas (*direct on-canvas typing*)

---

## Opsi 1: Menggunakan Git (Paling Cepat & Bersih)

Jika di masa mendatang Anda ingin membatalkan semua perubahan baru dan kembali ke titik ini:

### 1. Buka Terminal / PowerShell di folder proyek:
```powershell
# Menggunakan path git lengkap di Windows:
& "C:\Program Files\Git\cmd\git.exe" reset --hard v1.0.0-stable-editor
```
*(Catatan: Perintah ini akan mengembalikan semua kode ke kondisi backup tag ini).*

### 2. Jika hanya ingin melihat/mencoba versi ini di branch baru:
```powershell
& "C:\Program Files\Git\cmd\git.exe" checkout -b revert-stable v1.0.0-stable-editor
```

---

## Opsi 2: Menggunakan File ZIP Archive

File zip cadangan tersimpan di:
`backups/backup_pixelcraft_v1_2026-09-28.zip`

1. Ekstrak isi file `backup_pixelcraft_v1_2026-09-28.zip` ke folder proyek Anda (menimpa file jika diminta).
2. Jalankan `npm install` jika ada dependensi baru yang perlu disinkronkan.
3. Jalankan `npm run dev` untuk menjalankan aplikasi kembali.
