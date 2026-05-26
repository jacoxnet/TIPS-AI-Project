from django.db import models
from django.contrib.auth.models import User
import json

DEFAULT_CASH_FLOW_AMOUNT = 10000.00
DEFAULT_BASE_CASH_FLOW_DATE = '2024-01-01'
DEFAULT_START_YEAR = 2024
DEFAULT_END_YEAR = 2030
DEFAULT_TAX_RATE = 15.0

# Create your models here.
class Tips(models.Model):
    tipsId = models.AutoField(primary_key=True)
    cusip = models.CharField(unique=True, max_length=12)
    dated_date = models.DateField
    maturity_date = models.DateField
    coupon_rate = models.FloatField
    ref_cpi = models.FloatField
    index_ratio = models.FloatField
    updated = models.DateTimeField(auto_now=True)

    def to_json(self):
        return {
            'cusip': self.cusip,
            'dated_date': self.dated_date,
            'maturity_date': self.maturity_date,
            'coupon_rate': self.coupon_rate,
            'ref_cpi': self.ref_cpi,
            'index_ratio': self.index_ratio
        }
    def __str__(self):
        return json.dumps(self.to_json())

class Cpi(models.Model):
    as_of_date = models.DateField(unique=True)
    cpi_value = models.FloatField
    updated = models.DateTimeField

class CashFlow(models.Model):
    ladder = models.ForeignKey('Ladder', on_delete=models.CASCADE)
    year = models.IntegerField()
    amount = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)

class Ladder(models.Model):
    ladderId = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tax_rate = models.FloatField(default=DEFAULT_TAX_RATE)
    start_year = models.IntegerField(default=DEFAULT_START_YEAR)
    end_year = models.IntegerField(default=DEFAULT_END_YEAR)
    base_cash_flow = models.ForeignKey(CashFlow, on_delete=models.CASCADE, null=True, default=None, related_name='base_cash_flow')
    additional_flows = models.ManyToManyField(CashFlow, blank=True, related_name='additional_flows')
    future_inflation = models.FloatField(default=0.0)
    use_pretax = models.BooleanField(default=False)
    inflate_base_cash_flow = models.BooleanField(default=False)
    date_of_base_cash_flow = models.DateField(default=DEFAULT_BASE_CASH_FLOW_DATE)
    owned_tips = models.ManyToManyField(Tips, blank=True)
