from core.models import Specs, User

# register new user and return username
def register_new_user(request):
    # Generate a unique username using the current timestamp
    newusername = 'user' + str(User.objects.all().count())
    print(f"DEBUG: Attempting to register new user with username: {newusername}")
    user = User.objects.create_user(username=newusername)
    user.save()
    print(f"DEBUG: Successfully registered new user with username: {newusername}")
    request.session['username'] = user.username
    print(f"getting ready to create ladder for user: {user.username}")
    l = Specs(specs_user=user)
    l.save()
    User.objects.filter(username=newusername).update(specs=l)
    print(f"DEBUG: Successfully created ladder for user: {user.username}")
    return newusername

# delete all user information if user in session
def clear_data(request):
    pass
    # if request.session.get('user', None):
    #     Specs.objects.filter(specs_user=request.session['user']).delete()
    