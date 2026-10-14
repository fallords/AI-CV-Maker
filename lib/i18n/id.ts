import type { Dictionary } from "./en";
import checks from "./features/checks.id";
import design from "./features/design.id";
import docs from "./features/docs.id";
import exporting from "./features/exporting.id";
import letter from "./features/letter.id";
import sections from "./features/sections.id";

/** Indonesian interface strings. */
const id: Dictionary = {
  appName: "Free AI CV Maker",
  nav: {
    home: "Beranda",
    builder: "Pembuat CV",
    help: "Bantuan",
    privacy: "Privasi",
    language: "Bahasa antarmuka",
    skip: "Langsung ke konten utama",
    menu: "Navigasi utama",
  },
  landing: {
    title: "Tulis CV di browser, lalu unduh sebagai PDF",
    subtitle:
      "Saat Anda mengisi formulir, CV langsung tersusun di pratinjau berukuran A4. Tab Periksa menunjukkan data yang belum diisi dan masalah yang sering muncul. Setelah hasilnya sesuai, unduh sebagai PDF, file Word, atau teks biasa.",
    ctaPrimary: "Buat CV gratis",
    ctaSecondary: "Lihat template",
    ctaContinue: "Lanjutkan dokumen yang tersimpan",
    facts: [
      { label: "Biaya", value: "Pembuat CV dan semua format unduhannya gratis. Tidak ada iklan atau paket berbayar." },
      { label: "Akun", value: "Tidak perlu membuat akun." },
      {
        label: "Dokumen Anda",
        value:
          "Disimpan di penyimpanan lokal browser ini, pada perangkat Anda. Anda bisa menyimpan beberapa CV dan surat lamaran, dan tidak ada yang diunggah ke server.",
      },
      {
        label: "Unduhan",
        value: "PDF A4 dengan teks yang bisa dipilih, tanpa watermark. Anda juga bisa mengunduh file Word (.docx) atau teks biasa.",
      },
    ],
    templatesTitle: "Template",
    templatesBody:
      "Template bisa diganti kapan saja di Pembuat CV, dan data yang sudah Anda isi tetap terbawa. Di tab Desain, Anda juga bisa mengubah warna aksen, jenis huruf, ukuran teks, jarak, dan margin. Surat lamaran memakai template yang sama, jadi tampilannya bisa serasi dengan CV Anda.",
    privacyTitle: "Privasi",
    privacyBody:
      "Tidak ada akun dan tidak ada analitik. Pemberitahuan privasi menjelaskan apa saja yang disimpan di browser Anda dan cara menghapusnya.",
    privacyLink: "Baca pemberitahuan privasi",
    faqTitle: "Pertanyaan umum",
    faq: [
      {
        q: "Apakah saya juga bisa menulis surat lamaran di sini?",
        a: "Bisa. Buka “Dokumen Anda”, lalu pilih “Surat lamaran baru”. Nama dan kontak Anda bisa disalin dari salah satu CV, dan surat itu akan memakai template serta desain CV tersebut, jadi keduanya serasi. Surat lamaran bisa diunduh dalam format yang sama dengan CV.",
      },
      {
        q: "Apakah dokumen saya bisa hilang?",
        a: "Bisa, jika Anda menghapus data browser atau menulisnya di mode penyamaran (incognito). Dokumen Anda juga tidak akan ada di perangkat lain. Untuk menyimpan salinan, klik tanda panah di samping “Unduh PDF”, lalu pilih “Cadangan JSON”. Untuk memuatnya lagi, gunakan “Impor file” di “Dokumen Anda”.",
      },
      {
        q: "Apakah CV bisa dibuat dalam bahasa Indonesia?",
        a: "Bisa. Pilih Indonesia di “Bahasa CV”, dan judul bagian serta nama bulan akan berganti ke bahasa Indonesia. Teks yang Anda tulis sendiri tidak diterjemahkan, jadi tulis dalam bahasa yang Anda inginkan. Surat lamaran punya pengaturan yang sama, namanya “Bahasa surat”.",
      },
      {
        q: "Apakah CV saya bisa dibaca oleh sistem pelacak pelamar (ATS)?",
        a: "Gunakan template ATS Minimal. Template ini memakai satu kolom dan judul bagian standar, dan PDF-nya berisi teks asli, bukan gambar. Sebagian besar sistem bisa membacanya dengan baik, meski cara kerja tiap ATS sedikit berbeda. Jika formulir lamaran meminta Anda menempelkan isi CV, unduhan teks biasa berisi konten yang sama tanpa format.",
      },
    ],
    aiFaq: {
      q: "Mengapa ada kata “AI” di nama situs ini?",
      on: "Di bawah kolom ringkasan ada tombol untuk meminta layanan AI menyarankan tulisan ulang ringkasan Anda. Sebelum ada yang dikirim, Anda akan melihat teks persis yang akan dikirim dan diminta persetujuan. Semua fitur lain bisa dipakai tanpa AI.",
      off: "Karena Pembuat CV bisa dilengkapi asisten AI yang menyarankan tulisan ulang ringkasan Anda. Di sini fitur itu belum diaktifkan, jadi teks Anda tidak dikirim ke layanan AI mana pun, dan semua bagian Pembuat CV tetap bisa dipakai.",
    },
  },
  footer: {
    contact: "Kontak",
    rights: "Free AI CV Maker",
  },
  templates: {
    "ats-minimal": {
      name: "ATS Minimal",
      description: "Untuk portal lowongan kerja dan formulir lamaran online. Satu kolom, tanpa foto.",
    },
    "modern-professional": {
      name: "Profesional Modern",
      description: "Untuk lamaran yang dikirim lewat email atau diserahkan langsung. Ada warna aksen dan tempat untuk foto.",
    },
    graduate: {
      name: "Lulusan / Mahasiswa",
      description:
        "Untuk mahasiswa dan lulusan baru. Pendidikan dan proyek ditampilkan sebelum pengalaman kerja, dan keahlian muncul sebagai tag.",
    },
  },
  builder: {
    title: "Pembuat CV",
    loading: "Memuat draf…",
    template: "Template",
    cvLanguage: "Bahasa CV",
    cvLanguageHint: "Mengatur bahasa judul bagian dan tanggal di CV. Teks yang Anda tulis tidak diterjemahkan.",
    languageNames: { en: "Inggris", id: "Indonesia" },
    tabs: { edit: "Ubah", preview: "Pratinjau" },
    saveNow: "Simpan draf",
    downloadPdf: "Unduh PDF",
    more: "Lainnya",
    dismiss: "Tutup",
    status: {
      saved: "Tersimpan di perangkat ini",
      unsaved: "Ada perubahan yang belum disimpan…",
    },
    messages: {
      saved: "Draf tersimpan di perangkat ini.",
      recovered: "Draf Anda dipulihkan dari browser ini.",
    },
    print: {
      title: "Unduh CV Anda sebagai PDF",
      intro: "Setelah ini, jendela cetak browser akan terbuka. Agar hasilnya PDF A4 yang rapi:",
      steps: [
        "Atur Tujuan / Printer ke “Simpan sebagai PDF”.",
        "Atur Ukuran kertas ke A4 dan Margin ke “Default”.",
        "Matikan “Header dan footer”.",
        "Aktifkan “Grafis latar belakang” agar warna template ikut tercetak.",
      ],
      note: "Teks di PDF tetap bisa dipilih dan disalin. Tidak ada watermark yang ditambahkan.",
      dontShow: "Jangan tampilkan petunjuk ini lagi",
      continue: "Buka jendela cetak",
      cancel: "Batal",
      unavailable: "Fitur cetak tidak tersedia di browser ini. Coba Chrome, Edge, Firefox, atau Safari.",
    },
    preview: {
      label: "Pratinjau CV",
      empty: "Pratinjau akan muncul di sini saat Anda mengisi formulir.",
      pageGuide: "Perkiraan batas halaman",
      pageOne: "1 halaman",
      pageMany: "{count} halaman",
      atsPhotoNote: "Template ATS Minimal tidak menampilkan foto.",
    },
  },
  form: {
    sectionNav: "Bagian CV",
    optional: "opsional",
    personal: {
      title: "Informasi pribadi",
      fullName: "Nama lengkap",
      jobTitle: "Jabatan profesional",
      jobTitlePlaceholder: "Contoh: Analis Data",
      email: "Email",
      phone: "Nomor telepon",
      city: "Kota",
      country: "Negara",
      linkedin: "URL LinkedIn",
      website: "URL portofolio / situs web",
      photo: "Foto profil",
      photoHint:
        "Banyak perusahaan di luar Indonesia lebih suka CV tanpa foto, sedangkan di Indonesia foto masih umum dicantumkan.",
      photoUpload: "Unggah foto",
      photoChange: "Ganti foto",
      photoRemove: "Hapus foto",
      photoError: "Pilih gambar PNG, JPEG, atau WebP yang ukurannya di bawah 10 MB.",
      photoAlt: "Pratinjau foto profil",
    },
    summary: {
      title: "Ringkasan profesional",
      label: "Ringkasan",
      placeholder: "Dua sampai empat kalimat tentang pengalaman, kelebihan, dan posisi yang Anda cari.",
      guidance: "{count} karakter. Panjang yang pas sekitar 300 sampai 600.",
      tooLong: "{count} karakter. Sebaiknya dipersingkat agar tetap mudah dibaca.",
    },
    experience: {
      title: "Pengalaman kerja",
      add: "Tambah pengalaman kerja",
      item: "Pengalaman",
      jobTitle: "Jabatan",
      company: "Perusahaan",
      location: "Lokasi",
      startDate: "Tanggal mulai",
      endDate: "Tanggal selesai",
      current: "Saya masih bekerja di sini",
      description: "Tanggung jawab dan pencapaian",
      descriptionHint: "Satu poin per baris. Awali baris dengan “-” untuk membuat butir.",
      empty: "Belum ada pengalaman kerja. Jika tidak relevan, biarkan kosong dan bagian ini tidak akan muncul di CV.",
    },
    education: {
      title: "Pendidikan",
      add: "Tambah pendidikan",
      item: "Pendidikan",
      institution: "Institusi",
      degree: "Gelar / jenjang",
      field: "Bidang studi",
      startDate: "Tanggal mulai",
      endDate: "Tanggal selesai (atau perkiraan)",
      description: "Deskripsi",
      descriptionHint: "Opsional: IPK, predikat, skripsi, atau mata kuliah yang relevan.",
      empty: "Belum ada pendidikan yang ditambahkan.",
    },
    projects: {
      title: "Proyek",
      add: "Tambah proyek",
      item: "Proyek",
      name: "Nama proyek",
      role: "Peran Anda",
      description: "Deskripsi dan pencapaian",
      descriptionHint: "Satu poin per baris. Awali baris dengan “-” untuk membuat butir.",
      technologies: "Teknologi",
      technologiesPlaceholder: "Contoh: React, Python, Figma",
      url: "URL proyek",
      empty: "Belum ada proyek yang ditambahkan.",
    },
    skills: {
      title: "Keahlian",
      technical: "Keahlian teknis",
      soft: "Soft skill",
      addTechnical: "Tambah keahlian teknis",
      addSoft: "Tambah soft skill",
      item: "Keahlian",
      name: "Keahlian",
      level: "Tingkat kemahiran (opsional)",
      levels: { "": "Tanpa label", beginner: "Pemula", intermediate: "Menengah", advanced: "Mahir", expert: "Ahli" },
      emptyTechnical: "Belum ada keahlian teknis yang ditambahkan.",
      emptySoft: "Belum ada soft skill yang ditambahkan.",
    },
    certifications: {
      title: "Sertifikasi",
      add: "Tambah sertifikasi",
      item: "Sertifikasi",
      name: "Nama sertifikasi",
      issuer: "Lembaga penerbit",
      issueDate: "Tanggal terbit",
      credential: "URL atau ID kredensial",
      empty: "Belum ada sertifikasi yang ditambahkan.",
    },
    itemControls: {
      moveUp: "Pindah ke atas",
      moveDown: "Pindah ke bawah",
      remove: "Hapus",
      untitled: "Tanpa judul",
      removeTitle: "Hapus entri ini?",
      removeBody: "Entri ini beserta isinya akan dihapus dari CV Anda.",
      cancel: "Batal",
    },
    errors: {
      email: "Masukkan alamat email yang valid, misalnya nama@contoh.com.",
      url: "Masukkan alamat web yang valid, misalnya linkedin.com/in/nama-anda.",
      dateOrder: "Tanggal selesai lebih awal dari tanggal mulai.",
    },
    monthHint: "Bulan dan tahun",
    month: "Bulan",
    year: "Tahun",
    noMonth: "Tanpa bulan",
  },
  ai: {
    sectionTitle: "Bantuan menulis dengan AI",
    disabled: "Fitur AI tidak aktif. Semua fungsi Pembuat CV ini berjalan tanpa AI.",
    rewrite: "Sarankan ringkasan yang lebih baik (AI)",
    consentTitle: "Kirim teks ini ke layanan AI?",
    consentBody:
      "Hanya teks ringkasan di bawah ini yang akan dikirim ke layanan AI yang diatur oleh pengelola situs ini. Layanan tersebut dapat memproses dan menyimpan teks sesuai kebijakannya sendiri.",
    consentCheckbox: "Saya setuju mengirim teks ini untuk permintaan ini.",
    send: "Kirim",
    cancel: "Batal",
    working: "Menunggu layanan AI…",
    reviewTitle: "Tinjau saran",
    reviewWarning: "Saran AI bisa keliru atau mengarang detail. Baca setiap kata dan simpan hanya yang benar.",
    original: "Teks Anda",
    suggestion: "Saran",
    apply: "Ganti ringkasan saya",
    discard: "Buang",
    error: "Layanan AI tidak dapat dihubungi. Teks Anda tidak diubah.",
    empty: "Tulis ringkasan terlebih dahulu.",
  },
  help: {
    title: "Cara menggunakan Pembuat CV",
    intro: "Petunjuk menulis CV dan surat lamaran di Pembuat CV, termasuk pengaturan cetak untuk tiap browser.",
    sections: [
      {
        title: "Mengisi CV",
        body: [
          "Buka Pembuat CV, lalu isi bagian yang sesuai dengan Anda. Semua kolom boleh dikosongkan, dan bagian yang kosong tidak akan muncul di CV.",
          "Selain pengalaman kerja, pendidikan, proyek, keahlian, dan sertifikasi, ada juga bagian untuk pengalaman organisasi, penghargaan, bahasa, referensi, dan minat. Untuk hal lain, misalnya kursus atau publikasi, gunakan “Tambah bagian khusus” lalu beri judul sendiri.",
          "Gunakan tombol “Tambah …” untuk menambah entri dan tombol panah untuk mengubah urutannya. Biasanya entri terbaru diletakkan paling atas.",
          "Di kolom deskripsi, tulis satu poin per baris. Baris yang diawali “-” akan menjadi butir.",
        ],
      },
      {
        title: "Template dan bahasa CV",
        body: [
          "Anda bisa berganti antara ATS Minimal, Profesional Modern, dan Lulusan / Mahasiswa kapan saja. Isi CV tidak berubah.",
          "“Bahasa CV” mengatur bahasa judul bagian dan nama bulan di CV (Inggris atau Indonesia). Teks yang Anda tulis tidak diterjemahkan.",
        ],
      },
      {
        title: "Dokumen Anda",
        body: [
          "Anda bisa menyimpan beberapa CV dan surat lamaran di browser ini. Di awal toolbar, di bawah tulisan “Dokumen”, ada nama dokumen yang sedang dibuka. Klik nama itu untuk membuka “Dokumen Anda”. Di sana Anda bisa membuka, mengganti nama, membuat salinan, atau menghapus dokumen, membuat CV atau surat lamaran baru, dan mengimpor file. Menu “Lainnya” juga berisi Ganti nama, Buat salinan, dan Hapus untuk dokumen yang sedang dibuka.",
          "Setiap dokumen tersimpan otomatis di browser ini sesaat setelah setiap perubahan, dan juga saat Anda mengklik “Simpan draf”.",
          "Membuat salinan CV adalah cara cepat untuk menyiapkan versi lain bagi jenis pekerjaan yang berbeda. “Impor file” menambahkan cadangan JSON sebagai dokumen baru, jadi dokumen yang sudah ada tidak tertimpa. Dokumen yang dihapus akan hilang permanen dari browser ini.",
          "Jika Anda sudah memakai Pembuat CV sebelum fitur beberapa dokumen tersedia, draf dan draf sebelumnya Anda kini ada di “Dokumen Anda”.",
          "Penyimpanan browser bukan cadangan. Dokumen Anda tidak akan ada jika Anda menghapus data browser, memakai mode penyamaran (incognito), atau membuka situs ini di perangkat lain. Unduh cadangan JSON untuk dokumen yang ingin Anda simpan.",
        ],
      },
      {
        title: "Mengubah desain",
        body: [
          "Tab Desain, di samping tab Isi, mengubah tampilan dokumen yang sedang dibuka: warna aksen, jenis huruf, ukuran teks, jarak, dan margin halaman. Pengaturannya hanya berlaku untuk dokumen itu, dan perubahannya langsung terlihat di pratinjau. “Kembalikan tampilan awal” mengembalikan pengaturan bawaan template.",
          "Jika Anda memilih warna aksen sendiri, akan muncul peringatan bila warnanya terlalu terang untuk dibaca di atas kertas putih.",
          "Untuk CV, tab Desain juga menampilkan daftar bagian CV. Pindahkan bagian ke atas atau ke bawah untuk mengubah letaknya di CV, atau matikan “Tampilkan” agar bagian itu tidak muncul di CV tanpa menghapus isinya. “Kembalikan urutan template” mengembalikan urutan bawaan template. Nama dan kontak Anda selalu berada paling atas.",
        ],
      },
      {
        title: "Memeriksa CV",
        body: [
          "Tab Periksa memberi CV Anda skor dari 100 dan menampilkan daftar kesalahan, peringatan, dan saran. Yang diperiksa antara lain kontak yang belum diisi, entri tanpa tanggal, tanggal selesai yang lebih awal dari tanggal mulai, ringkasan yang terlalu pendek atau terlalu panjang, dan CV yang lebih dari dua halaman.",
          "Klik salah satu temuan untuk langsung menuju kolom atau pengaturan yang dimaksud.",
          "Pemeriksaan ini berjalan di browser Anda dan tidak memakai AI. Pemeriksaan bisa menemukan data yang belum diisi dan masalah yang sering muncul, tetapi tidak bisa menilai kualitas pengalaman Anda. Jika ada saran untuk menambahkan angka atau bagian lain, tambahkan hanya yang benar.",
        ],
      },
      {
        title: "Surat lamaran",
        body: [
          "Untuk membuat surat, buka “Dokumen Anda”, lalu pilih “Surat lamaran baru”. Nama, jabatan, dan kontak Anda bisa disalin dari salah satu CV, dan surat itu akan memakai template serta desain CV tersebut. Nanti, “Salin data dari CV” di formulir surat bisa menyalin data itu lagi.",
          "Setelah itu, isi penerima, tanggal dan perihal, salam pembuka, teks utama, dan salam penutup. Pisahkan setiap paragraf dengan satu baris kosong.",
          "“Bahasa surat” mengatur bahasa tanggal dan label “Perihal”. Teks yang Anda tulis tidak diterjemahkan. Surat berbahasa Indonesia mencantumkan kota Anda di depan tanggal, misalnya “Bandung, 13 Oktober 2026”.",
          "Surat lamaran punya tab Desain sendiri dan bisa diunduh dalam format yang sama dengan CV. Tab Periksa hanya tersedia untuk CV.",
        ],
      },
      {
        title: "Mengunduh PDF",
        body: [
          "PDF dibuat oleh fungsi cetak di browser Anda sendiri. Teks di dalamnya tetap bisa dipilih, dan tidak ada watermark yang ditambahkan.",
        ],
        steps: [
          "Klik “Unduh PDF”. Jendela cetak browser akan terbuka dan hanya berisi CV atau surat dalam halaman A4.",
          "Pilih “Simpan sebagai PDF” (Chrome, Edge), “Microsoft Print to PDF” (Windows), atau “PDF → Simpan sebagai PDF” (macOS / Safari).",
          "Atur ukuran kertas ke A4 dan margin ke Default.",
          "Matikan “Header dan footer”, lalu aktifkan “Grafis latar belakang”.",
        ],
        after: [
          "Di iPhone atau iPad, buka pratinjau cetak, ketuk tombol Bagikan, lalu pilih “Simpan ke File”. Di Android, pilih “Simpan sebagai PDF” sebagai printer.",
        ],
      },
      {
        title: "Word, teks biasa, dan cadangan JSON",
        body: [
          "Klik tanda panah di samping “Unduh PDF” untuk melihat format lainnya. Sama seperti PDF, semua file ini dibuat di browser Anda.",
          "Word (.docx) untuk diedit di Word, Google Docs, atau LibreOffice. Word memakai font yang terpasang di komputer yang membuka file, jadi jika font pilihan Anda tidak terpasang, Word akan menampilkan font yang mirip.",
          "Teks biasa (.txt) berisi konten yang sama tanpa format, untuk ditempel ke formulir lamaran online.",
          "Cadangan JSON adalah salinan data dokumen. Simpan di tempat yang aman, lalu gunakan “Impor file” di “Dokumen Anda” untuk memuatnya lagi, di browser ini atau di browser lain. File yang dibuat lewat “Ekspor JSON” di versi Pembuat CV sebelumnya juga bisa diimpor.",
        ],
      },
      {
        title: "Tips menulis",
        body: [
          "Awali setiap butir dengan kata kerja aktif dan tulis hasil yang benar-benar Anda capai. Cantumkan angka hanya jika bisa dibuktikan.",
          "Tulis ringkasan dalam dua sampai empat kalimat, dan sesuaikan dengan lowongan yang Anda lamar.",
          "Jika perusahaan memakai sistem pelacak pelamar (ATS), pilih template ATS Minimal dan pertahankan judul bagian standar.",
        ],
      },
    ],
  },
  privacy: {
    title: "Pemberitahuan privasi",
    updated: "Terakhir diperbarui: Oktober 2026",
    sections: [
      {
        title: "Ringkasan",
        body: [
          "Free AI CV Maker tidak memiliki akun pengguna, basis data, iklan, maupun analitik. CV dan surat lamaran yang Anda tulis diproses di browser dan hanya disimpan di perangkat Anda.",
        ],
      },
      {
        title: "Apa yang disimpan dan di mana",
        body: [
          "CV dan surat lamaran Anda disimpan di penyimpanan lokal browser, dengan kunci yang diawali “free-cv-maker:”. Yang disimpan adalah daftar dokumen beserta nama dan tanggalnya, satu kunci untuk setiap dokumen, ID dokumen yang terakhir Anda buka, dan dua preferensi: bahasa antarmuka dan apakah petunjuk cetak perlu ditampilkan.",
          "Jika dokumen yang tersimpan tidak dapat dibaca, isinya disisihkan di kunci “free-cv-maker:” tersendiri, bukan dihapus.",
          "Draf dari versi lama aplikasi ini, yang hanya menyimpan satu draf (kunci “free-cv-maker:draft” dan “free-cv-maker:backup”), dipindahkan ke daftar dokumen saat Anda membuka Pembuat CV lagi. Setelah itu, kunci lama tersebut dihapus.",
          "Penyimpanan lokal bukan layanan cloud yang terenkripsi. Siapa pun yang bisa membuka profil browser ini dapat membacanya, dan datanya bisa terhapus saat Anda menghapus data penjelajahan, memakai mode penyamaran (incognito), atau saat browser perlu mengosongkan ruang. Unduh cadangan JSON jika Anda ingin punya salinan.",
        ],
      },
      {
        title: "Apa yang dikirim lewat internet",
        body: [
          "Saat situs ini dimuat, file aplikasinya diambil dari penyedia hosting (misalnya Cloudflare). Seperti penyedia hosting pada umumnya, penyedia ini dapat menyimpan log teknis standar seperti alamat IP dan jenis browser.",
          "Isi CV dan surat lamaran Anda tidak dikirim ke mana pun. Pemeriksaan CV juga berjalan di browser Anda. File PDF dibuat oleh fungsi cetak di browser Anda sendiri.",
          "File Word, teks biasa, dan JSON dibuat di browser Anda dan langsung diunduh ke perangkat Anda.",
        ],
      },
      {
        title: "Fitur AI opsional",
        body: [
          "Fitur AI tidak aktif kecuali pengelola situs ini mengaktifkannya. Jika fitur ini aktif, tombol AI akan selalu meminta persetujuan eksplisit Anda sebelum mengirim teks tertentu yang ditampilkan kepada Anda ke layanan AI yang telah diatur. Tanpa persetujuan itu tidak ada yang dikirim, dan saran baru diterapkan setelah Anda meninjaunya.",
        ],
      },
      {
        title: "Menghapus data Anda",
        body: [
          "Untuk menghapus satu dokumen, buka “Dokumen Anda” di Pembuat CV, lalu pilih “Hapus”. Untuk menghapus semua data yang disimpan aplikasi ini di browser ini, termasuk semua dokumen dan preferensi, gunakan tombol di bawah ini.",
        ],
      },
    ],
    eraseButton: "Hapus semua data aplikasi ini",
    eraseConfirmTitle: "Hapus semua data aplikasi ini?",
    eraseConfirmBody:
      "Semua CV, surat lamaran, dan preferensi Anda akan dihapus dari browser ini. Tindakan ini tidak bisa dibatalkan.",
    eraseConfirm: "Hapus semuanya",
    cancel: "Batal",
    erased: "Semua data lokal telah dihapus.",
    eraseFailed: "Penyimpanan browser tidak tersedia, jadi tidak ada data yang bisa dihapus.",
  },
  // Feature dictionaries live in ./features so each feature owns its own file.
  sections,
  design,
  checks,
  docs,
  exporting,
  letter,
};

export default id;
