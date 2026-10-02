import requests

base_url = 'https://lode.annsa.site/api/v1'
coas = requests.get(base_url + '/master-data/financials/coas').json()
mandiri_coa = next((c for c in coas if '11210' in c['account_code']), None)
cimb_coa = next((c for c in coas if '11220' in c['account_code']), None)
petty_coa = next((c for c in coas if '11100' in c['account_code']), None)

journals = requests.get(base_url + '/finance/journals?limit=10000').json()

balances = {'mandiri': 0, 'cimb': 0, 'petty': 0}

for j in journals:
    for line in j.get('lines', []):
        if mandiri_coa and line['account_id'] == mandiri_coa['id']:
            balances['mandiri'] += line['debit'] - line['credit']
        elif cimb_coa and line['account_id'] == cimb_coa['id']:
            balances['cimb'] += line['debit'] - line['credit']
        elif petty_coa and line['account_id'] == petty_coa['id']:
            balances['petty'] += line['debit'] - line['credit']
            
mandiri_new = balances['mandiri'] + 104444932.96
total = mandiri_new + balances['cimb'] + balances['petty']

print(f"Mandiri: {mandiri_new:,.2f}")
print(f"CIMB: {balances['cimb']:,.2f}")
print(f"Petty Cash: {balances['petty']:,.2f}")
print(f"Total: {total:,.2f}")
