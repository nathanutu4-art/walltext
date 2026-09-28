# PixelVerse / Infinite Message Canvas (WallText)

> **Platform Kanvas Publik Kolaboratif 1920 × 1080 (2.073.600 Slot Full HD)**  
> Dimana setiap 1 piksel pada tampilan makro (jauh) adalah sebuah dunia mikro 1:1 berisi pesan teks atau karya coretan tangan digital.

---

## 🌟 Fitur Utama

1. **Dual-View Infinite Viewport (Native Canvas 2D Engine)**
   - **Mode Makro ($Zoom < 32\text{px}$ per sel):** Slot yang terisi dirender sebagai 1 blok warna dominan (`dominant_color`). Viewport culling dinamis menjamin 60 FPS tanpa beban memori.
   - **Mode Mikro ($Zoom \ge 32\text{px}$ per sel):** Detail goresan kuas bebas dan teks pesan dirender tajam berbasis vektor native tanpa pixelation.
2. **Editor Halaman 1:1 (Modal Input)**
   - **Brush Tool:** Menggambar bebas dengan ketebalan kuas ($1 - 12\text{ px}$) dan palet warna neon/vibrant.
   - **Text Tool:** Menulis teks pesan dengan pilihan font (*Modern Sans*, *Pixel Mono*, *Serif*) dan ukuran font.
   - **Penghapus (Eraser) & Reset Kanvas.**
   - **Palet Latar Belakang:** Pilihan warna tema (*Cosmic Dark*, *Midnight*, *Cyber Green*, *Deep Purple*, *Crisp White*, dll).
   - **Normalisasi Koordinat:** Titik vektor dinormalisasi ke skala integer internal $0 - 255$ untuk efisiensi penyimpanan ringkas ($\le 1\text{ KB}$ per slot).
   - **Kalkulasi Warna Makro:** Otomatis menentukan warna representasi makro saat karya disimpan.
3. **Navigasi & Eksplorasi**
   - **Pan Layar:** Klik-kiri & drag (desktop) atau touch-and-drag (mobile/tablet).
   - **Zoom Kamera:** Scroll wheel atau pinch-to-zoom dengan pusat zoom otomatis mengarah ke kursor/titik sentuh.
   - **Dynamic Viewport Culling:** Query data sel didebounce 150ms saat pergerakan berhenti untuk performa optimal.
   - **Coordinate HUD & Minimap:** Menampilkan koordinat aktif $(X, Y)$, tingkat perbesaran, mode LOD aktif, dan radar peta $1920 \times 1080$.
   - **Teleport & Pencarian:** Lompat langsung ke koordinat $(X, Y)$ atau cari pesan teks di seluruh kanvas.
4. **Backend & Realtime**
   - **Supabase Integration:** Mendukung PostgreSQL, Row Level Security, dan Supabase Realtime CDC.
   - **Local Offline Engine (Multi-Tab Synced):** Jika kredensial Supabase belum diisi, aplikasi langsung aktif menggunakan IndexedDB / LocalStorage dengan `BroadcastChannel` agar kolaborasi antar-tab tetap berjalan live!

---

## 🚀 Memulai Aplikasi

### 1. Menjalankan Server Pengembangan

```bash
npm run dev
```

Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

### 2. Konfigurasi Supabase (Opsional untuk Produksi)

Aplikasi sudah dapat langsung digunakan tanpa Supabase (menggunakan storage lokal & sinkronisasi multi-tab). Untuk mengaktifkan Supabase PostgreSQL & Realtime:

1. Buat proyek baru di [Supabase](https://supabase.com).
2. Salin isi file `supabase/schema.sql` dan jalankan di **Supabase SQL Editor**.
3. Buat file `.env.local` di root proyek:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://proyek-anda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-anda
   ```
4. Restart development server (`npm run dev`). Status pada navbar dan HUD akan otomatis berubah menjadi **Live Sync (Supabase Terkoneksi)**.

---

## ⌨️ Pintasan Keyboard (Shortcuts)

| Tombol | Fungsi |
| :--- | :--- |
| `/` atau `Ctrl + K` | Buka modal Teleport & Pencarian Pesan |
| `+` atau `=` | Perbesar (Zoom In) |
| `-` | Perkecil (Zoom Out) |
| `H` | Kembali ke Pusat Genesis (1500, 1500) |
| `Drag Mouse` | Geser layar (Pan) |
| `Scroll Wheel` | Perbesar / perkecil ke arah kursor mouse |

---

## 📐 Struktur Folder Proyek

```text
walltext/
├── supabase/
│   └── schema.sql              # Skema DDL PostgreSQL, RLS, & Realtime
├── src/
│   ├── types/
│   │   └── canvas.ts           # Tipe data TypeScript (VectorData, CanvasCell, LOD)
│   ├── lib/
│   │   ├── supabase.ts         # Inisialisasi klien Supabase yang aman
│   │   ├── storage.ts          # Layanan penyimpanan hybrid (Supabase + Multi-Tab Local)
│   │   ├── seed-data.ts        # Karya awal di sekitar pusat origin (1500, 1500)
│   │   └── canvas-renderer.ts  # Mesin render Native 2D Canvas (60 FPS, Culling, LOD)
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── InfiniteCanvas.tsx   # Komponen utama kanvas & pengelola event
│   │   │   ├── CoordinateHud.tsx    # HUD status koordinat, LOD, dan network
│   │   │   ├── CanvasMinimap.tsx    # Radar minimap global 3000x3000
│   │   │   ├── ControlsOverlay.tsx  # Kontrol floating (zoom, center, fullscreen)
│   │   │   └── CellInspectorModal.tsx # Modal inspeksi karya & kutipan
│   │   ├── Editor/
│   │   │   └── CellEditorModal.tsx  # Modal editor 1:1 (brush, text, normalisasi)
│   │   ├── Search/
│   │   │   └── TeleportSearchModal.tsx # Pencarian pesan & teleport koordinat
│   │   └── UI/
│   │       ├── Navbar.tsx           # Navigasi atas & tombol aksi cepat
│   │       └── HelpModal.tsx        # Panduan interaktif aplikasi
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
```
