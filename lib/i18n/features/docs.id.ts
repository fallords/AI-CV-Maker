import type en from "./docs.en";

/** Indonesian strings for the multi-document builder shell (same shape as `docs.en.ts`). Wired into lib/i18n/id.ts as `t.docs`. */
const docs: typeof en = {
  title: "Dokumen Anda",
  kinds: { cv: "CV", letter: "Surat lamaran" },
  switcher: {
    label: "Dokumen",
    hint: "Tampilkan semua dokumen",
  },
  letterLanguage: "Bahasa surat",
  letterLanguageHint: "Mengatur bahasa tanggal dan label “Perihal”. Teks yang Anda tulis tidak diterjemahkan.",
  editorTabs: {
    label: "Editor",
    content: "Isi",
  },
  status: {
    unavailable:
      "Penyimpanan browser tidak tersedia, jadi tidak ada yang tersimpan di browser ini. Agar pekerjaan Anda tidak hilang, unduh cadangan JSON sebelum menutup halaman, lalu impor lagi lain kali.",
    quota:
      "Penyimpanan browser penuh, jadi perubahan terakhir Anda belum tersimpan. Hapus dokumen yang tidak diperlukan lagi atau hapus foto agar ada ruang.",
    conflict: "Belum disimpan: dokumen ini diubah di tab atau jendela lain.",
  },
  actions: {
    label: "Tindakan dokumen",
    newCv: "CV baru",
    newLetter: "Surat lamaran baru…",
    allDocs: "Semua dokumen…",
    rename: "Ganti nama",
    duplicate: "Buat salinan",
    delete: "Hapus",
  },
  download: {
    more: "Semua format",
  },
  dialog: {
    intro:
      "Setiap CV dan surat lamaran disimpan terpisah di browser ini. Buka salah satunya untuk mengedit, atau buat yang baru.",
    newCv: "CV baru",
    newLetter: "Surat lamaran baru",
    importFile: "Impor file",
    importHint: "Impor cadangan JSON yang dibuat dengan aplikasi ini. File ditambahkan sebagai dokumen baru, jadi tidak ada yang tertimpa.",
    listLabel: "Dokumen tersimpan",
    empty: "Belum ada yang tersimpan. Apa yang Anda ketik di editor akan tersimpan di sini secara otomatis.",
    emptyUnavailable:
      "Penyimpanan browser tidak tersedia, jadi dokumen tidak bisa disimpan atau ditampilkan di sini. Anda tetap bisa membuat dokumen baru atau mengimpor file, tetapi dokumen itu akan hilang saat halaman ditutup.",
    current: "Sedang dibuka",
    edited: "Diubah {date}",
    open: "Buka",
    rename: "Ganti nama",
    duplicate: "Buat salinan",
    delete: "Hapus",
    nameLabel: "Nama dokumen",
    nameRequired: "Isi nama dokumen.",
    save: "Simpan",
    cancel: "Batal",
    close: "Tutup",
    copyName: "{name} (salinan)",
    letterTitle: "Surat lamaran baru",
    letterFrom: "Salin data Anda dari",
    letterFromNone: "Jangan salin, mulai dengan data kosong",
    letterFromHint: "Nama, jabatan, dan kontak Anda diisi dari CV tersebut. Anda tetap bisa mengubahnya di surat.",
    createLetter: "Buat surat lamaran",
    renamed: "Nama diganti menjadi “{name}”.",
    duplicated: "Salinan dibuat: “{name}”.",
    deleted: "“{name}” sudah dihapus dari browser ini.",
    deletedOpened: "“{name}” sudah dihapus. Sekarang “{next}” yang dibuka.",
  },
  confirmDelete: {
    title: "Hapus “{name}”?",
    body: "Dokumen ini akan dihapus permanen dari browser ini. Jika mungkin masih Anda perlukan, unduh cadangan JSON terlebih dahulu.",
    confirm: "Hapus",
    cancel: "Batal",
  },
  discard: {
    title: "Buang perubahan yang belum disimpan?",
    quota:
      "Penyimpanan browser penuh, jadi perubahan terakhir pada “{name}” tidak dapat disimpan. Untuk menyimpannya, pilih Batal, lalu hapus dokumen yang tidak diperlukan lagi atau hapus foto. Jika Anda melanjutkan, perubahan itu akan hilang.",
    unavailable:
      "Penyimpanan browser tidak tersedia, jadi “{name}” tidak tersimpan di mana pun. Jika Anda melanjutkan, dokumen itu akan diganti dan tidak bisa dikembalikan. Untuk menyimpannya, pilih Batal dan unduh cadangan JSON terlebih dahulu.",
    conflict:
      "“{name}” juga diubah di tab atau jendela lain, jadi perubahan terakhir Anda di sini belum tersimpan. Jika Anda melanjutkan, perubahan itu akan hilang. Untuk menyimpannya, pilih Batal, lalu “Pakai versi saya”.",
    confirm: "Tetap buka (buang perubahan yang belum disimpan)",
    cancel: "Batal",
  },
  conflict: {
    text: "“{name}” diubah di tab atau jendela lain, jadi perubahan terakhir Anda di sini belum tersimpan.",
    loadNewer: "Muat versi yang lebih baru",
    keepMine: "Pakai versi saya",
    loaded: "Versi terbaru “{name}” sudah dibuka.",
    kept: "Versi Anda untuk “{name}” sudah disimpan.",
  },
  rename: {
    title: "Ganti nama dokumen",
    save: "Simpan",
    cancel: "Batal",
  },
  print: {
    titleLetter: "Unduh surat lamaran Anda sebagai PDF",
  },
  messages: {
    corrupted:
      "Ada dokumen tersimpan yang tidak dapat dibaca, jadi dokumen itu disisihkan di browser ini. Dokumen Anda yang lain tidak terpengaruh.",
    created: { cv: "CV baru sudah dibuat.", letter: "Surat lamaran baru sudah dibuat." },
    createdFrom: "Surat lamaran baru sudah dibuat dengan data Anda dari “{name}”.",
    opened: "Sekarang Anda mengedit “{name}”.",
    duplicatedOpened: "Salinan sudah dibuat. Sekarang Anda mengedit “{name}”.",
    renamed: "Nama diganti menjadi “{name}”.",
    deleted: "“{name}” sudah dihapus dari browser ini.",
    deletedOpened: "“{name}” sudah dihapus. Sekarang Anda mengedit “{next}”.",
    imported: "“{name}” sudah diimpor sebagai dokumen baru.",
    importedMigrated: "“{name}” sudah diimpor sebagai dokumen baru dan dikonversi dari format file versi lama.",
    createFailed: {
      unavailable: "Dokumen tidak dapat dibuat karena penyimpanan browser tidak tersedia.",
      quota:
        "Dokumen tidak dapat dibuat karena penyimpanan browser penuh. Hapus dokumen yang tidak diperlukan lagi, atau hapus foto.",
    },
    openFailed: {
      missing: "Dokumen itu tidak ditemukan. Mungkin sudah dihapus di tab lain.",
      corrupted: "Dokumen itu tidak dapat dibaca, jadi disisihkan di browser ini.",
      unavailable: "Penyimpanan browser tidak tersedia, jadi dokumen tidak dapat dibuka.",
    },
    legacyBlocked:
      "Draf Anda dari versi lama aplikasi ini sudah dibuka, tetapi penyimpanan browser penuh, jadi draf itu belum bisa dipindahkan ke “Dokumen Anda”. Draf tetap tersimpan di browser ini. Agar ada ruang, hapus dokumen yang tidak diperlukan lagi atau hapus foto.",
    renameFailed: "Nama baru tidak dapat disimpan. Coba lagi.",
    deleteFailed: "Dokumen tidak dapat dihapus. Coba lagi.",
    importErrors: {
      invalid_json: "File ini bukan JSON yang valid.",
      not_object: "File ini tidak berisi CV atau surat lamaran dari aplikasi ini.",
      unsupported_version: "File ini berasal dari versi aplikasi yang lebih baru atau tidak dikenal, jadi tidak dapat diimpor.",
      too_large: "File ini terlalu besar. Batasnya 5 MB.",
      read_failed: "File tidak dapat dibaca.",
    },
  },
};

export default docs;
