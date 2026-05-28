import requests
import datetime
import os
from .models import Tips, Cpi
from django.core.exceptions import ObjectDoesNotExist
from zoneinfo import ZoneInfo

# This is a hard-coded CPI value for October 2025 which replaces the missing data
# point in the FRED data due to the government shutdown. This value is midway between
# the September 2025 CPI (324.800) and the November 2025 CPI (324.122).
HARD_CODED_CPI_2025_10 = 324.461

TIMEZONE = ZoneInfo("America/New_York")
PRETIPSDATE = datetime.datetime(1997, 1, 1, 0, 0, 0)
# URL for fetching TIPS summary data
TIPSURL = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary"
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
CPIURL = "https://api.stlouisfed.org/fred/series/observations"


def fetch_tips_data():
    """
    Updates TIPS database for most recent values if necessary
    """
    # Determine most recently updated date from the Tips database
    try:
        most_recent_date = Tips.objects.all().order_by('-updated').first().updated
        print(f"DEBUG: Most recent TIPS data update in database: {most_recent_date}")
    except Exception as e:
        print(f"DEBUG: No TIPS data found in database. Exception: {e}")
        most_recent_date = PRETIPSDATE
    
    # no need to access API if we already retrieved data today
    if most_recent_date.date() >= datetime.datetime.now(tz=TIMEZONE).date():
        print("DEBUG: TIPS data is already up to date for today. Skipping API call.")
        return
    
    params = {
        "page[size]": 100,
        "sort": "-maturity_date",
        "filter": f"dated_date:gte:{most_recent_date.date().isoformat()}"
    }
    try:
        response = requests.get(TIPSURL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json().get('data', [])
        print(f"DEBUG: Fetched {len(data)} TIPS records from API.")
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
        
    # Add TIPS to database if necessary, using cusip as unique identifier
    for item in data:
        cusip = item.get('cusip', None)
        if cusip:
            # get or create TIPS with this cusip
            if not Tips.objects.filter(cusip=cusip).exists():
                print(f"DEBUG: Adding new TIPS with cusip {cusip} to database.")
                new_Tips = Tips.objects.create(cusip=cusip, 
                                               dated_date=item.get('dated_date', 'N/A'), 
                                               maturity_date=item.get('maturity_date', 'N/A'), 
                                               coupon_rate=item.get('interest_rate', 'N/A'), 
                                               ref_cpi=item.get('ref_cpi_on_dated_date', 'N/A'), 
                                               index_ratio=1.0)
                new_Tips.save()
        else:
            print(f"DEBUG: TIPS with cusip {cusip} already exists in database. Skipping.")
    return


def fetch_cpi_data():
    """
    Updates the database of CPI-U data and queries FRED for the latest data if not already avaible for today.
    """
    # Determine most recently updated date from the CPI database
    try:
        most_recent_date = Cpi.objects.all().order_by('-updated').first().updated
        print(f"DEBUG: Most recent CPI data update in database: {most_recent_date}")
    except ObjectDoesNotExist:
        print("DEBUG: No CPI data found in database.")
        most_recent_date = PRETIPSDATE
    
    # no need to access API if we already retrieved data today
    if most_recent_date.date() >= datetime.datetime.now(tz=TIMEZONE).date():
        print("DEBUG: CPI data is already up to date for today. Skipping API call.")
        return
    
    params = {
        "series_id": "CPIAUCNS",
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "sort_order": "desc",
        "observation_start": most_recent_date.date().isoformat()
        }
        
    try:
        res = requests.get(CPIURL, params=params, timeout=10)
        res.raise_for_status()
        observations = res.json().get('observations', [])
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
    # add to database if necessary, using as_of_date as unique identifier
    for obs in observations:
        obdate = obs.get('date', None)
        if obdate:
            # get or create CPI entry with this date
            if not Cpi.objects.filter(as_of_date=obdate).exists():
                print(f"DEBUG: Adding new CPI observation for date {obdate} to database.")
            new_cpi = Cpi.objects.create(as_of_date=obdate, 
                                         cpi_value = obs.get('value', 1.0))
            # set value field of new CPI obs
            new_cpi.cpi_value = float(obs.get('value', 0.0))
            new_cpi.save()

