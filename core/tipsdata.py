import json

class Tips:
    
    # class vars
    #   NB it is OK to have these as class vars because (once updated) they will be the same 
    #   from session/user to session/user
    download_date = None
    all_tips = None
    
    def __init__(self, cusip, issue_date, maturity_date, interest_rate, ref_cpi):
        self.cusip = cusip
        self.issue_date = issue_date
        self.maturity_date = maturity_date
        self.interest_rate = interest_rate
        self.ref_cpi = ref_cpi
        self.index_ratio = None  # Will be set later based on detailed data

    def to_json(self):
        return {
            'cusip': self.cusip,
            'issue_date': self.issue_date,
            'maturity_date': self.maturity_date,
            'interest_rate': self.interest_rate,
            'ref_cpi': self.ref_cpi,
            'index_ratio': self.index_ratio
        }

class CpiData:
    download_date = None
    cpi_cache = {}
    
class Ladder_values:
    def __init__(self):
        self.tax_rate = 0
        self.start_year = 0
        self.end_year = 0
        self.base_cash_flow = 0
        self.base_cash_flow_date = ''
        self.tax_effect_inflation = False
        self.assumed_inflation_rate = 0.0
        # additional flows is a list of dicts with "year" and "amount" keys
        self.additional_flows = []
        # owned_tips is a list of dicts with "id_type" "id_value" "account_type" "quantity"
        self.owned_tips = []

    # JSON serializer for this class
    def to_json(self):
        return {
            'tax_rate': self.tax_rate,
            'start_year': self.start_year,
            'end_year': self.end_year,
            'base_cash_flow': self.base_cash_flow,
            'base_cash_flow_date': self.base_cash_flow_date,
            'tax_effect_inflation': self.tax_effect_inflation,
            'assumed_inflation_rate': self.assumed_inflation_rate,
            'additional_flows': self.additional_flows,
            'owned_tips': self.owned_tips
        }
    
    def from_json(self, jsondata):
        if not jsondata:
            pdata = {}
        else:
            pdata = json.loads(jsondata)
        self.tax_rate = pdata.get('tax_rate', 0)
        self.start_year = pdata.get('start_year', 0)
        self.end_year = pdata.get('end_year', 0)
        self.base_cash_flow = pdata.get('base_cash_flow', 0)
        self.base_cash_flow_date = pdata.get('base_cash_flow_date', '')
        self.tax_effect_inflation = pdata.get('tax_effect_inflation', False)
        self.assumed_inflation_rate = pdata.get('assumed_inflation_rate', 0.0)
        self.additional_flows = pdata.get('additional_flows', [])
        self.owned_tips = pdata.get('owned_tips', [])
        return self

    def __repr__(self):
        return f"Ladder_values(tax_rate={self.tax_rate}, start_year={self.start_year}, end_year={self.end_year}, base_cash_flow={self.base_cash_flow}, additional_flows={self.additional_flows}, owned_tips={self.owned_tips})"