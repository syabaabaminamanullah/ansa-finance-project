import requests
import json

base_url = "https://lode.annsa.site/api/v1/master-data/financials/coas"

tax_coas = [
    # Taxes
    {"account_code": "11601", "account_name": "PPN Masukan (VAT In)", "account_type": "Current Asset", "normal_balance": "Debit"},
    {"account_code": "21201", "account_name": "PPN Keluaran (VAT Out)", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21202", "account_name": "Hutang PPh Pasal 21", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21203", "account_name": "Hutang PPh Pasal 23", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21204", "account_name": "Hutang PPh Pasal 4 ayat (2) Final", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "81100", "account_name": "Beban Pajak Penghasilan Badan", "account_type": "Expense", "normal_balance": "Debit"},

    # Missing accounts
    {"account_code": "12310", "account_name": "Akum. Penyusutan Peralatan Lab", "account_type": "Asset", "normal_balance": "Credit"},
    {"account_code": "12410", "account_name": "Akum. Penyusutan Peralatan Kantor", "account_type": "Asset", "normal_balance": "Credit"},
    {"account_code": "21210", "account_name": "Hutang Gaji", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21220", "account_name": "Hutang BPJS", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "51751", "account_name": "Biaya Asuransi Proyek (CAR)", "account_type": "Expense", "normal_balance": "Debit"},
]

for coa in tax_coas:
    print(f"Creating {coa['account_name']}...")
    res = requests.post(base_url, json=coa)
    if res.status_code in [200, 201]:
        print(f"  -> SUCCESS")
    else:
        print(f"  -> FAILED: {res.status_code} - {res.text}")
