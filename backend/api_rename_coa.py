import requests

base_url = "https://lode.annsa.site/api/v1/master-data/financials/coas"
res = requests.get(base_url)
coas = res.json()

for coa in coas:
    if coa["account_code"] == "21200":
        print(f"Found 21200 with id {coa['id']}. Renaming...")
        put_url = f"{base_url}/{coa['id']}"
        updated_data = coa.copy()
        updated_data["account_name"] = "Hutang Pajak (Lainnya)"
        put_res = requests.put(put_url, json=updated_data)
        if put_res.status_code in [200, 201]:
            print("Renamed successfully!")
        else:
            print(f"Failed: {put_res.status_code} - {put_res.text}")
