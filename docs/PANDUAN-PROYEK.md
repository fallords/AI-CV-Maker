# Panduan Memahami Proyek Free AI CV Maker

Dokumen ini untuk pemilik proyek. Anda tidak perlu bisa coding untuk membacanya. Isinya menjelaskan apa yang dikerjakan aplikasi ini, bagaimana cara kerjanya, di mana letak bagian-bagiannya, dan apa saja yang perlu Anda ketahui saat mengelolanya.

Untuk detail teknis (struktur kode, algoritma, cara menambah fitur), baca [DOKUMEN-TEKNIS.md](./DOKUMEN-TEKNIS.md).

---

## 1. Singkatnya

Free AI CV Maker adalah situs web untuk membuat CV dan surat lamaran secara gratis. Pengguna mengisi formulir, melihat hasilnya langsung dalam bentuk lembar A4, lalu mengunduhnya sebagai PDF, Word, atau teks biasa.

Tiga hal yang membuatnya berbeda dari kebanyakan pembuat CV:

1. **Gratis sepenuhnya.** Tidak ada langganan, iklan, watermark, atau batas unduhan.
2. **Tanpa akun.** Pengguna langsung bisa menulis tanpa mendaftar.
3. **Data tidak keluar dari perangkat.** CV disimpan di browser pengguna sendiri, bukan di server kita. Kita memang tidak punya server untuk menyimpannya.

Kata "AI" ada di nama, tetapi fitur AI **mati secara default**. Semua fitur utama, termasuk pemeriksa kualitas CV, berjalan tanpa AI.

---

## 2. Apa yang bisa dilakukan pengguna

| Fitur | Penjelasan sederhana |
| --- | --- |
| Menulis CV | Data diri (bisa dengan foto), ringkasan, pengalaman kerja, pendidikan, proyek, keahlian teknis dan soft skill, sertifikasi, organisasi dan relawan, penghargaan, bahasa, referensi, minat. Pengguna juga bisa membuat hingga 20 bagian sendiri, misalnya "Kursus" atau "Publikasi". |
| Menulis surat lamaran | Pengirim (bisa disalin otomatis dari CV), penerima, tanggal, perihal, salam pembuka, isi, salam penutup, dan tanda tangan. |
| Banyak dokumen | Satu browser bisa menyimpan banyak CV dan surat. Pengguna bisa membuka, mengganti nama, menggandakan, dan menghapusnya. |
| 3 template | **ATS Minimal** (satu kolom, polos, paling aman untuk sistem penyaring lamaran), **Modern Professional** (nama bergaya serif, garis aksen, bisa pakai foto), **Graduate / Student** (pendidikan dan proyek di atas, cocok untuk lulusan baru). |
| Desain | Warna aksen, jenis huruf, ukuran teks, jarak antarbaris, dan margin halaman. Bagian CV juga bisa diurutkan ulang atau disembunyikan. |
| Pemeriksa CV | Memberi skor 0–100 dan daftar saran, misalnya "email belum diisi", "tanggal terbalik", atau "CV lebih dari 2 halaman". Klik sebuah saran untuk langsung melompat ke kolom yang perlu diperbaiki. |
| Pratinjau langsung | Lembar A4 di samping formulir berubah setiap kali pengguna mengetik. Ada garis putus-putus yang menandai perkiraan batas halaman. |
| Unduh | PDF (lewat fitur cetak browser), Word (`.docx`), teks biasa (`.txt`), dan cadangan JSON. |
| Dua bahasa | Tampilan situs tersedia dalam bahasa Inggris dan Indonesia. Bahasa CV bisa berbeda dari bahasa tampilan. Misalnya, tampilan berbahasa Indonesia tetapi CV ditulis dalam bahasa Inggris. |

---

## 3. Perjalanan pengguna, langkah demi langkah

1. Pengguna membuka halaman utama, lalu menekan **Create Your Free CV** (atau **Buat CV gratis**).
2. Halaman **builder** terbuka. Di kiri ada formulir dengan tiga tab (label Inggris / Indonesia):
   - **Content / Isi**: mengisi isi CV.
   - **Design / Desain**: mengatur tampilan.
   - **Check / Periksa**: melihat skor dan saran. Tab ini hanya ada untuk CV, tidak untuk surat.
3. Di kanan ada pratinjau A4. Di ponsel, formulir dan pratinjau dipisah menjadi dua tab, **Edit / Ubah** dan **Preview / Pratinjau**.
4. Setiap perubahan **tersimpan otomatis** sekitar setengah detik setelah pengguna berhenti mengetik. Status "Saved on this device / Tersimpan di perangkat ini" terlihat di toolbar.
5. Pengguna memilih template dan bahasa CV di toolbar.
6. Pengguna menekan **Download PDF / Unduh PDF**. Browser membuka dialog cetak, lalu pengguna memilih "Simpan sebagai PDF". Format lain ada di menu **All formats / Semua format** di sebelahnya.
7. Saat situs dibuka lagi di browser yang sama, CV terakhir langsung muncul kembali.

---

## 4. Cara kerjanya, dengan perumpamaan

### Situs tanpa server ("static site")

Bayangkan situs ini seperti **brosur digital yang pintar**. Saat dibangun (*build*), seluruh aplikasi diubah menjadi kumpulan file biasa: HTML, CSS, JavaScript, dan font. File-file itu diletakkan di Vercel atau Cloudflare, yang tugasnya hanya mengirimkan file ke pengunjung.

Semua pekerjaan lain dilakukan di **browser pengunjung**: menyimpan CV, membuat PDF dan Word, sampai menghitung skor. Akibatnya:

- **Biaya server hampir nol.** Tidak ada database atau server yang harus dibayar.
- **Privasi kuat.** Data CV tidak pernah dikirim ke mana pun.
- **Tidak ada login atau sinkronisasi.** CV di laptop tidak otomatis muncul di ponsel.

### Penyimpanan: "laci" di dalam browser

Setiap browser punya laci kecil bernama **localStorage** untuk tiap situs. CV pengguna disimpan di laci itu. Yang perlu diketahui:

- Ukuran laci kira-kira **5 MB**. Itu cukup untuk banyak CV, tetapi foto ikut memakan tempat. Karena itu foto otomatis dikecilkan menjadi 360 piksel.
- Kalau pengguna menghapus data situs, memakai mode penyamaran, atau berganti browser atau perangkat, **CV tidak ikut**.
- Untuk berjaga-jaga, pengguna bisa mengunduh **cadangan JSON** dan mengimpornya lagi kapan saja.
- Kalau situs dibuka di dua tab sekaligus, aplikasi tidak akan diam-diam menimpa perubahan dari tab lain. Pengguna akan ditanya ingin menyimpan versi yang mana.

### PDF: memakai mesin cetak browser

Tombol **Download PDF** membuka dialog **Cetak** bawaan browser, dan pengguna memilih **Simpan sebagai PDF**. Cara ini dipilih karena:

- Hasilnya berupa **teks asli** yang bisa dipilih, disalin, dan dibaca sistem ATS, bukan gambar.
- Tidak butuh server dan tidak ada watermark.
- Hasilnya rapi di A4, dan judul bagian tidak tertinggal sendirian di bawah halaman.

Kekurangannya: pengguna harus memilih "Simpan sebagai PDF" sendiri. Di beberapa browser, header/footer juga perlu dimatikan. Halaman Bantuan menjelaskan langkahnya untuk tiap browser.

### Word dan teks

File Word dibuat langsung di browser dengan sebuah pustaka bernama `docx`. Pustaka itu baru diunduh saat pengguna pertama kali meminta file Word, supaya situs tetap ringan. Teks biasa (`.txt`) berguna untuk ditempel ke formulir lamaran online.

### Pemeriksa CV: daftar aturan, bukan AI

Pemeriksa CV bekerja seperti **daftar periksa**. Ada lebih dari 30 aturan, misalnya "apakah ada email?", "apakah tanggal mulai sebelum tanggal selesai?", atau "apakah poin-poin pengalaman diawali kata kerja?".

- Skor dimulai dari 100. Setiap kekurangan mengurangi poin.
- CV kosong bernilai 0. CV tanpa temuan bernilai 100.
- Pemeriksa **tidak pernah menyarankan mengarang** pengalaman, angka, atau prestasi. Sarannya hanya meminta detail yang memang dimiliki pengguna.

### AI: tersedia, tapi dimatikan

Kode untuk AI sudah ada (saat ini untuk menulis ulang ringkasan), tetapi **tidak aktif**. Untuk menyalakannya, Anda perlu:

1. Membuat server perantara (*proxy*) sendiri yang menyimpan kunci API penyedia AI. Kunci itu **tidak boleh** ditaruh di kode situs.
2. Mengisi alamat proxy itu di pengaturan build (`NEXT_PUBLIC_AI_PROXY_URL`).
3. Menyiapkan anggaran, karena layanan AI dibayar per pemakaian.

Bahkan saat aktif, pengguna harus **menyetujui** setiap pengiriman dan **meninjau** hasilnya sebelum dipakai.

---

## 5. Peta proyek: "kalau mau mengubah X, lihat di Y"

Struktur folder utama:

```
app/          Halaman situs (utama, builder, privasi, bantuan) dan gaya global (warna, gaya CV, aturan cetak)
components/   Potongan tampilan: formulir, pratinjau, template CV, toolbar, dialog
lib/          "Otak" aplikasi: bentuk data CV, penyimpanan, pemeriksa, ekspor, terjemahan
tests/        Tes otomatis (unit dan end-to-end)
public/       File yang disajikan apa adanya (header keamanan untuk Cloudflare)
docs/         Dokumen ini dan dokumen teknis
```

| Ingin mengubah… | File yang perlu dilihat |
| --- | --- |
| Teks di situs (judul, tombol, penjelasan) versi Inggris | `lib/i18n/en.ts` dan `lib/i18n/features/*.en.ts` |
| Teks di situs versi Indonesia | `lib/i18n/id.ts` dan `lib/i18n/features/*.id.ts` |
| Judul bagian di dalam CV ("Work Experience", "Pengalaman Kerja") | `lib/cv-format.ts` |
| Warna dan font situs | `app/globals.css`, bagian `@theme` di paling atas |
| Tampilan CV di pratinjau dan PDF | `app/globals.css` (kelas `.cv-*` dan `.tpl-*`) dan `components/templates/` |
| Pilihan warna aksen CV, font, dan margin | `lib/doc-style.ts` |
| Aturan pemeriksa CV dan bobot skornya | `lib/cv-checks.ts` |
| Isi halaman utama | `components/pages/LandingContent.tsx` |
| Isi halaman Bantuan dan Privasi | `components/pages/HelpContent.tsx`, `components/pages/PrivacyContent.tsx` |
| Email kontak di footer | Bukan di kode, tetapi variabel `NEXT_PUBLIC_CONTACT_EMAIL` di pengaturan Vercel |
| Pengaturan keamanan (header) | `vercel.json` (Vercel) dan `public/_headers` (Cloudflare) |

> Setelah mengubah teks di salah satu bahasa, ubah juga versi bahasa lainnya. Kedua kamus harus punya kunci yang sama. Kalau tidak, pemeriksaan TypeScript akan gagal.

---

## 6. Privasi dan keamanan, yang sudah dijamin

- **Tidak ada server penyimpan data.** CV hanya ada di browser pengguna.
- **Tidak ada analitik, pelacak, atau iklan.** Isi CV juga tidak pernah ditulis ke log.
- **Tidak ada file dari luar.** Font disertakan di dalam situs, jadi PDF tidak bergantung pada layanan lain. Ini juga diuji otomatis.
- **Header keamanan ketat** (Content-Security-Policy). Browser hanya boleh memuat file dari situs ini sendiri dan tidak boleh mengirim data ke alamat lain.
- **File impor diperiksa.** File JSON yang diimpor divalidasi dan dibersihkan. Tautan hanya boleh `http`/`https`, dan foto hanya boleh berupa gambar.
- **Tidak ada rahasia di repositori.** Tidak ada kunci API atau kata sandi yang disimpan di kode.
- Halaman **Privasi** punya tombol **Hapus semua data lokal** untuk menghapus seluruh data aplikasi dari browser.

---

## 7. Biaya

| Hal | Biaya |
| --- | --- |
| Menjalankan situs di Vercel (paket Hobby) | Gratis, **tetapi hanya untuk penggunaan pribadi atau non-komersial**. Penggunaan komersial butuh paket Pro yang berbayar. |
| Menjalankan situs di Cloudflare Pages | Gratis, dan boleh untuk penggunaan komersial. |
| Domain sendiri (misalnya `cvmaker.id`) | Berbayar per tahun ke pendaftar domain. Opsional. |
| Fitur AI | **Berbayar per pemakaian** ke penyedia AI, ditambah hosting proxy. Saat ini mati, jadi biayanya nol. |

---

## 8. Alur kerja perubahan: dari kode sampai online

```
Perubahan kode → branch kerja di GitHub → Pull Request → digabung ke main → Vercel otomatis build dan deploy
```

- **main** adalah versi resmi. Vercel memantau `main` dan men-deploy ulang setiap kali ada perubahan.
- Perubahan dikerjakan di **branch** terpisah, lalu digabung lewat **Pull Request** (PR) supaya bisa ditinjau dulu.
- Sebelum digabung, seluruh tes otomatis dijalankan dan harus lulus.
- Status deploy bisa dicek di dashboard Vercel → proyek Anda → tab **Deployments**.

Riwayat besar proyek ini:

1. [PR #1](https://github.com/fallords/AI-CV-Maker/pull/1): versi pertama (builder, 3 template, PDF, dua bahasa) dan desain gelap dengan aksen biru.
2. [PR #2](https://github.com/fallords/AI-CV-Maker/pull/2): bagian CV tambahan, pengaturan desain, pemeriksa CV, surat lamaran, ekspor Word dan teks, serta banyak dokumen.

---

## 9. Pertanyaan yang sering muncul

**Kenapa PDF harus lewat dialog cetak? Kenapa tidak langsung terunduh?**
Membuat PDF berkualitas tinggi tanpa server paling andal dilakukan oleh mesin cetak browser. Hasilnya teks asli yang ramah ATS dan tanpa watermark. Alternatifnya, PDF dibuat di server atau PDF berupa gambar, akan menambah biaya atau menurunkan kualitas.

**Pengguna bilang CV-nya hilang. Kenapa?**
Biasanya karena mereka membuka situs dari browser atau perangkat lain, memakai mode penyamaran, atau membersihkan data browser. Sarankan selalu mengunduh **cadangan JSON**.

**Bisakah ditambah login dan sinkronisasi antarperangkat?**
Bisa, tetapi butuh server, database, dan kebijakan privasi baru. Biaya berjalan juga akan muncul. Ini perubahan besar dari konsep "data tetap di perangkat".

**Apakah CV-nya ramah ATS?**
Template **ATS Minimal** mengikuti panduan umum: satu kolom, judul standar, dan teks asli. Namun tidak ada alat yang bisa menjamin semua sistem ATS membacanya dengan sempurna.

**Kenapa halaman sempat tampil berbahasa Inggris sebentar sebelum berganti ke Indonesia?**
Halaman disiapkan dalam bahasa Inggris saat build. Pilihan bahasa pengguna baru diterapkan sesaat setelah halaman terbuka. Mesin pencari juga melihat versi Inggris.

**Apakah aman kalau saya mengubah teks sendiri lewat GitHub?**
Aman untuk teks di file `lib/i18n/...`. Pastikan tanda kutip tidak terhapus dan versi Inggris maupun Indonesia diubah bersama. Vercel akan menolak deploy kalau ada kesalahan ketik yang merusak kode, dan versi lama tetap online.

---

## 10. Keterbatasan yang perlu Anda ketahui

- PDF diuji paling teliti di Chrome. Firefox dan Safari bisa memotong halaman sedikit berbeda.
- Garis batas halaman di pratinjau hanya **perkiraan**.
- File Word memakai font yang terpasang di komputer pembukanya, jadi tampilannya bisa sedikit berbeda dari PDF.
- Mengurutkan entri memakai tombol naik/turun, bukan seret dan lepas (*drag and drop*).
- Belum ada lisensi open-source. Tentukan lisensinya sebelum menerima kontribusi dari orang lain.

---

## 11. Kamus istilah

| Istilah | Arti |
| --- | --- |
| **Next.js** | Kerangka kerja untuk membangun situs dengan React. Proyek ini memakai versi 16. |
| **React** | Pustaka untuk membangun tampilan dari potongan-potongan kecil (komponen). |
| **TypeScript** | JavaScript dengan pemeriksaan tipe, sehingga banyak kesalahan tertangkap sebelum situs berjalan. |
| **Tailwind CSS** | Cara menulis gaya tampilan langsung di komponen. |
| **Static export / situs statis** | Situs yang sudah jadi berupa file biasa, tanpa server yang menjalankan kode. |
| **Build** | Proses mengubah kode sumber menjadi file siap online (folder `out/`). |
| **Deploy** | Menaruh hasil build di layanan hosting supaya bisa diakses publik. |
| **localStorage** | Tempat penyimpanan kecil di browser untuk tiap situs. |
| **JSON** | Format teks untuk menyimpan data terstruktur. Dipakai untuk cadangan CV. |
| **ATS** | *Applicant Tracking System*, perangkat lunak perusahaan yang menyaring lamaran secara otomatis. |
| **CSP** | *Content-Security-Policy*, aturan keamanan yang membatasi apa yang boleh dimuat dan dikirim halaman. |
| **Branch** | Salinan kode untuk mengerjakan perubahan tanpa mengganggu versi utama. |
| **Pull Request (PR)** | Permintaan untuk menggabungkan perubahan dari branch ke `main`. |
| **Unit test** | Tes otomatis untuk bagian kecil kode, misalnya "apakah skor CV kosong = 0?". |
| **End-to-end (e2e) test** | Tes otomatis yang membuka browser sungguhan dan meniru pengguna: mengisi formulir, mengunduh PDF, dan seterusnya. |
| **Schema / versi skema** | Bentuk data CV. Kalau bentuknya berubah, versinya naik dan data lama diubah otomatis ke bentuk baru (migrasi). |
