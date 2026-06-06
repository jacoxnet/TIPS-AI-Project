from core.models import Specs, User
from core.dbstuff import load_default_specs, clear_all_otips


# register new user and return username
def register_new_user(request):
    """
    temporarily use user77 as username
    """
    # Generate a unique username using the current timestamp
    newusername = 'user' + str(User.objects.all().count())
    # newusername = 'user77'
    print(f"DEBUG: Attempting to register new user with username: {newusername}")
    # user = User.objects.create(username=newusername)
    user, _ = User.objects.get_or_create(username=newusername)
    # user.save()
    print(f"DEBUG: Successfully registered new user with username: {newusername}")
    request.session['username'] = user.username
    print(f"getting ready to create specs for user: {user.username}")
    load_default_specs(user)
    clear_all_otips(user)
    print(f"DEBUG: Successfully loaded default specs, cleared otips user: {user.username}")
    return user
