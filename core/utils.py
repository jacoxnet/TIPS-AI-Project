import requests

def fetch_tips_data():
    """Fetches the latest outstanding TIPS from the Treasury Fiscal Data API."""
    url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary"
    params = {
        "page[size]": 50,
        "sort": "-issue_date"
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json().get('data', [])
        tips = []
        
        # Deduplicate by CUSIP since summaries might have multiple entries per CUSIP for different record dates
        seen_cusips = set()
        for item in data:
            cusip = item.get('cusip', 'N/A')
            if cusip not in seen_cusips:
                tips.append({
                    'cusip': cusip,
                    'issue_date': item.get('issue_date', 'N/A'),
                    'maturity_date': item.get('maturity_date', 'N/A'),
                    'interest_rate': item.get('interest_rate', 'N/A'),
                    'ref_cpi': item.get('ref_cpi', 'N/A'),
                })
                seen_cusips.add(cusip)
                
        return tips
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
        return []
