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
    
    params = {
        "page[size]": 100,
        "sort": "-maturity_date",
        "filter": f"dated_date:gte:{most_recent_date.date().isoformat()}"
    }
    try:
        response = requests.get(TIPSURL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json().get('data', [])
    except Exception as e:
        print(f"Error fetching TIPS data: {e}")
        
    # Add TIPS to database if necessary, using cusip as unique identifier
    for item in data:
        cusip = item.get('cusip', None)
        if cusip:
            # get or create TIPS with this cusip
            new_Tips = Tips.objects.get_or_create(cusip=cusip)[0]
            # set other fields of new Tips
            new_Tips.dated_date = item.get('dated_date', 'N/A')
            new_Tips.maturity_date = item.get('maturity_date', 'N/A')
            new_Tips.coupon_rate = item.get('interest_rate', 'N/A')
            new_Tips.ref_cpi = item.get('ref_cpi_on_dated_date', 'N/A')
            new_Tips.save()
    return


def fetch_cpi_data():
    """
    Updates the database of CPI-U data and queries FRED for the latest data if not already avaible for today.
    """
    # Determine most recently updated date from the CPI database
    try:
        most_recent_date = Cpi.objects.order_by('-updated').first().updated
        print(f"DEBUG: Most recent CPI data update in database: {most_recent_date}")
    except ObjectDoesNotExist:
        print("DEBUG: No CPI data found in database.")
        most_recent_date = PRETIPSDATE
    
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
            new_cpi = Cpi.objects.get_or_create(as_of_date=obdate)[0]
            # set value field of new CPI obs
            new_cpi.cpi_value = float(obs.get('value', 0.0))
            new_cpi.save()

