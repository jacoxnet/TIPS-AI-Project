import json
from django.shortcuts import render
from .fetch import fetch_tips_data
from .ladder_calc import calculate_ladder
from core.tipsdata import Ladder_values, Tips

def home_view(request):
    fetch_tips_data()
    print (f"Download date: {Tips.download_date}, Number of TIPS: {len(Tips.all_tips)}")
    return render(request, 'home.html', {'tips_data': Tips.all_tips, 'tips_date': Tips.download_date})

def data_entry_view(request):
    fetch_tips_data()
    # create list of dicts of tips for json serialization
    tips_data = [tip.return_dict() for tip in Tips.all_tips]
    print("In data_entry_view Ladder_values:", Ladder_values.to_dict())
    ladder_data = Ladder_values.to_dict()
    return render(request, 'data_entry.html', {
        'tips_data': tips_data,
        'ladder_data': ladder_data
    })

def ladder_display_view(request):
    context = {}
    if request.method == 'POST':
        ladder_data = request.POST.get('ladder_data')
        if ladder_data:
            # Save to class variable for persistence when returning
            Ladder_values.tax_rate = json.loads(ladder_data).get('tax_rate', 0)
            Ladder_values.start_year = json.loads(ladder_data).get('start_year', 0)
            Ladder_values.end_year = json.loads(ladder_data).get('end_year', 0)
            Ladder_values.base_cash_flow = json.loads(ladder_data).get('base_cash_flow', 0)
            Ladder_values.additional_flows = json.loads(ladder_data).get('additional_flows', [])
            Ladder_values.owned_tips = json.loads(ladder_data).get('owned_tips', [])
            try:
                print("In ladder_display_view Ladder_values:", Ladder_values.to_dict())
                results = calculate_ladder()
                context['ladder_years'] = results
            except Exception as e:
                context['error'] = str(e)
        else:
            context['error'] = 'No ladder data provided.'
    return render(request, 'ladder_display.html', context)
