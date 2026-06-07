# TIPS Ladder

A web app for planning a Treasury Inflation-Protected Securities (TIPS) ladder. Given the TIPS you already own, it calculates the after-tax, inflation-adjusted cash flow each year and shows where your holdings fall short of or exceed your target spending.

## Features

- Pulls live TIPS data (CUSIP, maturity, coupon rate, index ratio) from the US Treasury Fiscal Data API.
- Adjusts your base cash flow target for inflation using CPI data from FRED (from a historical as-of date to the present).
- Supports both after-tax and pre-tax cash flow targets.
- Accounts for account type (Roth, pretax/traditional IRA/401k, taxable brokerage) when calculating tax drag on coupons and principal.
- Tax-effects increases in principal (phantom income) for taxable brokerage accounts using an assumed inflation rate.
- Supports per-year cash flow overrides for years with different spending needs.
- Centrally saves and loads parameters and holdings via a JSON configuration file.
- Imports external CSV files (e.g. from tipsladder.com).

## Setup

**Prerequisites:** Python 3.10+

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate
```

Create a `.env` file in the project root with:

```
DJANGO_SECRET_KEY=your-secret-key-here
FRED_API_KEY=your-fred-api-key-here
```

A FRED API key is free and available at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html). It is used to fetch CPI-U data for inflation-adjusting your cash flow target.

## Running

```bash
source venv/bin/activate
python manage.py runserver
```

Then open `http://localhost:8000` in your browser.

## Usage

The application is structured into the following pages:

1. **Build Your Ladder** (`/make_ladder/`) — The main interface where you list the TIPS you currently own. Add owned TIPS by CUSIP, select the account type they are held in (taxable, pretax, or roth), and input the quantity (in $1,000 nominal principal increments).
2. **Ladder Parameters** (`/specs/`) — Set your parameters:
   - **Income Tax Rate (%)**: Your marginal tax rate.
   - **Start & End Years**: The horizon of your TIPS ladder.
   - **Base Cash Flow Target**: Your desired annual cash flow. You can choose to specify this target as either **Pre-Tax** or **After-Tax**.
   - **Historical CPI Adjustment**: Optionally adjust your base cash flow target for inflation from a historical date (e.g., matching a past date when your target was set) to the present. The app automatically fetches live CPI-U index data from FRED to perform the calculation.
   - **Phantom Income Tax Adjustment**: Choose whether to tax-effect principal increases for TIPS in taxable accounts using an assumed inflation rate.
   - **One-Time Cash Flow Differences**: Specify one-time annual overrides for years that require higher or lower cash flow targets.
3. **Display Results** (`/ladder_display/`) — View a year-by-year projection of coupons, maturing principal, phantom income adjustments, calculated tax drag, net real after-tax cash flow, and the resulting surplus or shortfall.
4. **Outstanding TIPS** (`/home/`) — View all outstanding U.S. TIPS fetched from the U.S. Treasury database, along with coupon rates, maturity dates, and live index ratios.
5. **Save/Load Data** (`/save_load/`) — Manage your data. You can save your specs and holdings as a JSON file, load a previously saved configuration, clear all data to start fresh, or upload/import external CSVs.

## Data Formats

### Configuration Save File (JSON)
When you save your data, the app downloads a JSON file containing all parameter specs and owned TIPS. An example layout of this saved data looks like:
```json
{
  "specsData": {
    "tax_rate": 24.0,
    "start_year": 2026,
    "end_year": 2056,
    "base_cash_flow": 50000.0,
    "inflate_base_cf": false,
    "base_cash_flow_date": "2024-01-01",
    "tax_effect_inflation": false,
    "assumed_inflation_rate": 0.0,
    "use_pretax": false,
    "additional_flows": []
  },
  "otipsData": [
    {
      "account_type": "taxable",
      "quantity": 3,
      "cusip": "912828V49",
      "maturity_date": "2030-01-15",
      "coupon_rate": 0.125
    }
  ]
}
```

### Import CSV Format
You can import holdings from external CSV files (such as those exported from other calculators like tipsladder.com). The CSV must use the following column structure:

`CUSIP,Quantity,Account_Type`

For example:
```csv
912828V49,3,taxable
9128282L3,5,pretax
9128283R9,2,roth
```

*Notes on CSV Import:*
- Supported account types are `taxable`, `pretax`, and `roth`.
- If the `Account_Type` column is omitted, the app accepts a simple two-column `CUSIP,Quantity` format and defaults the account type to `pretax`.
- A header row starting with `cusip` is automatically ignored.
