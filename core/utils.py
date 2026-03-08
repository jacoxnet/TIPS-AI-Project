import requests
import datetime

tips_global = []
tips_downloaded_date = None

def fetch_tips_data():
    """
    Fetches the latest outstanding TIPS from the Treasury Fiscal Data API.
    Checks first to see if the TIPS data has already been downloaded for the current date.
    If so, returns the cached data.
    
    """
    global tips_global
    global tips_downloaded_date
    
    if tips_global and tips_downloaded_date == datetime.date.today().isoformat():
        return tips_global, tips_downloaded_date
    
    url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary"
    params = {
        "page[size]": 100,
        "sort": "-maturity_date"
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
                    'issue_date': item.get('original_issue_date', 'N/A'),
                    'maturity_date': item.get('maturity_date', 'N/A'),
                    'interest_rate': item.get('interest_rate', 'N/A'),
                    'ref_cpi': item.get('ref_cpi_on_dated_date', 'N/A'),
                })
                seen_cusips.add(cusip)
                
        # Fetch detailed data for the current date to get index ratios
        today = datetime.date.today().isoformat()
        detail_url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_detail"
        detail_params = {
            "filter": f"index_date:eq:{today}",
            "page[size]": 100
        }
        detail_response = requests.get(detail_url, params=detail_params, timeout=10)
        detail_response.raise_for_status()
        detail_data = detail_response.json().get('data', [])
        
        # Create a mapping from CUSIP to index_ratio
        index_ratios = {item.get('cusip'): item.get('index_ratio') for item in detail_data if item.get('cusip')}
        
        # Assign index_ratio to each tip
        for tip in tips:
            tip['index_ratio'] = index_ratios.get(tip.get('cusip'), 'N/A')

        # Sort the TIPS by maturity date
        tips.sort(key=lambda x: x['maturity_date'])
        tips_global = tips
        tips_downloaded_date = datetime.date.today().isoformat()
        return tips, tips_downloaded_date   
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
        return [], None
