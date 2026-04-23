# TIPS Ladder

A web app for planning a Treasury Inflation-Protected Securities (TIPS) ladder. Given the TIPS you already own, it calculates the after-tax, inflation-adjusted cash flow each year and shows where your holdings fall short of or exceed your target spending.

## Features

- Pulls live TIPS data (CUSIP, maturity, coupon rate, index ratio) from the US Treasury Fiscal Data API
- Adjusts your target cash flow for inflation using CPI data from FRED
- Accounts for account type (Roth, pretax/IRA/401k, taxable brokerage) when calculating tax drag on coupons and principal
- Supports per-year cash flow targets for years with different spending needs
- Save and load your ladder configuration as a CSV file

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

1. **Build Ladder** (home page) — view all currently outstanding TIPS with their index ratios.
2. **Data Entry** — enter your parameters:
   - Marginal income tax rate
   - Ladder start and end year
   - Target annual after-tax cash flow (in today's dollars), with the month/year those dollars are pegged to
   - Optional per-year overrides for years with different spending needs
   - Each TIPS you own: identified by CUSIP or coupon rate + maturity date, the account type it's held in, and quantity (each bond = $1,000 nominal principal)
3. **Ladder Display** — see a year-by-year table of coupons, principal, tax drag, net cash flow, and surplus/shortfall vs. your target.

Use **Save CSV** to export your configuration and **Load CSV** to restore it later. A sample ladder file is available via the **Load Sample** button on the data entry page.

## CSV Format

The CSV uses a tagged row format:

```
PARAM,tax_rate,24,,
PARAM,start_year,2027,,
PARAM,end_year,2056,,
PARAM,base_cash_flow,10000,,
PARAM,base_cash_flow_date,2025-02,,
PARAM,use_pretax,false,,
PARAM,tax_effect_inflation,true,,
PARAM,assumed_inflation_rate,3,,
ADD_FLOW,2030,15000,,
OWNED_TIP,cusip,912828V49,taxable,3
OWNED_TIP,coupon_maturity,"0.125%,2030-01-15",pretax,5
```

A simple two-column format (`CUSIP,Quantity`) is also accepted for importing holdings without account-type information (defaults to pretax).
