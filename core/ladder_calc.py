import json
import requests

def get_tip_details(id_type, id_value):
    """
    Fetches details for a specific TIP from Fiscal Data API.
    id_type: 'cusip' or 'coupon_maturity'
    """
    url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary"
    params = {"page[size]": 1, "sort": "-maturity_date"}
    
    if id_type == 'cusip':
        params["filter"] = f"cusip:eq:{id_value.strip()}"
    else:
        # Parse '2.5%,2030-01-15' or similar
        try:
            parts = id_value.split(',')
            rate = float(parts[0].replace('%', '').strip())
            maturity = parts[1].strip()
            # The API stores interest_rate as a string, e.g. '0.125' for 0.125%. Let's query exactly.
            params["filter"] = f"interest_rate:eq:{rate},maturity_date:eq:{maturity}"
        except:
            return None
            
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json().get('data', [])
        if data:
            return data[0]
        return None
    except:
        return None

def calculate_ladder(ladder_data_json):
    try:
        data = json.loads(ladder_data_json)
    except:
        raise ValueError("Invalid configuration data.")
        
    tax_rate = float(data.get('tax_rate', 0)) / 100.0
    start_year = int(data.get('start_year'))
    end_year = int(data.get('end_year'))
    base_cash_flow = float(data.get('base_cash_flow', 0))
    additional_flows = {int(f['year']): float(f['amount']) for f in data.get('additional_flows', [])}
    
    owned_tips = []
    # Fetch specifics for all owned TIPS to ensure we have maturity_date & interest_rate
    for tip in data.get('owned_tips', []):
        details = get_tip_details(tip['id_type'], tip['id_value'])
        if details:
            try:
                mat_year = int(details['maturity_date'].split('-')[0])
                # Ensure parsing string like 0.125 or 0.125%
                rate_str = str(details['interest_rate']).replace('%', '')
                rate = float(rate_str) / 100.0
                owned_tips.append({
                    'maturity_year': mat_year,
                    'interest_rate': rate,
                    'quantity': int(tip['quantity']),
                    'account_type': tip['account_type'].lower()
                })
            except Exception as e:
                pass # Skip improperly formatted tips for calculation
    
    ladder_years = []
    for y in range(start_year, end_year + 1):
        target = base_cash_flow + additional_flows.get(y, 0)
        
        row = {
            'year': y,
            'target': target,
            'coupon_income': 0.0,
            'principal_income': 0.0,
            'tax_drag': 0.0,
        }
        
        for tip in owned_tips:
            # Skip if matured before this year
            if tip['maturity_year'] < y:
                continue
                
            principal = 1000.0 * tip['quantity']
            annual_coupon = principal * tip['interest_rate']
            
            # Since TIPS pay semi-annually, we assume the full annual coupon is received in the year.
            row['coupon_income'] += annual_coupon
            
            # Tax on Coupon (Prompt: tax rate * non-Roth coupons)
            if tip['account_type'] in ['pretax', 'taxable']:
                row['tax_drag'] += annual_coupon * tax_rate
                
            # If matures this year, add principal
            if tip['maturity_year'] == y:
                row['principal_income'] += principal
                # Tax on Principal (Prompt: tax rate * pretax principal)
                if tip['account_type'] == 'pretax':
                    row['tax_drag'] += principal * tax_rate
                    
        row['net_flow'] = row['coupon_income'] + row['principal_income'] - row['tax_drag']
        row['shortfall'] = row['target'] - row['net_flow']
        ladder_years.append(row)
        
    return ladder_years
