from django.shortcuts import render
from .utils import fetch_tips_data
from .ladder_calc import calculate_ladder

def home_view(request):
    tips_data, tips_date = fetch_tips_data()
    return render(request, 'home.html', {'tips_data': tips_data, 'tips_date': tips_date})

def data_entry_view(request):
    return render(request, 'data_entry.html')

def ladder_display_view(request):
    context = {}
    if request.method == 'POST':
        ladder_data = request.POST.get('ladder_data')
        if ladder_data:
            try:
                results = calculate_ladder(ladder_data)
                context['ladder_years'] = results
            except Exception as e:
                context['error'] = str(e)
        else:
            context['error'] = 'No ladder data provided.'
    return render(request, 'ladder_display.html', context)
