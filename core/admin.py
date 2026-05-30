from django.contrib import admin

# Register your models here.

from .models import Tips, Cpi, CashFlow, Spec, Owned_tips, User
registered_models = [Tips, Cpi, CashFlow, Spec, Owned_tips, User]
for model in registered_models:
    admin.site.register(model)
