from core.models import Specs, User

# register new user and return username
def register_new_user(request):
    """
    temporarily use user77 as username
    """
    # Generate a unique username using the current timestamp
    # newusername = 'user' + str(User.objects.all().count())
    newusername = 'user77'
    print(f"DEBUG: Attempting to register new user with username: {newusername}")
    # user = User.objects.create(username=newusername)
    user, _ = User.objects.get_or_create(username=newusername)
    # user.save()
    print(f"DEBUG: Successfully registered new user with username: {newusername}")
    request.session['username'] = user.username
    print(f"getting ready to create specs for user: {user.username}")
    Specs.objects.get_or_create(user=user)
    print(f"DEBUG: Successfully created specs for user: {user.username}")
    return user

# delete all user information if user in session
def clear_data(request):
    pass
    # if request.session.get('user', None):
    #     Specs.objects.filter(specs_user=request.session['user']).delete()
    