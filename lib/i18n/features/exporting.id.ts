import type en from "./exporting.en";

/** Indonesian strings for the download menu and the Word and plain text exports (same shape as `exporting.en.ts`). Wired into lib/i18n/id.ts as `t.exporting`. */
const exporting: typeof en = {
  title: "Unduh",
  menuLabel: "Format unduhan",
  formats: {
    pdf: {
      label: "PDF",
      description: "Untuk dikirim dan dicetak. Membuka jendela cetak browser.",
    },
    docx: {
      label: "Word (.docx)",
      description: "Untuk diedit di Word, Google Docs, atau LibreOffice.",
    },
    txt: {
      label: "Teks biasa (.txt)",
      description: "Hanya teks, untuk ditempel ke formulir lamaran online.",
    },
    json: {
      label: "Cadangan JSON",
      description: "Salinan data Anda yang bisa diimpor lagi nanti.",
    },
  },
  preparing: "Membuat file Word…",
  done: {
    docx: "File Word sudah diunduh.",
    txt: "File teks sudah diunduh.",
    json: "File JSON sudah diunduh.",
  },
  failed: {
    docx: "File Word tidak dapat dibuat. Coba lagi, atau unduh PDF saja.",
    txt: "File teks tidak dapat dibuat. Coba lagi.",
  },
  empty: {
    cv: "CV Anda masih kosong. Isi beberapa data sebelum mengunduh.",
    letter: "Surat Anda masih kosong. Isi beberapa data sebelum mengunduh.",
  },
  wordNote:
    "Word memakai font yang terpasang di komputer yang membuka file. Jika font pilihan Anda tidak terpasang, Word akan menampilkan font yang mirip.",
};

export default exporting;
