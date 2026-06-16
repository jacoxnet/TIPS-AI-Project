from .models import Tips, Specs, Owned_tips
from io import StringIO
from csv import reader
import datetime
from core.fetch import TIMEZONE
import re

def load_default_specs(user):
    """
    Load the default specs for user.
    The database model will define defaults for everything but user
    """
    try:
        Specs.objects.filter(user=user).delete()
    except Exception:
        print(f"DEBUG: error could not delete specs for user {user.username}")
    curr_year = datetime.datetime.now(tz=TIMEZONE).year
    Specs.objects.create(user=user, start_year=curr_year)
    
def clear_all_otips(user):
    """Clear out existing owned tips for user"""
    Owned_tips.objects.filter(user=user).delete()

def add_new_otips(user, new_owned_tips):
    """
    accepts a user and list of new otips dicts to add
    additional owned tips for the user from the data
    new_owned_tips is in the form {cusip: ___, account_type: _____, quantity:_____}
    """
    cusips = [item['cusip'] for item in new_owned_tips if 'cusip' in item]
    tips_map = {t.cusip: t for t in Tips.objects.filter(cusip__in=cusips)}
    for item in new_owned_tips:
        print(f"DEBUG: start processing new owned tips {item}")
        print(f"DEBUG: start processing new owned tips {item['cusip']}, {item['account_type']}, {item['quantity']}")
        tip_obj = tips_map.get(item['cusip'])
        if not tip_obj:
            print(f"DEBUG: cannot find tips with cusip {item['cusip']}")
            continue
        new_otips = Owned_tips.objects.create(
            user=user, 
            tips=tip_obj,
            account_type=item['account_type'],
            quantity=int(item['quantity'])
        )
        new_otips.save()
        print(f"DEBUG: successfully added new owned tips {new_otips}")

def parse_csv(csv_text_content):
    """
    Takes as input four different kinds of files:
    
        1.  Kevin M's CSV file of owned tips. This is a csv file with headers 
            cusup, qty, and excess. We only need the first two columns
        2.  tipsladder.com's portfolio file of owned tips. This is a csv file without
            any headers but with three columns: cusip, quantity, and ladder year.
            Again, we only use the first two columns.
        3.  A sample ladder file for this app. This is a csv file with headers
            cusip, quantity, account. Account is one of roth, taxable, pretax
        4.  The old version of this app's saved files. This file is supposedly a
            CSV file but it actually contains several different kinds of rows. The
            first column is a keyword with the type of content:
                - PARAM: a parameter row. second column is field name, third is value.
                - ADD_FLOW: an additional flow row. second column is year, third is amount
                - OWNED_TIP: contains info on an owned tip. second column can be either 
                    "cusip" or "coupon_maturity". 
                        - if cusip, the third column is the cusip
                        - if "coupon_maturity" the third column is a quoted combo of coupon rate
                          maturity date, e.g. "1.750000%,2028-01-15". The cusip must be looked up.
                        - the fourth column is the account (roth, taxable, pretax)
                        - the fifth column is the quantity
                        
    Produces three outputs: (specs, end_year, owned_tips)
        specs: a dict with the PARAMS values, if read (empty if none)
        end_year: the last maturity year of an owned tips list
        owned_tips: a dict with cusip, quantity, and account_type keys for the owned tips
        
    If errors are encountered, the owned_tips dict will be empty
    """
    
    new_owned_tips_list = []
    new_specs = {}
    end_year = datetime.datetime.now(tz=TIMEZONE).year
    # read in file by rows using csv_read
    f = StringIO(csv_text_content)
    csv_reader = reader(f)
    # Pre-fetch all tips to avoid N+1 queries in the parsing loop
    # and to use in cusip validation
    # convert tips to lower for comparison purposes
    all_cusip_years = {}
    all_coupon_maturity = {}
    for t in Tips.objects.all():
          all_cusip_years[t.cusip.lower()] = t.maturity_date.year
          all_coupon_maturity[(t.coupon_rate, t.maturity_date.isoformat())] = t.cusip.lower()
    # go through rows dealing with different row content
    for row in csv_reader:
        new_owned_tips = {}
        # strip and lower-case all fields
        row_adj = [item.strip().lower() for item in row]
        print(f"DEBUG: start processing row {row}")
        # skip header row if present
        if row_adj[0] == "cusip" or row_adj[0] == "type":
            continue
        # test and process PARAM row 
        if row_adj[0] == "param":
            # old version of app specs - col 2 is field and col 3 is value
            # deal with type of value of csv field
            if row_adj[2].isdigit():
                new_specs[row_adj[1]] = int(row_adj[2])
            elif row_adj[2] in ["true", "false"]:
                new_specs[row_adj[1]] = {"true": True, "false": False}[row_adj[2]]
            elif re.search('^[0-9]{4}-[0-9]{2}$', row_adj[2]):
                # date in format 2025-02
                new_specs[row_adj[1]] = row_adj[2] + "-01"
            else:
                new_specs[row_adj[1]] = row_adj[2]
            continue
        # test and process add_flow row
        if row_adj[0] == "add_flow":
            # add to list of additional flows in specs
            if "additional_flows" not in new_specs:
                new_specs["additional_flows"] = []
            new_specs["additional_flows"].append({'year': row_adj[1], 'amount': row_adj[2]})
            continue
        # test and process owned tip row
        if row_adj[0] == "owned_tip":
            # old version of app - could be id by cusip or coupon-maturity
            if row_adj[1] == "cusip":
                test_cusip = row_adj[2]
            else:
                # assume it's coupon-maturity
                coupon, maturity = row_adj[2].split("%,")
                test_cusip = all_coupon_maturity.get((float(coupon), maturity))
            test_account = row_adj[3]
            test_quantity = row_adj[4]
        else:
            # treat as cusip, quantity, account (where account could be missing)
            test_cusip = row_adj[0]
            test_quantity = row_adj[1]
            test_account = "" if len(row_adj) < 3 else row_adj[2]
            
        # see if valid tips cusip & to save for 
        # start/maturity year calculation
        if test_cusip not in all_cusip_years.keys():
            print("DEBUG: can't find owned tips: ", row_adj)
            continue
        else:
            # interpreting row as cusip, quantity, account_type
            new_owned_tips['cusip'] = test_cusip.upper()
            new_owned_tips['quantity'] = int(test_quantity)
            new_owned_tips['account_type'] = test_account if test_account in ["pretax", "taxable", "roth"] else "pretax"
            end_year = max(end_year, all_cusip_years[test_cusip])
        new_owned_tips_list.append(new_owned_tips)
    print(f"DEBUG: returning parsed csv list")
    print(f"end_year {end_year}, new_specs: {new_specs}, new_owned_tips_list {new_owned_tips_list}")
    return end_year, new_specs, new_owned_tips_list


def merge_duplicate_otips(user):
    """
    Finds and merges duplicate Owned_tips entries (same CUSIP and account_type)
    for a user by summing their quantities, keeping one database record, and
    deleting the duplicate records.
    """
    otips = Owned_tips.objects.filter(user=user).select_related('tips')
    seen = {}
    to_delete = []
    
    for otip in otips:
        if not otip.tips:
            continue
        key = (otip.tips.cusip, otip.account_type)
        if key in seen:
            primary_otip = seen[key]
            primary_otip.quantity += otip.quantity
            to_delete.append(otip.pk)
        else:
            seen[key] = otip
            
    for primary_otip in seen.values():
        primary_otip.save()
        
    if to_delete:
        Owned_tips.objects.filter(pk__in=to_delete).delete()