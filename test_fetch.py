import requests
import datetime
today = datetime.date.today().isoformat()
url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_detail"
params = {
    "filter": f"index_date:eq:{today}",
    "page[size]": 100
}
response = requests.get(url, params=params)
data = response.json().get('data', [])
print(f"Fetched {len(data)} records for {today}")
if data:
    print(data[0])
