from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Tip(models.Model):
    TipId = models.AutoField(primary_key=True)
    cusip = models.CharField(max_length=12)
    dated_date = models.DateField
    maturity_date = models.DateField
    coupon_rate = models.FloatField
    ref_cpi = models.FloatField
    index_ratio = models.FloatField
    updated = models.DateTimeField

    def to_json(self):
        return {
            'cusip': self.cusip,
            'dated_date': self.dated_date,
            'maturity_date': self.maturity_date,
            'interest_rate': self.interest_rate,
            'ref_cpi': self.ref_cpi,
            'index_ratio': self.index_ratio
        }
    def __str__(self):
        return self.to_json()

class Cpi(models.Model):
    as_of_date = models.DateField
    cpi_value = models.FloatField

class CashFlow(models.Model):
    ladder = models.ForeignKey('Ladder', on_delete=models.CASCADE, related_name='additional_flows')
    year = models.IntegerField()
    amount = models.FloatField()

class Ladder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tax_rate = models.FloatField
    start_year = models.IntegerField
    end_year = models.IntegerField
    base_cash_flow = models.models.ForeignKey(CashFlow, on_delete=models.CASCADE)
    additional_flows = models.ManyToManyField(CashFlow, blank=True)
    future_inflation = models.FloatField(default=0.0)
    use_pretax = models.BooleanField(default=False)
    inflate_base_cash_flow = models.BooleanField(default=False)
    date_of_base_cash_flow = models.DateField()
    owned_tips = models.ManyToManyField(Tip, blank=True)
