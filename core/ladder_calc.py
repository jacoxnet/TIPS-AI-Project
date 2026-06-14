from core.models import Specs, Owned_tips, Cpi

def calculate_ladder(user):
    
    # load db items we'll need
    specs = Specs.objects.filter(user=user).first()
    otips = Owned_tips.objects.filter(user=user).select_related('tips')
    
    # prepare data for use in year-by-year calcs
    tax_rate = specs.tax_rate / 100.0
    start_year = specs.start_year
    end_year = specs.end_year
    base_cash_flow = specs.base_cash_flow
    base_cash_flow_date = specs.base_cash_flow_date
    tax_effect_inflation = specs.tax_effect_inflation
    assumed_inflation_rate = specs.assumed_inflation_rate / 100.0
    use_pretax = specs.use_pretax
    inflate_base_cf = specs.inflate_base_cf
    
    # Convert additional flows to a dictionary for easy lookup
    additional_flows = {flow.year: flow.amount for flow in specs.additional_flows.all()}

    # Calculate Inflation Factor using CPI data (only if user opted in)
    if not inflate_base_cf:
        inflation_factor = 1.0
        print(f"DEBUG: Inflation not requested, using factor = 1.0")
    else:
        latest_cpi = Cpi.objects.all().last().cpi_value
        as_of_cpi = Cpi.objects.filter(as_of_date=base_cash_flow_date).first().cpi_value
        inflation_factor = latest_cpi / as_of_cpi if as_of_cpi else 1.0
        print(f"DEBUG: Base cf inflation Factor calculated as {inflation_factor} (Latest CPI: {latest_cpi}, As-Of CPI: {as_of_cpi})")
    
    owned_tips = []
    
    # go through and calculate display items for each ladder year
    print(f"DEBUG: calculating ladder from {start_year} to {end_year} for {len(otips)} owned TIPS.")
    ladder_years = []
    for y in range(start_year, end_year + 1):
        raw_target = additional_flows.get(y, base_cash_flow)
        target = raw_target * inflation_factor
        
        row = {
            'year': y,
            'target': target,
            'coupon_income': 0.0,
            'principal_income': 0.0,
            'tax_drag': 0.0,
            'principal_adjustment': 0.0,
        }
        
        for tip in otips.all():
            # Skip if matured before this year
            if tip.tips.maturity_date.year < y:
                continue
                
            inflated_principal = tip.tips.index_ratio * tip.quantity * 1000.0
            annual_coupon = inflated_principal * (tip.tips.coupon_rate / 100.0)
            
            # Since TIPS pay semi-annually, we assume the full annual coupon is received in the year.
            row['coupon_income'] += annual_coupon
            
            # Tax on Coupon (Prompt: tax rate * non-Roth coupons)
            if tip.account_type in ['pretax', 'taxable']:
                row['tax_drag'] += annual_coupon * tax_rate
                
            # Tax effect on inflation-adjusted principal in taxable accounts
            if tax_effect_inflation and tip.account_type == 'taxable':
                row['principal_adjustment'] += inflated_principal * assumed_inflation_rate
                row['tax_drag'] += inflated_principal * assumed_inflation_rate * tax_rate
                
            # If matures this year, add principal
            if tip.tips.maturity_date.year == y:
                row['principal_income'] += inflated_principal
                # Tax on Principal (Prompt: tax rate * pretax principal)
                if tip.account_type == 'pretax':
                    row['tax_drag'] += inflated_principal * tax_rate
                    
        # calculate some subtotals for the year
        row['pretax_cash_flow'] = row['coupon_income'] + row['principal_income']
        row['pretax_balance'] = row['pretax_cash_flow'] - row['target']
        row['pretax_shortfall'] = row['target'] - row['pretax_cash_flow'] if row['pretax_balance'] < 0 else 0
        row['net_flow'] = row['pretax_cash_flow'] - row['tax_drag']
        row['shortfall'] = row['target'] - row['net_flow']
        row['balance'] = row['net_flow'] - row['target']
        ladder_years.append(row)
        
    return ladder_years
