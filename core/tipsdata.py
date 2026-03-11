class Tips:
    def __init__(self, cusip, issue_date, maturity_date, interest_rate, ref_cpi):
        self.cusip = cusip
        self.issue_date = issue_date
        self.maturity_date = maturity_date
        self.interest_rate = interest_rate
        self.ref_cpi = ref_cpi
        self.index_ratio = None  # Will be set later based on detailed data

    download_date = None
    all_tips = []

    def return_dict(self):
        return {
            'cusip': self.cusip,
            'maturity_date': self.maturity_date,
            'interest_rate': self.interest_rate,
        }
    
class Ladder_values:
    tax_rate = 0
    start_year = 0
    end_year = 0
    base_cash_flow = 0
    additional_flows = {}
    owned_tips = []
    
    # implement a static method for JSON serializer for this class
    @staticmethod
    def to_dict():
        if Ladder_values.tax_rate == 0:
            return {}
        else:
            return {
                'tax_rate': Ladder_values.tax_rate,
                'start_year': Ladder_values.start_year,
                'end_year': Ladder_values.end_year,
                'base_cash_flow': Ladder_values.base_cash_flow,
                'additional_flows': Ladder_values.additional_flows,
                # owned_tips is list of objects with attrib id_type, id_value, quantity, account_type
                'owned_tips': []
            }
    
