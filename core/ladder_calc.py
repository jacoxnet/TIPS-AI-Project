import json
import requests
from core.tipsdata import Tips, Ladder_values

def get_tip_details(id_type, id_value):
    """
    Searches Tips.all_tips for a specific TIP based on either cusip or a combination of interest_rate 
    and maturity_date. id_type: 'cusip' or 'coupon_maturity'
    """
    for tip in Tips.all_tips:
        if id_type == 'cusip':
            if tip.cusip == id_value:
                return tip
        else:
            # Parse '2.5%,2030-01-15' or similar
            try:
                parts = id_value.split(',')
                rate = float(parts[0].replace('%', '').strip())
                maturity = parts[1].strip()
                if float(tip.interest_rate) == rate and tip.maturity_date == maturity:
                    return tip
            except:
                continue
    return None

def calculate_ladder():
        
    tax_rate = float(Ladder_values.tax_rate) / 100.0
    start_year = int(Ladder_values.start_year)
    end_year = int(Ladder_values.end_year)
    base_cash_flow = float(Ladder_values.base_cash_flow)
    additional_flows = {int(f['year']): float(f['amount']) for f in Ladder_values.additional_flows}
    
    owned_tips = []
    # Fetch specifics for all owned TIPS to ensure we have maturity_date, interest_rate and inflation_adjusted_value
    for tip in Ladder_values.owned_tips:
        print(f"Fetching details for TIP: {tip['id_type']}={tip['id_value']}")
        details = get_tip_details(tip['id_type'], tip['id_value'])
        if details:
            try:
                print(f"Details found: {details}")
                mat_year = int(details.maturity_date.split('-')[0])
                # Ensure parsing string like 0.125 or 0.125%
                rate_str = str(details.interest_rate).replace('%', '')
                rate = float(rate_str) / 100.0
                inflation_adjusted_value = float(details.index_ratio) * 1000.0
                owned_tips.append({
                    'maturity_year': mat_year,
                    'interest_rate': rate,
                    'quantity': int(tip['quantity']),
                    'account_type': tip['account_type'].lower(),
                    'inflation_adjusted_value': inflation_adjusted_value
                })
            except Exception as e:
                pass # Skip improperly formatted tips for calculation
        else:
            print(f"No details found for {tip['id_type']}={tip['id_value']}")
    
    print(f"Fetched details for {len(owned_tips)} owned TIPS.")
    ladder_years = []
    for y in range(start_year, end_year + 1):
        target =  additional_flows.get(y, base_cash_flow)
        
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
                
            uninflated_principal = 1000 * tip['quantity']
            inflated_principal = tip['inflation_adjusted_value'] * tip['quantity']
            annual_coupon = inflated_principal * tip['interest_rate']
            
            # Since TIPS pay semi-annually, we assume the full annual coupon is received in the year.
            row['coupon_income'] += annual_coupon
            
            # Tax on Coupon (Prompt: tax rate * non-Roth coupons)
            if tip['account_type'] in ['pretax', 'taxable']:
                row['tax_drag'] += annual_coupon * tax_rate
                
            # If matures this year, add principal
            if tip['maturity_year'] == y:
                row['principal_income'] += inflated_principal
                # Tax on Principal (Prompt: tax rate * pretax principal)
                if tip['account_type'] == 'pretax':
                    row['tax_drag'] += inflated_principal * tax_rate
                    
        row['net_flow'] = row['coupon_income'] + row['principal_income'] - row['tax_drag']
        row['shortfall'] = row['target'] - row['net_flow']
        row['balance'] = row['net_flow'] - row['target']
        # test printouts
        if y == 2028:
            print ("Spreadsheet equivalent coupon income", )
        ladder_years.append(row)
        
    return ladder_years
