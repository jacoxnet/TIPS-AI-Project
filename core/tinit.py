from django.contrib.auth.models import User
from core.models import Ladder

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
    l = Ladder(user=user)
    l.save()
    print(f"DEBUG: Successfully created ladder for user: {user.username}")
    return newusername

# delete all user information if user in session
def clear_data(request):
    if request.session.get('user', None):
        Ladder.objects.filter(user=request.session['user']).delete()
    