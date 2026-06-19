from django.contrib import admin

# Register your models here.

from .models import Tips, Cpi, CashFlow, Specs, Owned_tips, User, Feedback
registered_models = [Tips, Cpi, CashFlow, Specs, Owned_tips, User, Feedback]
for model in registered_models:
    admin.site.register(model)

