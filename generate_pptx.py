from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

prs = Presentation()
# Set landscape 16:9
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

def add_slide(title, content, layout_idx=1):
    slide_layout = prs.slide_layouts[layout_idx]
    slide = prs.slides.add_slide(slide_layout)
    
    if slide.shapes.title:
        title_shape = slide.shapes.title
        title_shape.text = title
        title_shape.text_frame.paragraphs[0].font.size = Pt(36)
        title_shape.text_frame.paragraphs[0].font.bold = True
        title_shape.text_frame.paragraphs[0].font.color.rgb = RGBColor(0, 51, 102)

    if len(slide.placeholders) > 1:
        body_shape = slide.placeholders[1]
        tf = body_shape.text_frame
        tf.word_wrap = True
        
        # Add content lines
        for line in content.split("\n"):
            if not line.strip(): continue
            p = tf.add_paragraph()
            p.text = line.replace("*", "").strip()
            if line.startswith("##") or line.startswith("**"):
                p.font.bold = True
                p.font.size = Pt(20)
            elif line.startswith("-"):
                p.level = 1
                p.font.size = Pt(16)
            else:
                p.font.size = Pt(18)
    return slide

# Title Slide
slide_layout = prs.slide_layouts[0]
slide = prs.slides.add_slide(slide_layout)
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = "COMPANY PROFILE & STRATEGIC OVERVIEW 2026"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.bold = True
title.text_frame.paragraphs[0].font.color.rgb = RGBColor(128, 64, 0)
subtitle.text = "Pioneering Precision in Geotechnical Engineering & Resource Exploration\n\nPT CORETERRA GEO ENGINEERING\nCiputat, Tangerang Selatan, Banten, Indonesia 15411"

# Slide 2: Executive Summary
add_slide("EXECUTIVE SUMMARY", """PT Coreterra Geo Engineering adalah ujung tombak di sektor rekayasa geoteknik, pengeboran, dan survei geofisika. Kami hadir untuk mendisrupsi industri infrastruktur melalui presisi data bawah permukaan.
Pasar terjebak pada layanan geoteknik konvensional yang lambat dan rentan cost-overrun. Coreterra memecahkan masalah ini dengan memadukan eksekusi presisi (mobilisasi 5 rig serentak) dan kontrol Cloud ERP real-time.
Traksi: Kuartal III 2026, total inflow revenue Rp 1,47 Miliar, backlog pipeline Rp 2,07 Miliar (Proyek IKPT Solok), 0,0% gagal bayar.
Mission Statement: Menyediakan intelijen geoteknik dan eksekusi pengeboran berstandar global.
Unique Value Proposition: Zero-Default Financial Integrity dipadukan dengan Agile Rig Mobilization.
""")

# Slide 3
add_slide("ABOUT US, CORPORATE VALUES & LEGALITY", """Sejarah Singkat & Visi 10 Tahun
Berawal dari eksekusi survei geolistrik berskala menengah, kami bertransformasi menjadi kontraktor geoteknik full-stack. Visi 10 tahun kami adalah berevolusi menjadi Data-Driven Geo-Intelligence Company.
3 Nilai Utama (Core Values):
- Precision Without Compromise: Keakuratan data log bor dan survei.
- Lean & Agile Execution: OPEX hanya 1,3%, fokus 98,7% pada eksekusi lapangan (COGS).
- Safety & Absolute Solvency: Zero bank debt.
Kredibilitas & Legalitas Legal:
- Entitas Legal: Perseroan Terbatas (PT)
- Audit Finansial: Terintegrasi via sistem CoreTerra ERP (Perfect Match Bank Mandiri & CIMB Niaga).
""")

# Slide 4
add_slide("THE INDUSTRY PROBLEM & MARKET PAIN POINTS", """1. Kebutaan Data Sub-Permukaan
Banyak proyek bergantung pada data usang, menyebabkan cost overrun > 35%.
2. Inefisiensi Mobilisasi & Rantai Pasok Alat Berat
Pasar didominasi pemain lama yang lamban, mengakibatkan downtime dan denda (liquidated damages) bagi kontraktor utama.
3. Ketidakjelasan Termin Penagihan (Cash-Flow Bottlenecks)
Vendor sering kehabisan napas membiayai operasi sebelum termin dicairkan, menyebabkan proyek berhenti di tengah jalan.
""")

# Slide 5
add_slide("OUR SOLUTION & VALUE PROPOSITION", """1. Pengeboran Geoteknik & Struktur Borpile (Agile Drilling)
Metodologi: Pengerahan Multi-Rig serentak (contoh: 5 rig simultan di Solok).
Manfaat: Mempercepat serah terima fase pertama hingga 40%.
2. Eksplorasi Geofisika Presisi Tinggi (Geolistrik & Magnetik)
Metodologi: Pemetaan non-destruktif dengan magnetometer & survei geolistrik.
Manfaat: Menghemat miliaran rupiah dari potensi kesalahan desain tambang.
3. ERP-Powered Project Management
Metodologi: Pelaporan operasional harian via Cloud ERP.
Manfaat: Memangkas proses approval termin penagihan hingga 30%.
""")

# Slide 6
add_slide("MARKET SIZE & BUSINESS OPPORTUNITY", """Pasar layanan geoteknik di Indonesia berada pada fase hyper-growth:
- TAM (Total Addressable Market): Rp 45 Triliun+
Total pengeluaran nasional untuk ground engineering & konstruksi fondasi khusus.
- SAM (Serviceable Addressable Market): Rp 8,5 Triliun
Porsi pasar untuk core-drilling tambang, survei geofisika, borpile di Sumatera & Jawa.
- SOM (Serviceable Obtainable Market): Rp 150 Miliar (Target 3 Tahun)
Target penguasaan kontrak riil PT Coreterra Geo Engineering secara realistis dalam 36 bulan.
""")

# Slide 7
add_slide("TRACTION & PORTFOLIO BUKTI NYATA", """Kinerja Klien & Portofolio B2B (Q3 2026):
- Tingkat Retensi Klien B2B: Sangat Tinggi
- Kesehatan Piutang: 0,0% Bad Debt
- Total Portofolio Q3 2026: Rp 1.470.289.340,-
- Backlog Aktif Berjalan: Rp 2.070.000.000,-
Klien Strategis:
- PT Solusi Monitoring Indonesia (IKPT Solok)
- PT Citatah (Limestone Core Drilling)
- PT Volta Indo Technology (PLTM Pongkor)
- LSI Engineering (Survei Magnetik Bukit Besi)
Studi Kasus: PT Citatah mencatatkan surplus margin efisiensi bersih +23,0%.
""")

# Slide 8
add_slide("BUSINESS MODEL & SUPPLY CHAIN MOAT", """Revenue Streams:
1. Kontrak Borpile & Konstruksi Struktur: B2B Project-Based, progress billing.
2. Jasa Survei Geofisika: Margin bersih sangat tinggi (+43,8%) minim material.
3. Core Drilling Eksplorasi Tambang: Borongan per meter lari.
Supply Chain Moat (Efisiensi Vendor):
- OPEX Terkendali Ekstrim: Beban umum hanya 1,3% dari total revenue.
- Fokus 98,7% pada Eksekusi: Mayoritas kas menjadi tenaga operasional (COGS).
- Disiplin Vendor: Nihil pinjaman bank (Zero Debt), manajemen kas ketat.
""")

# Slide 9
add_slide("COMPETITIVE LANDSCAPE & ADVANTAGE", """Pemetaan Kompetitor:
- Kompetitor Tipe A (Raksasa BUMN/Swasta): Sarat birokrasi, overhead raksasa, lambat.
- Kompetitor Tipe B (Vendor Alat Skala Kecil): Modal kerja minim, nihil HSE, sering macet operasi.
Keunggulan Mutlak Coreterra:
1. Teknologi Pelaporan Real-Time (Proprietary ERP): Visibilitas mutlak.
2. Ketahanan Likuiditas Bintang Lima: Bantalan kas surplus menjamin vendor & material terbayar.
3. Keseimbangan Hybrid: Lincah setara kontraktor lokal, kualitas setara firma internasional.
""")

# Slide 10
add_slide("FINANCIAL HIGHLIGHTS & PROJECTION", """Kinerja Historis (Q3 2026 Snapshot):
- Revenue Generation (YTD): Rp 1.470.289.340,-
- Net Cash Margin (Surplus): +Rp 77.680.322,-
- Rasio OPEX: 1,3% (Sangat efisien)
- Current Backlog: Rp 2,07 Miliar
Proyeksi Realistis 3-5 Tahun:
- Tahun 1-2: Pertumbuhan pendapatan 300% (YoY) dengan transisi ke 15 rig aktif.
- EBITDA: Stabil pada level 25% – 35%.
- Break-Even & Dividen: Payback period 18-24 bulan berkat perputaran termin yang disiplin.
""")

# Slide 11
add_slide("FUTURE EXPANSION & THE ASK", """Peta Jalan Ekspansi (3-Year Roadmap):
- Tahun 1: Aggressive Capacity Scale-Up (10 unit drilling rig baru).
- Tahun 2: Geophysical Tech Advancement (Georadar & Downhole logger).
- Tahun 3: Geo-Data as a Service (GDaaS) - Lisensi Big Data Geologi.
The Ask & Alokasi Dana:
Kemitraan strategis (VC/Angel) untuk merealisasikan monopoli market share.
- 60% - Scaling Up Operasional Capex (Akuisisi rig bor & alat geofisika).
- 25% - Working Capital (Bantalan kas untuk 3 proyek raksasa serentak).
- 15% - R&D Sistem & Penetrasi B2B (Upgrade ERP, sertifikasi, lobi).
""")

# Slide 12
add_slide("CLOSING, CALL TO ACTION & CONTACT INFO", """Jangan percayakan fondasi bisnis Anda pada perkiraan di atas kertas. Bermitralah dengan PT Coreterra Geo Engineering; tempat di mana sains, disiplin eksekusi, dan data presisi menyatu.
"Presisi di Setiap Lapisan. Kepastian di Setiap Keputusan."
Jadwalkan Pertemuan Teknis & Pitching Eksklusif:
- Kantor Pusat: Ciputat, Tangerang Selatan, Banten, Indonesia 15411
- Telepon Hotline: 0812-1494-1641
- Email Resmi: admin.cge@coreterra-geo.com
- Portal Terintegrasi: https://lode.annsa.site
""")

prs.save("Company_Profile_Coreterra.pptx")
print("Presentation generated successfully!")
