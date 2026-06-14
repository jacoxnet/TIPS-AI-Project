import django.contrib.auth.base_user
from django.contrib.auth import base_user
from django.contrib.auth import base_user
from django.contrib.auth import base_user
import dataclasses
from django.utils import datastructures
import json
import os
import datetime
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render
from django.conf import settings
from .fetch import fetch_tips_data, fetch_cpi_data, add_index_ratios, TIMEZONE
from .tinit import register_new_user
from .models import User, Tips, Cpi, Specs, Owned_tips
from .ladder_calc import calculate_ladder
from core.dbstuff import clear_all_otips, add_new_otips, parse_csv, merge_duplicate_otips

SAMPLE_CSV_FILE = 'sample_ladder.csv'

def init_view(request):
    """
    Initialize new user and clear ladder
    """
    
    register_new_user(request)
    # fetch tips data at put it in db
    fetch_cpi_data()
    fetch_tips_data()
    add_index_ratios()
    return HttpResponseRedirect(reverse('make_ladder'))

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
    from django.db import transaction
    if request.method == 'POST':
        ladder_data = json.loads(request.POST.get('ladder_data'))
        print(f'DEBUG: got ladder_data from POST: {ladder_data}')
        with transaction.atomic():
            # Clear out existing owned tips
            clear_all_otips(user)
            # add the new otips from the template
            add_new_otips(user, ladder_data['owned_tips'])
        # Clear snapshot on confirm
        request.session.pop('otips_snapshot', None)
    # start here if request method is GET (continue here from POST)
    
    # Merge any duplicates in database first
    merge_duplicate_otips(user)
    
    # Ensure snapshot is initialized
    if 'otips_snapshot' not in request.session:
        snapshot = {}
        for otip in Owned_tips.objects.filter(user=user).select_related('tips'):
            snapshot[f"{otip.tips.cusip}_{otip.account_type}"] = otip.quantity
        request.session['otips_snapshot'] = snapshot
    else:
        snapshot = request.session['otips_snapshot']

    # create list of dicts of tips for transfer to front end
    all_tips = list(Tips.objects.all())
    tips_data = [tips.to_dict() for tips in all_tips] # tips themselves
    all_tips_map = {t.cusip: t for t in all_tips}
    
    db_otips = {f"{otip.tips.cusip}_{otip.account_type}": otip for otip in Owned_tips.objects.filter(user=user).select_related('tips')}
    all_keys = set(snapshot.keys()) | set(db_otips.keys())
    
    otips_data = []
    for key in all_keys:
        parts = key.split('_', 1)
        if len(parts) != 2:
            continue
        cusip, account_type = parts
        prev_qty = snapshot.get(key, 0)
        otip = db_otips.get(key)
        curr_qty = otip.quantity if otip else 0
        
        if curr_qty == 0 and prev_qty == 0:
            continue
            
        tip_obj = all_tips_map.get(cusip)
        if not tip_obj:
            continue
            
        otips_data.append({
            'cusip': cusip,
            'maturity_date': tip_obj.maturity_date.isoformat(),
            'coupon_rate': tip_obj.coupon_rate,
            'account_type': account_type,
            'quantity': curr_qty,
            'prev_quantity': prev_qty,
        })
    otips_data.sort(key=lambda x: x['maturity_date'])
    
    specs_data = Specs.objects.filter(user=user).first().to_dict()
    ladder_years = calculate_ladder(user)
    
    # either GET or POST return data to make_ladder.html
    return render(request, 'make_ladder.html', {
        'tips_data': tips_data,
        'otips_data': otips_data,
        'specs_data': specs_data,
        'ladder_years': ladder_years
    })

def ladder_display_view(request):
    # Check if user is in session, if not redirect to init to create new user and ladder
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: ladder_display vew accessed by user: {username}")

    # check if there are any owned tips. if not send error to template
    if Owned_tips.objects.filter(user=user).count() == 0:
        return render(request, 'ladder_display.html', {
            'error': 'No owned tips found.'
        })
    # calculate ladder results
    ladder_years = calculate_ladder(user)
    # prepare data for display template
    total_balance = sum(row['balance'] for row in ladder_years)
    total_pretax_balance = sum(row['pretax_balance'] for row in ladder_years)
    total_shortfall = -total_balance if total_balance < 0 else 0
    total_pretax_shortfall = -total_pretax_balance if total_pretax_balance < 0 else 0
    specs = Specs.objects.filter(user=user).first()
    
    return render(request, 'ladder_display.html', {
        'ladder_years': ladder_years,
        'tax_effect_inflation': specs.tax_effect_inflation,
        'use_pretax': specs.use_pretax,
        'total_balance': total_balance,
        'total_pretax_balance': total_pretax_balance,
        'total_shortfall': total_shortfall,
        'total_pretax_shortfall': total_pretax_shortfall
    })
    
def save_load_view(request):
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    otips_data = [otips.to_dict() for otips in Owned_tips.objects.filter(user=user).select_related('tips').all()]
    specs_data = Specs.objects.filter(user=user).first().to_dict()
    return render(request, 'save_load.html', {
        'specs_data': specs_data,
        'otips_data': otips_data
    })
        
def import_data_view(request):
    """
    This view is called from an ajax request with saved JSON data.
    It clears the existing owned tips and adds the new ones. 
    It then returns the updated specs and owned tips data.
    """
    username = request.session.get('username', None)
    if request.method != "POST" or not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: import_data_ view accessed by user: {username}")
    # get data posted from ajax request save/load data
    data = json.loads(request.POST.get('data'))
    print('DEBUG: import_data_view retrieved data', data)
    from django.db import transaction
    with transaction.atomic():
        # Clear out existing owned tips
        clear_all_otips(user)
        # Save the new owned tips
        add_new_otips(user, data['otipsData'])
        # add new specs
        Specs.objects.filter(user=user).first().from_dict(data['specsData'])
    request.session.pop('otips_snapshot', None)
    return JsonResponse({'data': 'Load successful'}, safe=False)

def import_csv_view(request):
    """
    This view is called from an ajax request with the uploaded CSV data
    for adding to tips table. 
    """
    username = request.session.get('username', None)
    if request.method != "POST" or not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: import_csv_view accessed by user: {username}")
    # get data posted from ajax request save/load data
    data = request.POST.get('data')
    print('DEBUG: import_csv_view retrieved data', data)
    from django.db import transaction
    with transaction.atomic():
        end_year, new_otips = parse_csv(data)
        if len(new_otips) > 0:
            # Clear out existing owned tips
            clear_all_otips(user)
            # Save the new owned tips
            add_new_otips(user, new_otips)
            # update the start and end years
            Specs.objects.filter(user=user).update(end_year=end_year, start_year=datetime.datetime.now(tz=TIMEZONE).year)
            request.session.pop('otips_snapshot', None)
            return JsonResponse({'data': f'Import successful ({len(new_otips)} TIPS loaded)'}, safe=False)
        else:
            return JsonResponse({'data': 'Error: csv import failure'}, safe=False)
    
def sample_csv_view(request):
    username = request.session.get('username', None)
    if not username:
        return HttpResponseRedirect(reverse('init'))
    user = User.objects.filter(username=username).first()
    print(f"DEBUG: sample_csv_view accessed by user: {username}")
    csv_path = os.path.join(settings.BASE_DIR, 'csv files', SAMPLE_CSV_FILE)
    try:
        with open(csv_path, 'r') as f:
            content = f.read()
        print('DEBUG: sample_csv retrieved data', content)
        from django.db import transaction
        with transaction.atomic():
            end_year, new_otips = parse_csv(content)
            if len(new_otips) > 0:
                # Clear out existing owned tips
                clear_all_otips(user)
                # Save the new owned tips
                add_new_otips(user, new_otips)
                # update the start and end years
                Specs.objects.filter(user=user).update(end_year=end_year, start_year=datetime.datetime.now(tz=TIMEZONE).year)
                request.session.pop('otips_snapshot', None)
                return JsonResponse({'data': f'Sample ladder load successful ({len(new_otips)} TIPS loaded)'}, safe=False)
            else:
                return JsonResponse({'data': 'Error: sample ladder import failure'}, safe=False)
    except Exception:
        return JsonResponse({'data': 'Error: sample ladder import failure'}, safe=False)

def clear_data_view(request):
    print(f"DEBUG: clear data view accessed")
    register_new_user(request)
    request.session.pop('otips_snapshot', None)
    return JsonResponse({'data': f'All data cleared'}, safe=False)

def update_owned_tips_view(request):
    username = request.session.get('username', None)
    if request.method != "POST" or not username:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    user = User.objects.filter(username=username).first()
    data = json.loads(request.body)
    incoming_tips = data.get('owned_tips', [])
    
    from django.db import transaction
    with transaction.atomic():
        # Merge any duplicates in database first
        merge_duplicate_otips(user)
        
        # 1. Ensure snapshot is initialized in the session
        if 'otips_snapshot' not in request.session:
            snapshot = {}
            for otip in Owned_tips.objects.filter(user=user).select_related('tips'):
                snapshot[f"{otip.tips.cusip}_{otip.account_type}"] = otip.quantity
            request.session['otips_snapshot'] = snapshot
        else:
            snapshot = request.session['otips_snapshot']
            
        # 2. Update the database with incoming tips (aggregating duplicates)
        incoming_keys = set()
        aggregated_incoming = {}
        for item in incoming_tips:
            cusip = item['cusip']
            account_type = item['account_type']
            qty = int(item['quantity'])
            key = (cusip, account_type)
            aggregated_incoming[key] = aggregated_incoming.get(key, 0) + qty
            
        # Pre-fetch all TIPS and existing Owned_tips for lookups to avoid queries inside the loop
        all_tips_map = {t.cusip: t for t in Tips.objects.all()}
        existing_otips_map = {
            (o.tips.cusip, o.account_type): o 
            for o in Owned_tips.objects.filter(user=user).select_related('tips')
        }
            
        for (cusip, account_type), qty in aggregated_incoming.items():
            key_str = f"{cusip}_{account_type}"
            incoming_keys.add(key_str)
            
            # Find the TIP object
            tip_obj = all_tips_map.get(cusip)
            if not tip_obj:
                continue
                
            # Retrieve existing Owned_tips matching this user/tip/account_type from pre-fetched map
            otip = existing_otips_map.get((cusip, account_type))
            if otip:
                if otip.quantity != qty:
                    otip.quantity = qty
                    otip.save()
            else:
                # Create a new one
                new_otip = Owned_tips.objects.create(
                    user=user,
                    tips=tip_obj,
                    account_type=account_type,
                    quantity=qty
                )
                existing_otips_map[(cusip, account_type)] = new_otip
            
        # 3. Handle deleted keys (those in DB but not in incoming_keys)
        for (cusip, account_type), otip in list(existing_otips_map.items()):
            key = f"{cusip}_{account_type}"
            if key not in incoming_keys:
                # If it was in the original snapshot, set quantity to 0
                if key in snapshot:
                    if otip.quantity != 0:
                        otip.quantity = 0
                        otip.save()
                else:
                    # Otherwise, completely delete it
                    otip.delete()
                    
        # 4. Prepare response data
        updated_db_otips = {f"{o.tips.cusip}_{o.account_type}": o for o in Owned_tips.objects.filter(user=user).select_related('tips')}
        all_keys = set(snapshot.keys()) | set(updated_db_otips.keys())
        
        otips_data = []
        for key in all_keys:
            parts = key.split('_', 1)
            if len(parts) != 2:
                continue
            cusip, account_type = parts
            prev_qty = snapshot.get(key, 0)
            otip = updated_db_otips.get(key)
            curr_qty = otip.quantity if otip else 0
            
            if curr_qty == 0 and prev_qty == 0:
                continue
                
            tip_obj = all_tips_map.get(cusip)
            if not tip_obj:
                continue
                
            otips_data.append({
                'cusip': cusip,
                'maturity_date': tip_obj.maturity_date.isoformat(),
                'coupon_rate': tip_obj.coupon_rate,
                'account_type': account_type,
                'quantity': curr_qty,
                'prev_quantity': prev_qty,
            })
        otips_data.sort(key=lambda x: x['maturity_date'])
        
        # 5. Recalculate ladder results
        ladder_years = calculate_ladder(user)
        
        # 6. Return updated data
        return JsonResponse({
            'otips_data': otips_data,
            'ladder_years': ladder_years
        })