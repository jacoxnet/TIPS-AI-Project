import json
import os
import datetime
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render
from django.conf import settings
from .fetch import fetch_tips_data, fetch_cpi_data, add_index_ratios, TIMEZONE
from .tinit import register_new_user, clear_data
from .models import User, Tips, Cpi, Specs, Owned_tips

SAMPLE_CSV_FILE = 'test_sample.csv'

def init_view(request):
    """
    Initialize new user and clear ladder
    """
    clear_data(request)
    register_new_user(request)
    return HttpResponseRedirect(reverse('home'))

def home_view(request):
    """
    View available TIPS Data (used to be landing page so still named home)
    """
    # Check if user is in session, if not redirect to init to create new user and ladder
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    print(f"DEBUG: Home view accessed by user: {username}")
    # fetch tips data at put it in Tips.all_tips
    fetch_cpi_data()
    fetch_tips_data()
    add_index_ratios()
    # create list of dicts of tips for json serialization
    tips_data = [tips.to_dict() for tips in Tips.objects.all()]
    # print(f"DEBUG: Prepared tips data for rendering: {tips_data}")
    return render(request, 'home.html', {
        'tips_data': tips_data, 'tips_date': datetime.datetime.now(tz=TIMEZONE).date().isoformat()})

def specs_view(request):
    """
    View and edit ladder specifications
    """
    # Check if user is in session, if not redirect to init to create new user and ladder
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: specs view accessed by user: {username}")
    if request.method == 'POST':
        specs_data = json.loads(request.POST.get('specs_data'))
        print(f'DEBUG: got specs_data from POST: {specs_data}')
        # add specs data to User
        Specs.objects.filter(user=user).first().from_dict(specs_data)
    else:
        # request method is GET
        specs_data = Specs.objects.filter(user=user).first().to_dict()
        print(f"DEBUG: Prepared specs data for rendering: {specs_data}")
    # either GET or POST return data to specs.html
    return render(request, 'specs.html', {
        'specs_data': specs_data
    })

def make_ladder_view(request):
    # Check if user is in session, if not redirect to init to create new user and ladder
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: make ladder view accessed by user: {username}")
    if request.method == 'POST':
        ladder_data = json.loads(request.POST.get('ladder_data'))
        print(f'DEBUG: got ladder_data from POST: {ladder_data}')
        # Clear out existing owned tips
        Owned_tips.objects.filter(user=user).delete()
        for item in ladder_data['owned_tips']:
            print(f"DEBUG: processing item {item['cusip']}, {item['account_type']}, {item['quantity']}")
            new_otips = Owned_tips.objects.create(user=user, 
                                                 tips=Tips.objects.filter(cusip=item['cusip']).first(),
                                                 account_type=item['account_type'],
                                                 quantity=item['quantity'])
            new_otips.save()
            print(f"DEBUG: adding new owned tips {new_otips}")
    # start here if request method is GET (continue here from POST)
    # create list of dicts of tips for transfer to front end
    tips_data = [tips.to_dict() for tips in Tips.objects.all()] # tips themselves
    otips_data = [otips.to_dict() for otips in Owned_tips.objects.filter(user=user).all()]
    specs_data = Specs.objects.filter(user=user).first().to_dict()
    # print(f"DEBUG: Prepared tips data for rendering: TIPS: {tips_data}")
    print(f"DEBUG: Prepared otips data for rendering: OTIPS: {otips_data}")
    # print(f"DEBUG: Prepared specs data for rendering: SPECS: {specs_data}")
    # either GET or POST return data to make_ladder.html
    return render(request, 'make_ladder.html', {
        'tips_data': tips_data,
        'otips_data': otips_data,
        'specs_data': specs_data
    })

# def ladder_display_view(request):
#     # Check if user is in session, if not redirect to init to create new user and ladder
#     username = request.session.get('username', None)
#     if not username:
#         return HttpResponseRedirect(reverse('init'))
#     print(f"DEBUG: ladder_display vew accessed by user: {username}")

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
#         # request method is GET
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
