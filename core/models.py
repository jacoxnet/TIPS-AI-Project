from django.db import models
from django.contrib.auth.models import AbstractUser

DEFAULT_CASH_FLOW_AMOUNT = 10000.00
DEFAULT_BASE_CASH_FLOW_DATE = '2024-01-01'
DEFAULT_START_YEAR = 2026
DEFAULT_END_YEAR = 2030
DEFAULT_TAX_RATE = 15.0

# Create your models here.

class User(AbstractUser):
    pass

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
    cf_id = models.AutoField(primary_key=True)
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


class Specs(models.Model):
    specs_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='specs_user')
    tax_rate = models.FloatField(default=DEFAULT_TAX_RATE)
    start_year = models.IntegerField(default=DEFAULT_START_YEAR)
    end_year = models.IntegerField(default=DEFAULT_END_YEAR)
    base_cash_flow = models.FloatField(default=DEFAULT_CASH_FLOW_AMOUNT)
    inflate_base_cf = models.BooleanField(default=False)
    base_cash_flow_date = models.DateField(default=DEFAULT_BASE_CASH_FLOW_DATE)
    tax_effect_inflation = models.BooleanField(default=False)
    assumed_inflation_rate = models.FloatField(default=0.0)
    use_pretax = models.BooleanField(default=False)
    additional_flows = models.ManyToManyField(CashFlow, related_name='in_specs')
    
    def to_dict(self):
        return {
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
        self.inflate_base_cf = specs_dict.get('inflate_base_cf', False)
        self.base_cash_flow_date = specs_dict['base_cash_flow_date']
        self.tax_effect_inflation = specs_dict['tax_effect_inflation']
        self.assumed_inflation_rate = specs_dict['assumed_inflation_rate']
        self.use_pretax = specs_dict['use_pretax']
        for cf in self.additional_flows.all():
            cf.delete()
        if specs_dict.get('additional_flows', None):
            for cf in specs_dict['additional_flows']:
                self.additional_flows.add(CashFlow.objects.create(year=cf['year'], amount=cf['amount']))
        self.save()

    def __str__(self):
        return str(self.to_dict())


class Owned_tips(models.Model):
    owned_tips_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_tips_user')
    tips = models.ForeignKey(Tips, on_delete=models.CASCADE)
    # account type can be "taxable", "pretax", or "roth"
    account_type = models.CharField(max_length=20, default='pretax')
    quantity = models.IntegerField(default=0)

    class Meta:
        ordering = ['tips']

    def to_dict(self):
        return {
            'account_type': self.account_type,
            'quantity': self.quantity,
            'cusip': self.tips.cusip,
            'maturity_date': self.tips.maturity_date,
            'coupon_rate': self.tips.coupon_rate}
        
    def from_dict(self, owned_tips_dict):
        self.account_type = owned_tips_dict['account_type']
        self.quantity = owned_tips_dict['quantity']
        self.tips = Tips.objects.filter(cusip=owned_tips_dict['cusip']).first()
        self.save()
    
    def __str__(self):
        return f"Owned TIPS user {self.user.username} cusip {self.tips.cusip} quantity {self.quantity}"


class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Feedback from {self.user.username} on {self.date.strftime('%Y-%m-%d %H:%M:%S')}"