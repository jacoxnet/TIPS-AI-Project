from core.tipsdata import Ladder_values, Tips

# clear Tips list and Ladder_values when app is initiated
def clear_data(request):
    Tips.download_date = None
    Tips.all_tips = []
    Ladder_values.tax_rate = 0
    Ladder_values.start_year = 0
    Ladder_values.end_year = 0
    Ladder_values.base_cash_flow = 0
    Ladder_values.additional_flows = None
    Ladder_values.owned_tips = None
    