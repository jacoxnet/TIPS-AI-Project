from .models import Tips, Specs, Owned_tips
from io import StringIO
from csv import reader
import datetime
from core.fetch import TIMEZONE

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
    accepts a user and list of new odicts dicts to add
    additional owned tips for the user from the data
    new_owned_tips is in the form {cusip: ___, account_type: _____, quantity:_____}
    """
    for item in new_owned_tips:
        print(f"DEBUG: start processing new owned tips {item}")
        print(f"DEBUG: start processing new owned tips {item['cusip']}, {item['account_type']}, {item['quantity']}")
        new_otips = Owned_tips.objects.create(
            user=user, 
            tips=Tips.objects.filter(cusip=item['cusip']).first(),
            account_type=item['account_type'],
            quantity=int(item['quantity'])
        )
        new_otips.save()
        print(f"DEBUG: successfully added new owned tips {new_otips}")

def parse_csv(csv_text_content):
    """
    Take raw csv text content and extract list of new owned tips.
    Whiel doing that calcaulte and return last
    maturity year to update end_year in specs
    """
    f = StringIO(csv_text_content)
    csv_reader = reader(f)
    new_owned_tips_list = []
    for row in csv_reader:
        new_owned_tips = {}
        end_year = datetime.datetime.now(tz=TIMEZONE).year
        print(f"DEBUG: start processing row {row}")
        # skip header row if there
        if row[0].strip().lower() == "cusip":
            continue
        # retrieve tips to see if valid tips cusip & to save for 
        # start/maturity year calculation
        tips = Tips.objects.filter(cusip=row[0].strip().upper()).first()
        if not tips:
            print("DEBUG: can't find tips cusip", row)
            continue
        else:
            # try interpreting row as cusip, quantity, account_type
            # allow missing account_type (default will be pretax) but
            # not other errors
            try:
                # unlike other fields, cusip entries are upper case
                new_owned_tips['cusip'] = tips.cusip
                new_owned_tips['quantity'] = int(row[1])
                try:
                    if row[2].strip().lower() in ["pretax", "taxable", "roth"]:
                        new_owned_tips['account_type'] = row[2].strip().lower()
                    else:
                        new_owned_tips['account_type'] = "pretax"
                except IndexError:
                    new_owned_tips['account_type'] = "pretax"
            except:
                print("DEBUG: error processing row", row)
                continue
        end_year = max(end_year, tips.maturity_date.year)
        new_owned_tips_list.append(new_owned_tips)
    return end_year, new_owned_tips_list
