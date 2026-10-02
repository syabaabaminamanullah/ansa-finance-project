from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

output_path = r"D:\web dev - ansa\ansa-finance-project\Laporan\Surat_Pernyataan_Non_PKP_Final.pdf"
c = canvas.Canvas(output_path, pagesize=A4)
width, height = A4

# Draw Header from scratch
logo_path = r"D:\web dev - ansa\ansa-finance-project\frontend\public\logo-transparent.png"
if os.path.exists(logo_path):
    # Adjust logo size and position
    c.drawImage(logo_path, 40, height - 100, width=120, height=50, mask='auto')

# Header Text
c.setFont("Helvetica-Bold", 14)
c.setFillColor(HexColor("#1A2B4C")) # Dark blue
c.drawString(170, height - 65, "PT. CORETERRA GEO ENGINEERING")

c.setFont("Helvetica-Bold", 8)
c.setFillColor(HexColor("#F58220")) # Orange
c.drawString(170, height - 77, "GEOTECHNICAL \u2022 DRILLING \u2022 CIVIL ENGINEERING \u2022 MINING CONSULTANT")

c.setFont("Helvetica", 8)
c.setFillColor(HexColor("#666666")) # Gray
c.drawString(170, height - 89, "Ciputat, Tangerang Selatan, Banten, Indonesia, Kode Pos 15411")
c.drawString(170, height - 101, "Email: admin.cge@coreterra-geo.com | Telp: 0822-2110-2761")

# Orange top line
c.setStrokeColor(HexColor("#F58220"))
c.setLineWidth(4)
c.line(40, height - 40, width - 40, height - 40)

# Thin blue line below header
c.setStrokeColor(HexColor("#E0E7FF"))
c.setLineWidth(1)
c.line(40, height - 110, width - 40, height - 110)

# Footer
c.setFillColor(HexColor("#1A2B4C"))
c.rect(0, 0, width, 40, fill=1, stroke=0)
c.setFillColor(HexColor("#F58220"))
c.setFont("Helvetica-Bold", 8)
c.drawString(40, 20, "PT. CORETERRA GEO ENGINEERING")
c.drawString(width/2 - 50, 25, "& THANK YOU FOR YOUR BUSINESS &")
c.setFont("Helvetica", 7)
c.setFillColor(HexColor("#9CA3AF"))
c.drawString(width/2 - 50, 15, "PT Coreterra Geo Engineering \u2022 Procurement System")
c.setFillColor(white if 'white' in globals() else HexColor("#FFFFFF"))
c.drawString(width - 80, 20, "Halaman 1 dari 1")

# --- Document Body ---
c.setFillColor(HexColor("#000000"))
left_margin = 72 
y = height - 180 
line_height = 14

c.setFont("Helvetica-Bold", 12)
c.drawCentredString(width / 2.0, y, "SURAT PERNYATAAN BUKAN PENGUSAHA KENA PAJAK (NON-PKP)")
c.setStrokeColor(HexColor("#000000"))
c.setLineWidth(1)
c.line(width/2.0 - 190, y - 2, width/2.0 + 190, y - 2)
y -= 40

c.setFont("Helvetica", 11)
c.drawString(left_margin, y, "Yang bertanda tangan di bawah ini:")
y -= 25

details = [
    ("Nama", ": Setyo Mardani"),
    ("Jabatan", ": Direktur"),
    ("Nama Perusahaan", ": PT Coreterra Geo Engineering"),
    ("Alamat Perusahaan", ": Gardenia Estate, Blok A5 No 12, Ciputat"),
    ("NPWP Perusahaan", ": 85.043.686.3-411.000")
]
for label, value in details:
    c.drawString(left_margin + 20, y, f"\u2022 {label}")
    c.drawString(left_margin + 150, y, value)
    y -= 20

y -= 15
import textwrap
def draw_paragraph(c, text, x, y, max_width=90):
    lines = textwrap.wrap(text, width=max_width)
    for line in lines:
        c.drawString(x, y, line)
        y -= line_height
    return y

text1 = "Dengan ini menyatakan bahwa sampai dengan saat ini, PT Coreterra Geo Engineering belum dikukuhkan sebagai Pengusaha Kena Pajak (PKP) oleh Direktorat Jenderal Pajak, dikarenakan jumlah peredaran bruto (omzet) perusahaan belum mencapai batasan wajib PKP sesuai peraturan perpajakan yang berlaku (di bawah Rp4,8 Miliar per tahun)."
y = draw_paragraph(c, text1, left_margin, y)
y -= 15

text2 = "Oleh karena itu, dalam setiap transaksi penyerahan Barang/Jasa Kena Pajak, kami:"
y = draw_paragraph(c, text2, left_margin, y)
y -= 10

c.drawString(left_margin + 15, y, "1. Tidak memungut Pajak Pertambahan Nilai (PPN) 12%.")
y -= 20
c.drawString(left_margin + 15, y, "2. Tidak menerbitkan Faktur Pajak.")
y -= 25

text3 = "Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Jika di kemudian hari status perpajakan perusahaan kami berubah menjadi PKP, kami akan segera menginformasikan kepada pihak Mitra/Klien."
y = draw_paragraph(c, text3, left_margin, y)

y -= 50

# Signature
sig_x = width - 230
c.drawString(sig_x, y, "Tangerang Selatan, 1 Oktober 2026")
y -= 15
c.drawString(sig_x + 30, y, "PT Coreterra Geo Engineering")

ttd_path = r"D:\web dev - ansa\ansa-finance-project\frontend\public\ttd-setyo.jpg"
if os.path.exists(ttd_path):
    c.drawImage(ttd_path, sig_x + 50, y - 80, width=100, height=60, mask='auto')
else:
    c.drawString(sig_x + 30, y - 50, "(Meterai Rp10.000 & Tanda Tangan)")

y -= 100
c.setFont("Helvetica-Bold", 11)
c.drawString(sig_x + 70, y, "Setyo Mardani")
c.setFont("Helvetica", 11)
c.line(sig_x + 50, y - 2, sig_x + 170, y - 2)
y -= 15
c.drawString(sig_x + 90, y, "Direktur")

c.save()
print("Done")
