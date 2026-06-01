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
    # each user has one specs and many owned tips, with cascade delete so they are deleted if user is deleted
    specs = models.OneToOneField('Specs', on_delete=models.CASCADE, null=True, blank=True, related_name='user_specs')
    owned_tips = models.ManyToManyField('Owned_tips', blank=True, related_name='user_owned_tips')

class Tips(models.Model):
    tips_id = models.AutoField(primary_key=True)
    cusip = models.CharField(unique=True, max_length=12)
    dated_date = models.DateField()
    maturity_date = models.DateField()
    coupon_rate = models.FloatField()
    ref_cpi = models.FloatField()
    index_ratio = models.FloatField()
    updated = models.DateField()

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
    updated = models.DateField()

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
    cf_user = models.ForeignKey(User, on_delete=models.CASCADE)
    year = models.IntegerField()
    amount = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)

    class Meta:
        ordering = ['year']

    def to_dict(self):
        return {
            'username': self.cf_user.username,
            'year': self.year,
            'amount': self.amount
        }
    
    def __str__(self):
        return str(self.to_dict())

class Specs(models.Model):
    specs_id = models.AutoField(primary_key=True)
    specs_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='specs_user')
    tax_rate = models.FloatField(default=DEFAULT_TAX_RATE)
    start_year = models.IntegerField(default=DEFAULT_START_YEAR)
    end_year = models.IntegerField(default=DEFAULT_END_YEAR)
    base_cash_flow = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)
    inflate_base_cf = models.BooleanField(default=False)
    base_cash_flow_date = models.DateField(default=DEFAULT_BASE_CASH_FLOW_DATE)
    tax_effect_inflation = models.BooleanField(default=False)
    assumed_inflation_rate = models.FloatField(default=0.0)
    use_pretax = models.BooleanField(default=False)
    additional_flows = models.ManyToManyField(CashFlow, blank=True, related_name='cash_flows')
    
    def to_dict(self):
        return {
            'specs_id': self.specs_id,
            'username': self.specs_user.username,
            'tax_rate': self.tax_rate,
            'start_year': self.start_year,
            'end_year': self.end_year,
            'base_cash_flow': self.base_cash_flow,
            'inflate_base_cf': self.inflate_base_cf,
            'base_cash_flow_date': self.base_cash_flow_date.isoformat(),
            'tax_effect_inflation': self.tax_effect_inflation,
            'assumed_inflation_rate': self.assumed_inflation_rate,
            'use_pretax': self.use_pretax,
            'additional_flows': [cf.to_dict() for cf in self.additional_flows.all()]
        }

    def from_dict(self, specs_dict):
        self.tax_rate = specs_dict['tax_rate']
        self.start_year = specs_dict['start_year']
        self.end_year = specs_dict['end_year']
        self.base_cash_flow = specs_dict['base_cash_flow']
        self.inflate_base_cf = specs_dict['inflate_base_cf']
        self.base_cash_flow_date = specs_dict['base_cash_flow_date']
        self.tax_effect_inflation = specs_dict['tax_effect_inflation']
        self.assumed_inflation_rate = specs_dict['assumed_inflation_rate']
        self.use_pretax = specs_dict['use_pretax']
        for cf in specs_dict['additional_flows']:
            CashFlow.objects.update_or_create(cf_user=self.specs_user, year=cf['year'], defaults={'amount': cf['amount']})
        self.save()

    def __str__(self):
        return f"Specs with id {self.specs_id} for user {self.specs_user.username} covering years {self.start_year} to {self.end_year}"

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
            'id': self.owned_tips_id,
            'username': self.owned_tips_user.username,
            'account_type': self.account_type,
            'quantity': self.quantity,
            'owned_tips': self.tips.to_dict()
        }
        
    def from_dict(self, owned_tips_dict):
        self.account_type = owned_tips_dict['account_type']
        self.quantity = owned_tips_dict['quantity']
        self.tips = Tips.objects.filter(cusip=owned_tips_dict['owned_tips']['cusip']).first()
    
    def __str__(self):
        return f"Owned TIPS user {self.owned_tips_user.username} cusip {self.tips.cusip} quantity {self.quantity}"