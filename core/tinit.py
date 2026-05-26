from django.contrib.auth.models import User
from .models import Ladder, CashFlow, DEFAULT_CASH_FLOW_AMOUNT

# register new user and return username
def register_new_user(request):
    # Generate a unique username using the current timestamp
    newusername = 'user' + str(User.objects.all().count())
    user = User.objects.create_user(username=newusername)
    user.save()
    request.session['username'] = user.username
    ladder = Ladder.objects.create(user=user)
    for year in range(ladder.start_year, ladder.end_year + 1):
        CashFlow.objects.create(ladder=ladder, year=year, amount=DEFAULT_CASH_FLOW_AMOUNT)
    return newusername

# clear Tips list and Ladder_values when app is initiated
def clear_data(request):
    if request.session.get('user', None):
        Ladder.objects.filter(user=request.session['user']).delete()
        register_new_user(request)
    