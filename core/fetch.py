import requests
import datetime
import os

from core.tipsdata import Tips

def fetch_tips_data():
    """
    Fetches the latest outstanding TIPS from the Treasury Fiscal Data API.
    Checks first to see if the TIPS data has already been downloaded for the current date.
    If so, returns the cached data.
    
    """

    # if already downloaded for today, don't do anything
    if Tips.download_date == datetime.date.today().isoformat():
        print (f"DEBUG: TIPS data already downloaded for today ({Tips.download_date}). Skipping fetch.")
        return
    Tips.all_tips = []
    url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary"
    params = {
        "page[size]": 100,
        "sort": "-maturity_date"
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json().get('data', [])
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
        
    # Deduplicate by CUSIP since summaries might have multiple entries per CUSIP for different record dates
    seen_cusips = set()
    for item in data:
        cusip = item.get('cusip', 'N/A')
        if cusip not in seen_cusips:
            # create new Tips with this downloaded data
            tips = Tips(
                cusip=cusip,
                issue_date=item.get('original_issue_date', 'N/A'),
                maturity_date=item.get('maturity_date', 'N/A'),
                interest_rate=item.get('interest_rate', 'N/A'),
                ref_cpi=item.get('ref_cpi_on_dated_date', 'N/A')
            )
            Tips.all_tips.append(tips)
            seen_cusips.add(cusip)
    try:
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
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
    
    # Create a mapping from CUSIP to index_ratio
    index_ratios = {item.get('cusip'): item.get('index_ratio') for item in detail_data if item.get('cusip')}
    
    # Assign index_ratio to each tip
    for tip in Tips.all_tips:
        tip.index_ratio = index_ratios.get(tip.cusip, 'N/A')

    # Sort the TIPS by maturity date and set the download date
    Tips.all_tips.sort(key=lambda x: x.maturity_date)
    
    Tips.download_date = datetime.date.today().isoformat()
    
    return


def fetch_cpi_data(as_of_date):
    """
    Fetches the CPI-U data (CPIAUCNS) from FRED for the latest date and the given as_of_date.
    Returns a tuple (latest_cpi_value, as_of_cpi_value).
    If as_of_date is not provided or invalid, returns (1.0, 1.0) so inflation factor is 1.0.
    """
    if not as_of_date:
        return 1.0, 1.0
        
    # Ensure as_of_date is in YYYY-MM-DD format (if it's YYYY-MM, append -01)
    if len(as_of_date) == 7:
        as_of_date += "-01"
        
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS"
    try:
        # Download the CSV text
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        
        # Parse lines, skip header
        lines = res.text.strip().split('\n')
        
        # The last line with a valid float is the latest CPI
        latest_cpi = 1.0
        for line in reversed(lines):
            parts = line.split(',')
            if len(parts) == 2:
                try:
                    cpi_val = float(parts[1])
                    latest_cpi = cpi_val
                    break
                except ValueError:
                    pass
        print(f"DEBUG Latest CPI from CSV: {latest_cpi}")

        # Find the As-Of CPI
        # We find the latest observation before or on that date
        as_of_cpi = 1.0
        for line in reversed(lines):
            parts = line.split(',')
            if len(parts) == 2:
                date_str = parts[0].strip()
                if date_str <= as_of_date:
                    try:
                        as_of_cpi = float(parts[1])
                        break
                    except ValueError:
                        pass
        print(f"DEBUG As-Of CPI from CSV: {as_of_cpi}")
        
    except Exception as e:
        print(f"Error fetching CPI from FRED CSV: {e}")
        return 1.0, 1.0
        
    return latest_cpi, as_of_cpi
