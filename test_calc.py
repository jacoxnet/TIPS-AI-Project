import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tipsladder.settings')
django.setup()

from core.ladder_calc import calculate_ladder

test_data = {
    "tax_rate": 24,
    "start_year": 2026,
    "end_year": 2030,
    "base_cash_flow": 50000,
    "additional_flows": [{"year": 2028, "amount": 10000}],
    "owned_tips": [
        {
            "id_type": "coupon_maturity",
            "id_value": "0.125%, 2030-01-15",
            "account_type": "pretax",
            "quantity": 10
        }
    ]
}

print("Running test calculation...")
try:
    results = calculate_ladder(json.dumps(test_data))
    for r in results:
        print(r)
    print("Test calculation passed.")
except Exception as e:
    print(f"Test calculation failed: {e}")
