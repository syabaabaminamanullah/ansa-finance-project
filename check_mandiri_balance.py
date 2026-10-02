import requests

base_url = 'https://lode.annsa.site/api/v1'
coas = requests.get(base_url + '/master-data/financials/coas').json()
mandiri_coa = next((c for c in coas if '11210' in c['account_code']), None)

journals = requests.get(base_url + '/finance/journals?limit=10000').json()
balance = 0
for j in journals:
    for line in j.get('lines', []):
        if line['account_id'] == mandiri_coa['id']:
            balance += line['debit'] - line['credit']
            
target = 53480644.51
print(f'COA: {mandiri_coa["account_name"]}')
print(f'Current Balance: {balance}')
print(f'Difference (Kekurangan uang): {target - balance}')
