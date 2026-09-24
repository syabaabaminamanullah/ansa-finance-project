from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Premium Colors
COLOR_DARK_BLUE = RGBColor(15, 32, 67)
COLOR_TERRACOTTA = RGBColor(194, 89, 52)
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_GRAY = RGBColor(240, 240, 240)
COLOR_TEXT_DARK = RGBColor(50, 50, 50)

def add_premium_slide(title_text, content_text, is_cover=False):
    slide_layout = prs.slide_layouts[6] # Blank layout for full control
    slide = prs.slides.add_slide(slide_layout)
    
    # Background
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
    if is_cover:
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_DARK_BLUE
        bg.line.fill.background()
    else:
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_WHITE
        bg.line.fill.background()
        
        # Add Header Banner
        banner = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(1.2))
        banner.fill.solid()
        banner.fill.fore_color.rgb = COLOR_DARK_BLUE
        banner.line.fill.background()
        
        # Add footer line
        footer = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.3), prs.slide_width, Inches(0.2))
        footer.fill.solid()
        footer.fill.fore_color.rgb = COLOR_TERRACOTTA
        footer.line.fill.background()

    # Add Logo
    logo_path = 'logo_coreterra.png'
    if os.path.exists(logo_path):
        if is_cover:
            slide.shapes.add_picture(logo_path, Inches(5.16), Inches(1.5), width=Inches(3))
        else:
            slide.shapes.add_picture(logo_path, Inches(11.5), Inches(0.2), width=Inches(1.5))

    # Add Text
    if is_cover:
        # Title
        txBox = slide.shapes.add_textbox(Inches(1), Inches(3.5), Inches(11.33), Inches(2))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.add_paragraph()
        p.text = title_text
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(48)
        p.font.bold = True
        p.font.color.rgb = COLOR_WHITE
        
        # Subtitle
        txBox_sub = slide.shapes.add_textbox(Inches(1), Inches(5.5), Inches(11.33), Inches(1.5))
        tf_sub = txBox_sub.text_frame
        tf_sub.word_wrap = True
        p_sub = tf_sub.add_paragraph()
        p_sub.text = content_text
        p_sub.alignment = PP_ALIGN.CENTER
        p_sub.font.size = Pt(22)
        p_sub.font.color.rgb = COLOR_TERRACOTTA
        
    else:
        # Slide Title
        txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(10), Inches(1))
        tf = txBox.text_frame
        p = tf.add_paragraph()
        p.text = title_text.upper()
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = COLOR_WHITE
        
        # Slide Content
        txBox_content = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(12.33), Inches(5.5))
        tf_content = txBox_content.text_frame
        tf_content.word_wrap = True
        
        for line in content_text.split('\n'):
            if not line.strip(): continue
            p = tf_content.add_paragraph()
            p.text = line.replace('*', '').strip()
            
            if line.startswith('##') or line.startswith('**') or ':' in line and len(line) < 60:
                p.font.bold = True
                p.font.size = Pt(20)
                p.font.color.rgb = COLOR_TERRACOTTA
                # Add some spacing before heading
                p.space_before = Pt(14)
            elif line.startswith('-') or line.startswith('1.') or line.startswith('2.') or line.startswith('3.'):
                p.level = 1
                p.font.size = Pt(18)
                p.font.color.rgb = COLOR_TEXT_DARK
                p.space_before = Pt(6)
            else:
                p.font.size = Pt(18)
                p.font.color.rgb = COLOR_TEXT_DARK
                p.space_before = Pt(6)

# Slide 1: Cover
add_premium_slide(
    "COMPANY PROFILE & STRATEGIC OVERVIEW 2026", 
    "Pioneering Precision in Geotechnical Engineering & Resource Exploration\n\nPT CORETERRA GEO ENGINEERING\nCiputat, Tangerang Selatan", 
    is_cover=True
)

# Slide 2
add_premium_slide("Executive Summary", """PT Coreterra Geo Engineering adalah ujung tombak di sektor rekayasa geoteknik, pengeboran, dan survei geofisika. Kami hadir untuk mendisrupsi industri infrastruktur melalui presisi data bawah permukaan yang tak tertandingi.

Masalah Industri:
Pasar terjebak pada layanan konvensional yang lambat dan rentan cost-overrun. Kami memecahkan ini dengan memadukan eksekusi presisi (mobilisasi 5 rig serentak) dan kontrol Cloud ERP real-time.

Traksi & Pencapaian:
- Total Inflow Kuartal III 2026: Rp 1,47 Miliar
- Backlog Pipeline Aktif: Rp 2,07 Miliar (Proyek IKPT Solok)
- Zero Bad-Debt: 0,0% tingkat gagal bayar klien.

Mission Statement:
Menyediakan intelijen geoteknik dan eksekusi pengeboran berstandar global.

Unique Value Proposition:
Zero-Default Financial Integrity dipadukan dengan Agile Rig Mobilization.""")

# Slide 3
add_premium_slide("About Us & Corporate Values", """Sejarah Singkat & Visi 10 Tahun:
Berawal dari eksekusi survei geolistrik berskala menengah, kami bertransformasi menjadi kontraktor geoteknik full-stack. Visi 10 tahun kami adalah berevolusi menjadi Data-Driven Geo-Intelligence Company dengan pemetaan prediktif terlengkap di Indonesia.

3 Nilai Utama (Core Values):
1. Precision Without Compromise: Keakuratan data log bor dan survei geofisika adalah nyawa layanan kami.
2. Lean & Agile Execution: OPEX hanya 1,3%, fokus 98,7% pada eksekusi lapangan (COGS).
3. Safety & Absolute Solvency: Integritas struktural dan finansial (Zero Bank Debt).

Kredibilitas & Legalitas:
- Entitas Legal: Perseroan Terbatas (PT) Tersertifikasi NIB.
- Audit Finansial: Terintegrasi via sistem CoreTerra ERP (Perfect Match 100% Bank Mandiri & CIMB Niaga).""")

# Slide 4
add_premium_slide("The Industry Problem & Pain Points", """1. Kebutaan Data Sub-Permukaan
Banyak proyek bergantung pada data sampel geologi yang minim atau usang, menyebabkan cost overrun > 35% di proyek infrastruktur sipil besar.

2. Inefisiensi Mobilisasi Alat Berat
Pasar didominasi pemain lama yang lamban ke daerah terpencil, mengakibatkan downtime mingguan dan penalti denda (liquidated damages) bagi Main-Con.

3. Cash-Flow Bottlenecks (Kemacetan Kas)
Vendor sering kehabisan napas membiayai operasi (logistik & upah kru) sebelum termin awal dicairkan, menyebabkan proyek terhenti dan kepercayaan klien hancur.""")

# Slide 5
add_premium_slide("Our Solution & Value Proposition", """1. Pengeboran Geoteknik & Struktur Borpile (Agile Drilling)
Metodologi: Pengerahan Multi-Rig serentak (contoh: 5 rig simultan di proyek Solok).
Manfaat: Mempercepat serah terima fase pertama hingga 40%.

2. Eksplorasi Geofisika Presisi Tinggi (Geolistrik & Magnetik)
Metodologi: Pemetaan bawah permukaan non-destruktif dengan magnetometer mutakhir.
Manfaat: Menghemat miliaran rupiah dari potensi kesalahan desain infrastruktur/tambang.

3. ERP-Powered Project Management (Transparansi Real-Time)
Metodologi: Pelaporan operasional harian (Daily Progress) via Cloud ERP.
Manfaat: Memangkas proses approval termin penagihan hingga 30% tanpa sengketa hitungan.""")

# Slide 6
add_premium_slide("Market Size & Business Opportunity", """Pasar layanan geoteknik di Indonesia berada pada fase hyper-growth, didorong oleh masifnya proyek bendungan, tambang, dan PLTA/PLTM:

TAM (Total Addressable Market) - Rp 45 Triliun+
Total pengeluaran nasional tahunan untuk ground engineering, konstruksi fondasi khusus, dan pemetaan sumber daya alam.

SAM (Serviceable Addressable Market) - Rp 8,5 Triliun
Porsi pasar untuk core-drilling tambang, survei geofisika, borpile di Sumatera & Jawa.

SOM (Serviceable Obtainable Market) - Rp 150 Miliar
Target penguasaan kontrak riil PT Coreterra Geo Engineering secara realistis dalam 36 bulan ke depan.""")

# Slide 7
add_premium_slide("Traction & Portfolio Bukti Nyata", """Kinerja Klien & Portofolio B2B (Q3 2026):
- Retensi Klien B2B: Sangat Tinggi (Zero Default).
- Total Portofolio Realized: Rp 1.470.289.340,-
- Backlog Aktif Berjalan: Rp 2.070.000.000,-

Portofolio Klien Strategis Utama:
- PT Solusi Monitoring Indonesia (IKPT Solok): Proyek Borpile, aktif berjalan, 5 Rig.
- Bathwal Corporation / PT Citatah: Limestone Core Drilling, Lunas (Margin +23,0%).
- PT Volta Indo Technology: Geolistrik PLTM Pongkor, Lunas (Margin +43,8%).
- LSI Engineering & Consultants Ltd: Survei Magnetik Bukit Besi, Menunggu Termin.

Studi Kasus Eksekusi:
Proyek PT Citatah mencatatkan surplus margin efisiensi murni sebesar +23,0% (dari inflow 457,6 Juta ditekan outflow menjadi 352,2 Juta).""")

# Slide 8
add_premium_slide("Business Model & Supply Chain Moat", """Cara Kami Mencetak Pendapatan (Revenue Streams):
1. Kontrak Borpile & Struktur: B2B Project-Based, skema progress billing ber-volume tinggi.
2. Jasa Survei Geofisika Dasar: Proyek short-term dengan margin bersih tinggi (+43,8%).
3. Core Drilling Eksplorasi: Kontrak borongan meteran yang pasti terkonversi jadi revenue.

Supply Chain Moat (Benteng Bisnis):
- OPEX Terkendali Ekstrim: Beban Umum & Administrasi hanya 1,3% (Rp 19,69 Juta).
- Fokus Eksekusi COGS (98,7%): Mayoritas pengeluaran langsung jadi mesin operasional.
- Disiplin Vendor & Kas: Zero Bank Debt, tidak tersandera cicilan bunga, sehingga vendor rebar selalu terbayar tepat waktu.""")

# Slide 9
add_premium_slide("Competitive Landscape & Advantage", """Pemetaan Kompetitor:
- Tipe A (Raksasa BUMN/Swasta Besar): Sarat birokrasi, overhead/OPEX raksasa, sangat lambat memobilisasi alat menengah.
- Tipe B (Vendor Alat Skala Kecil): Harga murah tapi nihil manajemen K3, log pelaporan buruk, rawan kabur saat cashflow macet.

Keunggulan Mutlak Coreterra Geo Engineering:
1. Teknologi Pelaporan Real-Time (ERP): Visibilitas mutlak progres & biaya.
2. Ketahanan Likuiditas Bintang Lima: Bantalan kas surplus menjamin vendor & material terbayar, tidak kehabisan napas di tengah drilling.
3. Keseimbangan Hybrid: Kelincahan eksekusi alat setara kontraktor lokal, dengan tata kelola setara konsultan internasional.""")

# Slide 10
add_premium_slide("Financial Highlights & Projection (Investor-Only)", """Kinerja Historis (Q3 2026 Snapshot):
- Revenue Generation (YTD): Rp 1.470.289.340,-
- Net Cash Margin (Surplus): +Rp 77.680.322,-
- Rasio OPEX: 1,3% (Sangat ramping dan efisien)
- Current Backlog: Rp 2,07 Miliar (Kontrak aktif menunggu eksekusi)

Proyeksi Realistis 3-5 Tahun (The Forecast):
- Tahun 1-2: Pertumbuhan pendapatan agregat 300% (YoY) transisi dari 5 ke 15 rig.
- EBITDA: Target stabilisasi margin pada level 25% – 35%.
- Break-Even & Dividen: Payback period dalam siklus 18-24 bulan berkat perputaran termin yang termanajemen ERP.""")

# Slide 11
add_premium_slide("Future Expansion & The Ask (Investor-Only)", """Peta Jalan Ekspansi (3-Year Roadmap):
- Tahun 1: Aggressive Capacity Scale-Up (Akuisisi 10 rig bor medium-deep & mud pump).
- Tahun 2: Geophysical Tech Advancement (Georadar GPR & Downhole logger).
- Tahun 3: Geo-Data as a Service (GDaaS) (Menjual lisensi big data geologi).

The Ask & Alokasi Penggunaan Dana (Fund Allocation):
Kemitraan strategis untuk mendominasi market share.
- 60% - Scaling Up Operasional Capex: Akuisisi alat berat dan magnetometer.
- 25% - Working Capital: Bantalan kas untuk membiayai 3 mega-proyek serentak.
- 15% - R&D Sistem & Penetrasi B2B: Lisensi ERP, Sertifikasi Ahli K3, dan lobi EPC.""")

# Slide 12
add_premium_slide("Closing & Call to Action", """Risiko kegagalan fondasi dan melesetnya eksplorasi bernilai triliunan rupiah. Jangan percayakan fondasi bisnis Anda pada perkiraan di atas kertas. Bermitralah dengan PT Coreterra Geo Engineering.

"Presisi di Setiap Lapisan. Kepastian di Setiap Keputusan."

Jadwalkan Pertemuan Teknis & Pitching Eksklusif:
- Kantor Pusat: Ciputat, Tangerang Selatan, Banten, Indonesia 15411
- Telepon Hotline: 0812-1494-1641
- Email Resmi: admin.cge@coreterra-geo.com
- Portal Digital Terintegrasi: https://lode.annsa.site""")

prs.save('Company_Profile_Premium.pptx')
print('Premium presentation generated!')
