import json
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import render
from .fetch import fetch_tips_data
from .ladder_calc import calculate_ladder
from .tipsdata import Ladder_values, Tips
from .tinit import clear_data

def init_view(request):
    clear_data(request)
    request.session['insession'] = True
    return HttpResponseRedirect(reverse('home'))

def home_view(request):
    if not request.session.get('insession', False):
        return HttpResponseRedirect(reverse(''))    
    # fetch tips data at put it in Tips.all_tips
    fetch_tips_data()
    # create list of dicts of tips for json serialization
    tips_data = [tip.to_json() for tip in Tips.all_tips]
    return render(request, 'home.html', {
        'tips_data': tips_data, 'tips_date': Tips.download_date})

def data_entry_view(request):
    fetch_tips_data()
    # create list of dicts of tips for json serialization
    tips_data = [tip.to_json() for tip in Tips.all_tips]
    ladder_data = request.session.get('ladder_data', None)
    ladderp = Ladder_values().from_json(ladder_data)
    ladder_data2 = ladderp.to_json()
    return render(request, 'data_entry.html', {
        'tips_data': tips_data,
        'ladder_data': ladder_data2
    })

def ladder_display_view(request):
    context = {}
    if request.method == 'POST':
        ladder_data = request.POST.get('ladder_data')
        if ladder_data:
            ladderp = Ladder_values().from_json(ladder_data)
            
            # If the payload indicates clearing data (start_year == 0)
            if ladderp.start_year == 0:
                if 'ladder_data' in request.session:
                    del request.session['ladder_data']
                context = {}
            else:
                # Save to session for persistence when returning
                request.session['ladder_data'] = ladder_data
                try:
                    results = calculate_ladder(ladderp)
                    context['ladder_years'] = results
                except Exception as e:
                    context['error'] = str(e)
        else:
            context['error'] = 'No ladder data provided.'
    else:
        # test for persisting ladder data - calculate ladder if data there
        ladder_data = request.session.get('ladder_data')
        if ladder_data:
            ladderp = Ladder_values().from_json(ladder_data)
            if ladderp.start_year != 0:
                results = calculate_ladder(ladderp)
                context['ladder_years'] = results
    return render(request, 'ladder_display.html', context)
