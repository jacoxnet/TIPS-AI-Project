from django.contrib import admin

# Register your models here.

from .models import Tips, Cpi, CashFlow, Ladder
registered_models = [Tips, Cpi, CashFlow, Ladder]
for model in registered_models:
    admin.site.register(model)
