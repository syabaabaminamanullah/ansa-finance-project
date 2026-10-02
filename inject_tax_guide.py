import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\TaxCalculatorPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I want to add a tax guide section at the bottom of the page, inside the main container but below the calculator.
# Let's find the end of the container. We can search for the last `</div>` before the final `</div>\n    </div>\n  );\n}`

guide_html = """
      <div className="mt-8 bg-blue-50/50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Buku Panduan Pajak & Jurnal Coreterra
        </h2>
        
        <div className="space-y-6 text-sm text-slate-700">
          {/* Section 1 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">1. Kamus Singkat Pajak Bisnis Anda</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>PPN Masukan (12%):</strong> Muncul saat membayar vendor yang sudah PKP. Karena Coreterra <strong>Non-PKP</strong>, PPN ini <strong>TIDAK BISA</strong> diklaim. Langsung catat PPN ini menyatu sebagai <span className="font-medium">Biaya Proyek / Material</span>.</li>
              <li><strong>PPN Keluaran:</strong> Utang Pajak. Karena Coreterra <strong>Non-PKP</strong>, PPN Keluaran Anda selalu <strong>Rp 0</strong>.</li>
              <li><strong>PPh Pasal 23:</strong> Potongan pajak jasa korporasi / sewa alat. Tarif standar <strong>2%</strong>. (COA: <span className="text-blue-700 font-mono">21203 - Hutang PPh Pasal 23</span>).</li>
              <li><strong>PPh Pasal 4 ayat (2) Final:</strong> Potongan pajak khusus Jasa Konstruksi. Tarif <strong>1,75%</strong> (SBU Kecil). (COA: <span className="text-blue-700 font-mono">11600 - Pajak Dibayar Dimuka</span> saat dipotong klien).</li>
              <li><strong>PPh Pasal 21:</strong> Potongan atas Gaji/Upah perorangan. Bebas pajak jika di bawah PTKP. (COA: <span className="text-blue-700 font-mono">21202 - Hutang PPh Pasal 21</span>).</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">2. Panduan Alur Dokumen & Jurnal di Web Aplikasi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <h4 className="font-medium text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  A. Sisi Belanja ke Vendor (Procure-to-Pay)
                </h4>
                <p className="text-xs text-slate-500 mb-2">Contoh: Jasa Rebar PT UAP (Harga Jasa 66 Juta + PPN 12%)</p>
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 1: Terima Tagihan (Menu AP Invoices)</p>
                    <p className="text-slate-600">[Debit] 51100 Biaya Subkontraktor = 73.920.000 <span className="font-sans italic text-slate-400">*(66 Juta + PPN dilebur jadi biaya)</span></p>
                    <p className="text-slate-600">[Kredit] 21100 Hutang Usaha (AP) = 73.920.000</p>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 2: Bayar (Menu Payment)</p>
                    <p className="text-slate-600">[Debit] 21100 Hutang Usaha (AP) = 73.920.000</p>
                    <p className="text-slate-600 pl-4">[Kredit] 21203 Hutang PPh Pasal 23 = 1.320.000 <span className="font-sans italic text-slate-400">*(2% dari 66 Juta)</span></p>
                    <p className="text-slate-600 pl-4">[Kredit] 11210 Bank Mandiri IDR = 72.600.000 <span className="font-sans italic text-slate-400">*(Uang riil keluar)</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <h4 className="font-medium text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  B. Sisi Menagih ke Klien (Order-to-Cash)
                </h4>
                <p className="text-xs text-slate-500 mb-2">Contoh: Tagih Proyek ke PT SMI (625 Juta)</p>
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 1: Kirim Invoice Termin</p>
                    <p className="text-slate-600">[Debit] 11300 Piutang Usaha (AR) = 625.000.000</p>
                    <p className="text-slate-600">[Kredit] 40000 Pendapatan Proyek = 625.000.000</p>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 2: Terima Pembayaran</p>
                    <p className="text-slate-600">[Debit] 11210 Bank Mandiri IDR = 614.062.500 <span className="font-sans italic text-slate-400">*(Uang riil masuk)</span></p>
                    <p className="text-slate-600">[Debit] 11600 Pajak Dibayar Dimuka = 10.937.500 <span className="font-sans italic text-slate-400">*(Bukti PPh 4(2) 1.75%)</span></p>
                    <p className="text-slate-600 pl-4">[Kredit] 11300 Piutang Usaha (AR) = 625.000.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1">
              <span className="text-amber-500">⭐</span> Golden Rules (Aturan Emas Administrasi)
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-900">
              <ol className="list-decimal pl-4 space-y-2">
                <li><strong>Jika Kita Memotong Pajak Vendor (PPh 23):</strong> Kita wajib membuatkan Bukti Potong Elektronik via e-Bupot Unifikasi di DJP Online paling lambat akhir bulan, lalu kirim PDF-nya ke vendor. Jangan lupa setor uangnya pakai Kode Billing!</li>
                <li><strong>Jika Klien Memotong Pajak Kita (PPh Final):</strong> Kita wajib menagih/meminta lembar Bukti Potong PPh Pasal 4 ayat (2) kepada klien (PT SMI) setelah mereka transfer, karena itu adalah "surat sakti" pengurang Pajak Tahunan Coreterra.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
"""

# Let's inject this before the last closing tags of the page component.
# Usually `</Layout>` or `</div>\n    </div>\n  );\n};` or similar.

if "</div>\n    </Layout>" in content:
    content = content.replace("</div>\n    </Layout>", guide_html + "\n      </div>\n    </Layout>")
else:
    # Use a regex to find the last `</div>` before `);\n}`
    idx = content.rfind("</div>\n    </div>\n  );\n}")
    if idx != -1:
         content = content[:idx] + guide_html + "\n    " + content[idx:]
    else:
         content = content.replace("</Layout>", guide_html + "\n    </Layout>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected guide into TaxCalculatorPage.tsx")
