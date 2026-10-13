import type en from "./design.en";

/** Indonesian strings for the Design panel (appearance and section manager) (same shape as `design.en.ts`). Wired into lib/i18n/id.ts as `t.design`. */
const design: typeof en = {
  title: "Desain",
  appearance: {
    title: "Tampilan",
    intro: "Perubahan langsung terlihat di pratinjau.",
    reset: "Kembalikan tampilan awal",
    resetDone: "Tampilan kembali ke pengaturan bawaan template.",
  },
  accent: {
    legend: "Warna aksen",
    hint: "Dipakai untuk judul dan garis. Bagian yang berwarna bergantung pada template.",
    names: {
      default: "Warna template",
      ink: "Tinta",
      prussian: "Biru prusia",
      forest: "Hijau hutan",
      teal: "Hijau toska",
      burgundy: "Merah marun",
      plum: "Ungu plum",
      graphite: "Grafit",
    },
    custom: "Pilih sendiri",
    pickerLabel: "Pilih warna",
    hexLabel: "Kode warna",
    hexHint: "Kode hex, misalnya #21507a.",
    hexError: "Masukkan kode warna enam digit, misalnya #21507a.",
    contrast: "Kontras di atas kertas putih: {ratio}:1.",
    lowContrast:
      "Warna ini terlalu terang untuk teks di atas kertas putih (kontras {ratio}:1). Judul bisa sulit dibaca, terutama saat dicetak. Pilih warna yang lebih gelap dengan kontras minimal 4,5:1.",
  },
  font: {
    legend: "Jenis huruf",
    hint: "IBM Plex sudah disertakan di situs ini, jadi tampilannya sama di semua perangkat. Huruf sistem bergantung pada perangkat yang membuat PDF.",
    options: {
      default: "Huruf bawaan template",
      sans: "Sans-serif sistem",
      serif: "Serif sistem",
      "plex-sans": "IBM Plex Sans",
      "plex-serif": "IBM Plex Serif",
    },
  },
  fontSize: {
    legend: "Ukuran teks",
    options: { small: "Kecil", medium: "Sedang", large: "Besar" },
    detail: "{size} pt",
  },
  spacing: {
    legend: "Jarak",
    hint: "Jarak antarbaris dan antarbagian. Pilihan rapat bisa membantu CV muat di lebih sedikit halaman.",
    options: { compact: "Rapat", normal: "Normal", relaxed: "Longgar" },
  },
  margin: {
    legend: "Margin halaman",
    hint: "Angkanya adalah margin kiri dan kanan. Margin atas dan bawah ikut menyesuaikan.",
    options: { narrow: "Sempit", normal: "Normal", wide: "Lebar" },
    detail: "{size} mm",
  },
  sections: {
    title: "Bagian CV",
    intro:
      "Urutan bagian mengikuti template sampai Anda memindahkannya. Bagian yang disembunyikan tetap tersimpan, hanya tidak muncul di CV.",
    personalNote: "Informasi pribadi selalu berada di urutan pertama.",
    listLabel: "Urutan bagian CV",
    moveUp: "Pindahkan {name} ke atas",
    moveDown: "Pindahkan {name} ke bawah",
    show: "Tampilkan",
    showLabel: "Tampilkan {name}",
    hiddenNote: "Disembunyikan dari CV",
    emptyNote: "Belum ada isi",
    untitled: "Bagian tanpa judul",
    reset: "Kembalikan urutan template",
    moved: "{name} dipindahkan ke urutan {position} dari {total}.",
    shown: "{name} ditampilkan di CV.",
    hidden: "{name} disembunyikan dari CV.",
    resetDone: "Urutan bagian kembali seperti template.",
  },
};

export default design;
