import type en from "./checks.en";

/** Indonesian strings for the CV checker panel (same shape as `checks.en.ts`). Wired into lib/i18n/id.ts as `t.checks`. */
const checks: typeof en = {
  title: "Periksa",
  heading: "Pemeriksaan CV",
  intro:
    "Pemeriksaan ini berjalan di browser Anda. Yang dicari adalah data yang belum diisi dan masalah yang sering muncul, bukan kualitas pengalaman Anda.",
  score: {
    label: "Skor",
    valueText: "{score} dari 100",
    badge: "Skor: {score} dari 100",
    outOf: "dari 100",
    basis: "Dihitung dari kelengkapan CV dan masalah yang tercantum di bawah.",
    bands: {
      high: "CV Anda sudah dalam kondisi baik.",
      medium: "Awal yang baik. Beberapa bagian masih bisa diperkuat.",
      low: "Beberapa bagian penting belum diisi.",
    },
    withErrors: "Perbaiki kesalahan di bawah sebelum CV dikirim.",
  },
  groups: {
    error: "Kesalahan",
    warning: "Peringatan",
    tip: "Saran",
  },
  levels: {
    error: "Kesalahan",
    warning: "Peringatan",
    tip: "Saran",
  },
  counts: {
    error: { one: "1 kesalahan", other: "{count} kesalahan" },
    warning: { one: "1 peringatan", other: "{count} peringatan" },
    tip: { one: "1 saran", other: "{count} saran" },
  },
  list: { separator: ", ", pair: " dan ", last: ", dan " },
  allClear:
    "Tidak ada masalah yang ditemukan. Sebelum mengirim, baca sekali lagi dan pastikan setiap detailnya benar.",
  empty: "CV Anda masih kosong. Isi formulirnya, lalu hasil pemeriksaan akan muncul di sini.",
  emptyAction: "Mulai dari informasi pribadi",
  places: {
    personal: "Informasi pribadi",
    design: "Desain",
    summary: "Ringkasan profesional",
    experience: "Pengalaman kerja",
    education: "Pendidikan",
    projects: "Proyek",
    skills: "Keahlian",
    certifications: "Sertifikasi",
    organizations: "Pengalaman organisasi",
    awards: "Penghargaan",
    languages: "Bahasa",
    references: "Referensi",
    interests: "Minat",
    customUntitled: "Bagian tanpa judul",
  },
  entryUntitled: "Entri {index}",
  rules: {
    missingName: "Tambahkan nama lengkap Anda.",
    missingEmail: "Tambahkan alamat email agar perusahaan bisa membalas lamaran Anda.",
    invalidEmail: "Periksa alamat email Anda. Sepertinya belum lengkap.",
    missingPhone: "Tambahkan nomor telepon. Banyak perekrut menelepon atau mengirim pesan lebih dulu.",
    missingCity: "Tambahkan kota domisili Anda. Perusahaan sering melihat lokasi kandidat.",
    missingTitle: "Tambahkan jabatan profesional, misalnya posisi Anda saat ini atau posisi yang Anda lamar.",
    invalidLinkedin: "Periksa URL LinkedIn. Alamat web ini tidak valid.",
    invalidWebsite: "Periksa URL portofolio atau situs web. Alamat web ini tidak valid.",
    photoAts: "Template ATS Minimal tidak menampilkan foto. Jika ingin foto tampil di CV, pilih template lain.",
    summaryMissing:
      "Tambahkan ringkasan singkat: dua sampai empat kalimat tentang pengalaman Anda dan posisi yang Anda cari.",
    summaryShort: "Ringkasan Anda cukup pendek ({count} karakter). Dua sampai empat kalimat biasanya sudah pas.",
    summaryLong: "Ringkasan Anda panjang ({count} karakter). Usahakan di bawah 800 karakter agar cepat dibaca.",
    noExperienceOrEducation: "Tambahkan setidaknya satu pengalaman kerja atau riwayat pendidikan.",
    noExperience:
      "Belum ada pengalaman kerja di CV Anda. Jika Anda pernah magang, kerja paruh waktu, atau freelance, tambahkan di sini.",
    noEducation: "Tambahkan riwayat pendidikan, setidaknya jenjang terakhir yang sudah Anda selesaikan.",
    noDescription: "Tambahkan beberapa baris tentang tugas Anda di posisi ini dan hasil yang benar-benar Anda capai.",
    noBullets: "Tulis deskripsi dalam bentuk butir: awali setiap baris dengan “-”.",
    noDates: "Entri ini belum punya tanggal. Tambahkan kapan dimulai dan kapan berakhir.",
    noStartDate: "Tambahkan tanggal mulai.",
    noEndDate: "Tambahkan tanggal selesai, atau tandai entri ini sebagai masih berjalan.",
    dateOrder: "Tanggal selesai lebih awal dari tanggal mulai.",
    firstPerson: {
      one: "Satu baris diawali “saya”, “aku”, atau “I”. Poin di CV biasanya ditulis tanpa kata ganti: “Mengelola…”, bukan “Saya mengelola…”.",
      other:
        "{count} baris diawali “saya”, “aku”, atau “I”. Poin di CV biasanya ditulis tanpa kata ganti: “Mengelola…”, bukan “Saya mengelola…”.",
    },
    longLines: {
      one: "Satu baris lebih dari {max} karakter. Poin yang lebih pendek lebih mudah dibaca sekilas.",
      other: "{count} baris lebih dari {max} karakter. Poin yang lebih pendek lebih mudah dibaca sekilas.",
    },
    fewActionVerbs:
      "Hanya {count} dari {total} poin yang diawali kata kerja aktif. Awali dengan kata kerja seperti “Memimpin”, “Membangun”, atau “Meningkatkan” agar setiap poin lebih jelas.",
    noNumbers:
      "Belum ada angka di poin pengalaman kerja Anda. Jika Anda punya data yang nyata, misalnya jumlah anggota tim, volume pekerjaan, atau waktu yang dihemat, tambahkan. Jangan cantumkan angka yang tidak bisa Anda buktikan.",
    noSkills: "Tambahkan beberapa keahlian yang sesuai dengan pekerjaan yang Anda lamar.",
    duplicateSkill: "“{name}” tercantum lebih dari sekali di bagian keahlian.",
    invalidProjectUrl: "Periksa URL proyek. Alamat web ini tidak valid.",
    invalidReferenceEmail: "Periksa alamat email referensi ini. Sepertinya belum lengkap.",
    noExtras:
      "Jika ada, tambahkan proyek, sertifikasi, pengalaman organisasi, penghargaan, atau kemampuan bahasa. Cantumkan hanya yang benar-benar Anda miliki.",
    customNoTitle: "Bagian ini belum berjudul. Tambahkan judul agar pembaca tahu isinya.",
    hiddenSection: "Bagian ini sudah berisi, tetapi disembunyikan dari CV. Anda bisa menampilkannya lagi di tab Desain.",
    tooManyPages:
      "CV Anda {pages} halaman. Umumnya cukup satu atau dua halaman. Coba persingkat deskripsi, atau perkecil ukuran teks, jarak, atau margin di tab Desain.",
    lowContrast:
      "Warna aksen sulit dibaca di atas latar putih (kontras {ratio}:1). Pilih warna yang lebih gelap, minimal 4,5:1.",
  },
};

export default checks;
