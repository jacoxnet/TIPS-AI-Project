from .models import Tips, Specs, Owned_tips


def load_default_specs(user):
    """
    Load the default specs for user.
    The database model will define defaults for everything but user
    """
    try:
        Specs.objects.filter(user=user).delete()
    except Exception:
        print(f"DEBUG: error could not delete specs for user {user.username}")
    Specs.objects.create(user=user)
    
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
        print(f"DEBUG: start processing new owned tips {item['cusip']}, {item['account_type']}, {item['quantity']}")
        new_otips = Owned_tips.objects.create(
            user=user, 
            tips=Tips.objects.filter(cusip=item['cusip']).first(),
            account_type=item['account_type'],
            quantity=item['quantity']
        )
        new_otips.save()
        print(f"DEBUG: successfully added new owned tips {new_otips}")
    