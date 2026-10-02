import re

with open(r'backend\api\routes\financial_statements.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'        # Determine flow and category.*?cat_code = "KAT-11"', re.DOTALL)

replacement = '''        # Determine flow and category
        # 1. Skip Mutation (Mutasi Antar Kas 11xxx ke 11xxx)
        if opp_coa and opp_coa.account_code.startswith('11'):
            continue

        if cash_line.debit and cash_line.debit > 0:
            flow = "INFLOW"
            amount = float(cash_line.debit)
            category = "[BARU] Penerimaan Kas (Termin Proyek)"
            cat_code = "INFLOW-01"
            is_new = True
        else:
            flow = "OUTFLOW"
            amount = float(cash_line.credit or 0.0)
            is_new = False
            
            # Classification logic (STRICT COA-BASED for consistency)
            if coa_code in ['51731', '51733']: # BPJS, Alat Kesehatan
                category = "MCU + BPJS"
                cat_code = "KAT-01"
            elif coa_code in ['51720', '51200']: # Material
                category = "Material"
                cat_code = "KAT-07"
            elif coa_code in ['54610', '54620', '54300', '51745', '54600']: # Makan, Extra Food, Transport, Mess
                category = "Akomodasi & Meals"
                cat_code = "KAT-05"
            elif coa_code in ['51410', '51750', '51700']: # BBM, Ops Lainnya
                category = "Operasional"
                cat_code = "KAT-10"
            elif coa_code in ['51500', '61100', '53221']: # Gaji, Upah, Insentif
                category = "Gaji Personil"
                cat_code = "KAT-08"
            # Fallback to keywords for legacy data or missing COA
            elif 'sucofindo' in full_text or 'inspeksi alat' in full_text or 'pengujian baja' in full_text or 'labor terpadu' in full_text:
                category = "Sucofindo + Uji Material"
                cat_code = "KAT-02"
            elif ('dp drilling rig' in full_text or 'dp rig' in full_text or 'pelunasan dp rig' in full_text or 'dp ke-dua drilling rig' in full_text) and 'persiapan' not in full_text and 'spare part' not in full_text:
                category = "Rental Rig"
                cat_code = "KAT-06"
            elif 'persiapan drilling' in full_text or 'persiapan rig' in full_text or 'prepare rig' in full_text or 'spare part' in full_text:
                category = "Preparasi Rig"
                cat_code = "KAT-03"
            elif 'travel allowance' in full_text or 'travell allowance' in full_text or 'akomodasi' in full_text or 'meals' in full_text or 'tiket' in full_text or 'flight' in full_text:
                category = "Akomodasi & Meals"
                cat_code = "KAT-05"
            elif 'mobilisasi' in full_text or 'pengiriman material' in full_text:
                category = "Mobilisasi Personil, Rig, Material"
                cat_code = "KAT-04"
            elif 'po-1 material' in full_text or 'toko besi' in full_text:
                category = "Material"
                cat_code = "KAT-07"
            elif 'gaji' in full_text:
                category = "Gaji Personil"
                cat_code = "KAT-08"
            elif 'kasbon' in full_text:
                category = "[BARU] Kasbon Personil / Tim Lapangan"
                cat_code = "KAT-BARU-01"
                is_new = True
            elif 'consumable' in full_text or 'spillbak' in full_text:
                category = "Consumable"
                cat_code = "KAT-09"
            elif 'operasional' in full_text or 'operational' in full_text or 'ops' in full_text or 'meeting' in full_text:
                category = "Operasional"
                cat_code = "KAT-10"
            else:
                category = "Lain-Lain"
                cat_code = "KAT-11"'''

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open(r'backend\api\routes\financial_statements.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('FAILED')
