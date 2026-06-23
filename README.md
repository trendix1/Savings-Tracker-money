# Toples Nabung 🐷

Website pencatat tabungan: tentukan barang yang ingin dibeli, atur penghasilan & pengeluaranmu, lalu lacak progresnya lewat kalender harian/bulanan. Tanpa server, tanpa database — semua data tersimpan di browser kamu sendiri (localStorage), dan siap di-deploy langsung ke Vercel.

## Fitur

- **+ Tambahkan Tabungan** — buat target tabungan baru: nama barang & harga (bisa lebih dari satu baris, otomatis terjumlah jadi Total).
- **Penghasilan harian / bulanan** — pilih frekuensi penghasilanmu. Mode harian punya 7 input opsional (Senin–Minggu) untuk hari-hari kamu biasanya dapat penghasilan. Mode bulanan tinggal isi satu nominal per bulan.
- **Pengeluaran** — satu input pengeluaran (harian/bulanan, ikut pilihan di atas) yang dipakai untuk menghitung penghasilan bersih.
- **Kalender koin** — setelah konfirmasi, aplikasi memperkirakan butuh berapa hari/bulan untuk mencapai target (berdasarkan penghasilan bersih). Tiap kotak kalender bisa diklik:
  - ✓ **Dapat** → masukkan nominal yang masuk, otomatis menambah saldo terkumpul.
  - ✕ **Tidak hari ini** → kalender otomatis menambah 1 hari/bulan lagi ke target (proyeksi mundur, tidak hangus).
- **Selamat! 🎉** — muncul otomatis begitu saldo terkumpul mencapai atau melebihi target.
- **Pengaturan** — tema gelap/terang, dan pemilih bahasa dengan 100+ bahasa (A–Z).

## Struktur file

```
savings-tracker/
├── index.html        ← markup semua tampilan & modal
├── vercel.json        ← konfigurasi statis untuk Vercel
├── css/style.css       ← seluruh styling, tema terang/gelap
└── js/
    ├── languages.js   ← daftar 100+ bahasa untuk pemilih bahasa
    ├── i18n.js          ← mesin & data terjemahan
    ├── storage.js     ← localStorage + util angka/tanggal/proyeksi
    ├── calendar.js    ← logika & render kalender koin
    └── app.js           ← controller utama (routing, form, modal, event)
```

Tidak ada proses build — murni HTML/CSS/JS. Vercel akan otomatis mendeteksinya sebagai situs statis.

## Cara deploy ke Vercel

**Lewat website (paling mudah, tanpa command line):**
1. Buat repo baru di GitHub, upload semua isi folder `savings-tracker/`.
2. Masuk ke [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo tadi.
3. Biarkan semua pengaturan default (Framework: *Other*) → klik **Deploy**.

**Lewat CLI:**
```bash
npm install -g vercel
cd savings-tracker
vercel --prod
```

## Tentang cakupan bahasa

Pemilih bahasa di Pengaturan menampilkan **105 bahasa**, dari Afrikaans sampai Zulu. Karena menerjemahkan setiap teks ke 100+ bahasa secara manual sangat besar risikonya untuk akurasi, aplikasi ini punya dua tingkat:

- **Terjemahan lengkap** (semua teks): Indonesia, Inggris, Melayu, Spanyol, Prancis, Jerman, Portugis, Italia, Belanda, Rusia, Mandarin (Sederhana & Tradisional), Jepang, Korea, Arab, Hindi, Vietnam, Thai.
- **Terjemahan istilah utama** (tombol, hari, label paling sering muncul): Tagalog, Bengali, Tamil, Urdu, Persia, Ibrani, Turki, Ukraina, Polandia, Ceko, Slovakia, Hungaria, Rumania, Bulgaria, Serbia, Yunani, Swedia, Norwegia, Denmark, Finlandia, Swahili, Hausa, Afrikaans, Zulu, Amharik.
- **Bahasa lain** di daftar otomatis tampil dalam **Bahasa Inggris** untuk bagian yang belum diterjemahkan (sistem fallback otomatis, jadi tidak akan ada teks kosong atau error).

Mau menambah/menyempurnakan bahasa tertentu? Tinggal buka `js/i18n.js`, salin satu blok bahasa yang sudah ada (misalnya `const TR = partial(EN, {...})`), terjemahkan isinya, lalu daftarkan kode bahasanya di objek `I18N_PACKS` paling bawah file.

## Catatan teknis

- Aplikasi tidak memaksa simbol mata uang tertentu — kamu bebas memasukkan nominal dalam mata uang apa pun, akan ditampilkan dengan pemisah ribuan sesuai bahasa yang dipilih.
- Data tersimpan secara lokal di perangkat/browser yang dipakai (localStorage). Jika berpindah perangkat atau membersihkan cache browser, data tidak ikut pindah/hilang sesuai itu — ini murni aplikasi sisi klien tanpa akun maupun server.
- Mendukung tampilan RTL otomatis untuk bahasa Arab, Ibrani, Urdu, dan Persia.
