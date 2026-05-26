import json
import os
import datetime
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render
from django.conf import settings
from .fetch import fetch_tips_data, fetch_cpi_data, TIMEZONE
# from .ladder_calc import calculate_ladder
# from .tipsdata import Ladder_values, Tips
from .tinit import register_new_user, clear_data
from .models import Tips, Ladder, CashFlow

SAMPLE_CSV_FILE = 'test_sample.csv'

def init_view(request):
    clear_data(request)
    username = register_new_user(request)
    print(f"DEBUG: Registered new user with username: {username}")
    return HttpResponseRedirect(reverse('home'))

def home_view(request):
    # Check if user is in session, if not redirect to init to create new user and ladder
    if not request.session.get('username', None):
        return HttpResponseRedirect(reverse('init'))    
    # fetch tips data at put it in Tips.all_tips
    fetch_tips_data()
    # create list of dicts of tips for json serialization
    tips_data = [tips.to_json() for tips in Tips.objects.all()]
    return render(request, 'home.html', {
        'tips_data': tips_data, 'tips_date': datetime.datetime.now(tz=TIMEZONE).date().isoformat()})

# def data_entry_view(request):
#     # Check if user in session - if not redirect to new user and ladder
#     if not request.session.get('username', None):
#         return HttpResponseRedirect(reverse('init'))    
#     fetch_tips_data()
#     # create list of dicts of tips for json serialization
#     tips_data = [tip.to_json() for tip in Tips.all_tips]
#     ladder_data = request.session.get('ladder_data', None)
#     ladderp = Ladder_values().from_json(ladder_data)
#     ladder_data2 = ladderp.to_json()
#     return render(request, 'data_entry.html', {
#         'tips_data': tips_data,
#         'ladder_data': ladder_data2
#     })

# def ladder_display_view(request):
#     # Check if user in session - if not redirect to new user and ladder
#     if not request.session.get('username', None):
#         return HttpResponseRedirect(reverse('init'))    
#     print("DEBUG: ladder_display_view called")
#     context = {}
#     if request.method == 'POST':
#         ladder_data = request.POST.get('ladder_data')
#         if ladder_data:
#             ladderp = Ladder_values().from_json(ladder_data)
            
#             # If the payload indicates clearing data (start_year == 0)
#             if ladderp.start_year == 0:
#                 if 'ladder_data' in request.session:
#                     del request.session['ladder_data']
#                 context = {}
#             else:
#                 # Save to session for persistence when returning
#                 request.session['ladder_data'] = ladder_data
#                 try:
#                     results = calculate_ladder(ladderp)
#                     context['ladder_years'] = results
#                     context['tax_effect_inflation'] = getattr(ladderp, 'tax_effect_inflation', False)
#                     context['use_pretax'] = getattr(ladderp, 'use_pretax', False)
#                 except Exception as e:
#                     context['error'] = str(e)
#         else:
#             context['error'] = 'No ladder data provided.'
#     else:
#         # test for persisting ladder data - calculate ladder if data there
#         ladder_data = request.session.get('ladder_data')
#         if ladder_data:
#             ladderp = Ladder_values().from_json(ladder_data)
#             if ladderp.start_year != 0:
#                 results = calculate_ladder(ladderp)
#                 context['ladder_years'] = results
#                 context['tax_effect_inflation'] = getattr(ladderp, 'tax_effect_inflation', False)
#                 context['use_pretax'] = getattr(ladderp, 'use_pretax', False)

#     if 'ladder_years' in context:
#         total_balance = sum(row['balance'] for row in context['ladder_years'])
#         context['total_balance'] = total_balance
#         context['total_shortfall'] = -total_balance if total_balance < 0 else 0
#         total_pretax_balance = sum(row['pretax_balance'] for row in context['ladder_years'])
#         context['total_pretax_balance'] = total_pretax_balance
#         context['total_pretax_shortfall'] = -total_pretax_balance if total_pretax_balance < 0 else 0

#     return render(request, 'ladder_display.html', context)

def clear_ladder_view(request):
    clear_data(request)
    return HttpResponseRedirect(reverse('home'))

def sample_csv_view(request):
    csv_path = os.path.join(settings.BASE_DIR, 'csv files', SAMPLE_CSV_FILE)
    try:
        with open(csv_path, 'r') as f:
            content = f.read()
        return JsonResponse({'csv_content': content})
    except FileNotFoundError:
        return JsonResponse({'error': 'Sample file not found'}, status=404)
