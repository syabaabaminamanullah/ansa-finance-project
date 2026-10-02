from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
import os

# Create a temporary PDF with just the text
packet = io.BytesIO()
c = canvas.Canvas(packet, pagesize=A4)
width, height = A4

# Configuration
left_margin = 72 # 1 inch
y = height - 320 # start below the "FROM / TO" boxes
line_height = 14

def draw_text(c, text, x, y, font="Helvetica", size=11, bold=False):
    c.setFont(font + ("-Bold" if bold else ""), size)
    c.drawString(x, y, text)

# Title
c.setFont("Helvetica-Bold", 12)
c.drawCentredString(width / 2.0, y, "SURAT PERNYATAAN BUKAN PENGUSAHA KENA PAJAK (NON-PKP)")
c.line(width/2.0 - 200, y - 2, width/2.0 + 200, y - 2) # Underline
y -= 30

c.setFont("Helvetica", 11)
c.drawString(left_margin, y, "Yang bertanda tangan di bawah ini:")
y -= 20

# List
details = [
    ("Nama", ": Setyo Mardani / Nama Direktur"),
    ("Jabatan", ": Direktur"),
    ("Nama Perusahaan", ": PT Coreterra Geo Engineering"),
    ("Alamat Perusahaan", ": Bandung, Jawa Barat (Mohon lengkapi alamat detail)"),
    ("NPWP Perusahaan", ": [Nomor NPWP Perusahaan]")
]
for label, value in details:
    c.drawString(left_margin + 20, y, f"\u2022 {label}")
    c.drawString(left_margin + 140, y, value)
    y -= 15

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
y -= 10

text2 = "Oleh karena itu, dalam setiap transaksi penyerahan Barang/Jasa Kena Pajak, kami:"
y = draw_paragraph(c, text2, left_margin, y)
y -= 5

c.drawString(left_margin + 10, y, "1. Tidak memungut Pajak Pertambahan Nilai (PPN) 12%.")
y -= 15
c.drawString(left_margin + 10, y, "2. Tidak menerbitkan Faktur Pajak.")
y -= 20

text3 = "Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Jika di kemudian hari status perpajakan perusahaan kami berubah menjadi PKP, kami akan segera menginformasikan kepada pihak Mitra/Klien."
y = draw_paragraph(c, text3, left_margin, y)

y -= 30

# Signature
sig_x = width - 250
c.drawString(sig_x, y, "Bandung, 1 Oktober 2026")
y -= 15
c.drawString(sig_x, y, "PT Coreterra Geo Engineering")

# Add Tanda Tangan Image if exists
ttd_path = r"D:\web dev - ansa\ansa-finance-project\frontend\public\ttd-setyo.jpg"
if os.path.exists(ttd_path):
    c.drawImage(ttd_path, sig_x, y - 60, width=80, height=50, mask='auto')
else:
    c.drawString(sig_x, y - 50, "(Meterai Rp10.000 & Tanda Tangan)")

y -= 80
c.drawString(sig_x, y, "[Setyo Mardani / Nama Lengkap]")
y -= 15
c.drawString(sig_x, y, "Direktur")

c.save()
packet.seek(0)

# Merge
new_pdf = PdfReader(packet)
existing_pdf = PdfReader(open(r"D:\web dev - ansa\ansa-finance-project\Laporan\Kop_Surat_PT_Coreterra_Geo_Engineering.pdf", "rb"))
output = PdfWriter()

# Read the first page of the template
page = existing_pdf.pages[0]
page.merge_page(new_pdf.pages[0])
output.add_page(page)

# Write output
output_path = r"D:\web dev - ansa\ansa-finance-project\Laporan\Surat_Pernyataan_Non_PKP_Final.pdf"
with open(output_path, "wb") as outputStream:
    output.write(outputStream)

print(f"Saved to {output_path}")
