from django.db import models
from django.contrib.auth.models import AbstractUser

DEFAULT_CASH_FLOW_AMOUNT = 10000.00
DEFAULT_BASE_CASH_FLOW_DATE = '2024-01-01'
DEFAULT_START_YEAR = 2024
DEFAULT_END_YEAR = 2030
DEFAULT_TAX_RATE = 15.0

# Create your models here.

class User(AbstractUser):
    # additional customized fields
    # each user has one spec and many owned tips, with cascade delete so they are deleted if user is deleted
    spec = models.OneToOneField('Spec', on_delete=models.CASCADE, null=True, blank=True, related_name='user_spec')
    owned_tips = models.ManyToManyField('Owned_tips', blank=True, related_name='user_owned_tips')

class Tips(models.Model):
    tips_id = models.AutoField(primary_key=True)
    cusip = models.CharField(unique=True, max_length=12)
    dated_date = models.DateField()
    maturity_date = models.DateField()
    coupon_rate = models.FloatField()
    ref_cpi = models.FloatField()
    index_ratio = models.FloatField()
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['maturity_date']

    def to_dict(self):
        return {
            'cusip': self.cusip,
            'dated_date': self.dated_date.isoformat(),
            'maturity_date': self.maturity_date.isoformat(),
            'coupon_rate': self.coupon_rate,
            'ref_cpi': self.ref_cpi,
            'index_ratio': self.index_ratio
        }
    
    def __str__(self):
        return str(self.to_dict())

class Cpi(models.Model):
    as_of_date = models.DateField(unique=True)
    cpi_value = models.FloatField()
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['as_of_date']
    
    def to_dict(self):
        return {
            'as_of_date': self.as_of_date.isoformat(),
            'cpi_value': self.cpi_value
        }
    
    def __str__(self):
        return str(self.to_dict())

class CashFlow(models.Model):
    year = models.IntegerField()
    amount = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)

    class Meta:
        ordering = ['year']

    def to_dict(self):
        return {
            'year': self.year,
            'amount': self.amount
        }
    
    def __str__(self):
        return str(self.to_dict())

class Spec(models.Model):
    spec_id = models.AutoField(primary_key=True)
    spec_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='spec_user')
    tax_rate = models.FloatField(default=DEFAULT_TAX_RATE)
    start_year = models.IntegerField(default=DEFAULT_START_YEAR)
    end_year = models.IntegerField(default=DEFAULT_END_YEAR)
    base_cash_flow = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)
    addl_cash_flows = models.ManyToManyField(CashFlow, blank=True, related_name='cash_flows')
    future_inflation = models.FloatField(default=0.0)
    use_pretax = models.BooleanField(default=False)
    inflate_base_cash_flow = models.BooleanField(default=False)
    date_of_base_cash_flow = models.DateField(default=DEFAULT_BASE_CASH_FLOW_DATE)

    def to_dict(self):
        return {
            'spec_id': self.spec_id,
            'username': self.spec_user.username,
            'tax_rate': self.tax_rate,
            'start_year': self.start_year,
            'end_year': self.end_year,
            'base_cash_flow': self.base_cash_flow,
            'addl_cash_flows': [cf.to_dict() for cf in self.addl_cash_flows.all()],
            'future_inflation': self.future_inflation,
            'use_pretax': self.use_pretax,
            'inflate_base_cash_flow': self.inflate_base_cash_flow,
            'date_of_base_cash_flow': self.date_of_base_cash_flow.isoformat(),
        }

    def __str__(self):
        return f"Spec with id {self.spec_id} for user {self.user.username} covering years {self.start_year} to {self.end_year}"

class Owned_tips(models.Model):
    owned_tips_id = models.AutoField(primary_key=True)
    owned_tips_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_tips_user')
    tips = models.ForeignKey(Tips, on_delete=models.CASCADE)
    # account type can be "taxable", "pretax", or "roth"
    account_type = models.CharField(max_length=20, default='pretax')
    quantity = models.IntegerField(default=0)

    class Meta:
        ordering = ['owned_tips_user', 'tips']

    def to_dict(self):
        return {
            'username': self.owned_tips_user.username,
            'cusip': self.tips.cusip,
            'dated_date': self.tips.dated_date.isoformat(),
            'maturity_date': self.tips.maturity_date.isoformat(),
            'coupon_rate': self.tips.coupon_rate,
            'index_ratio': self.tips.index_ratio,
            'account_type': self.account_type,
            'quantity': self.quantity
        }
    
    def __str__(self):
        return f"Owned TIPS cusip {self.cusip} for user {self.user.username} with quantity {self.quantity}"