from core.tipsdata import Ladder_values, Tips

# clear Tips list and Ladder_values when app is initiated
def clear_data(request):
    Tips.download_date = None
    Tips.all_tips = []
    request.session['ladder_data'] = None
    