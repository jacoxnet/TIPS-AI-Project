# AFTER-TAX TIPS LADDER CALCULATOR

## Description: 

A web app for planning a Treasury Inflation-Protected Securities (TIPS) ladder. Given the TIPS you already own, it calculates the after-tax, inflation-adjusted cash flow each year and shows where your holdings fall short of or exceed your target spending.

## Features

- Pulls live TIPS data (CUSIP, maturity, coupon rate, index ratio) from the US Treasury Fiscal Data API.
- Pulls CPI data from the St. Louis Fed's FRED database.
- Adjusts your base cash flow target for inflation(from a historical as-of date to the present).
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

## Running (on Django Development Server)

```bash
source venv/bin/activate
python manage.py runserver
```

Then open `http://localhost:8000` in your browser.

## Usage

The application is structured into the following pages:

1. **Build Your Ladder** (`/make_ladder/`) — The main interface where you list the TIPS you currently own. Add owned TIPS, select the account type they are held in (taxable, pretax, or roth), and input the quantity (in $1,000 nominal principal increments).
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

### LLM Assistance

This app was developed with the assistance of the free tier of Google's Gemini LLM. The initial structure of the app was created by the LLM from a prompt. That initial structure, however, was simplified and bare-bones in comparison to the current version and did not include key structural changes made later, such as the use of the Django ORM database functionality. The coding in this final version of the app is in essence all human coding, with the LLM used to amplify code generation and to track down issues and problems.

### Files Developed

#### Python

  1. **core.views.py** Contains the principal code implementing the pages and AJAX web points. 

      - **init_view** Registers new user and initilizes the database, fetching initial TIPS and CPI data.
      - **home_view** Displays the list of available TIPS along with their calculated index ratios used for calculating inflated principal values.
      - **specs_view** Permits the user to enter and change the various parameters (e.g., tax rate, ladder years) governing the ladder.
      - **merge_duplicate_otips** Function called from make_ladder page, finding and merging duplicative owned TIPS after user editing.
      - **make_ladder_view** Permits the user to enter and change the TIPS in the ladder. Keeps track of changes and shows a dynamically calculated surplus/shortfall for each ladder year.
      - **ladder_display_view** displays detailed calculations for each ladder year of the return and tax information for the ladder.
      - **save_load_view** allows the user to load and save data locally.
      - **import_data_view** called from ajax request with saved JSON data to be loaded into app.
      - **import_csv_view** called from ajax request with uploaded (local) CSV data.
      - **sample_csv_view** called from ajax request to load the sample CSV data. Note the sample data is kept on the server so the csv is loaded directly from the python code.
      - **clear_data_view** called from ajax request to clear all data in database and in app.
      - **update_owned_tips_view** called from ajax request to help update the owned tips view in the make_ladder view. Returns new owned tips data to the JS/template.

  2. **core.models.py** Defines the models used in the Django ORM database. 
      - **User** Although there is no login facility, we keep track of users to make sure data is separated by sessions
      - **Tips** Holds downloaded TIPS info from API
      - **Cpi** Holds downloaded CPI info from API
      - **CashFlow** holds special cashflow years that might be added to Specs.
      - **Specs** holds ladder specifications (parameters).
      - **Owned_tips** Data for each owned TIPS (Tips reference, user, account type, quantity).
  
  3. **core.dbstuff.py** Various functions for handling database operations, such as adding TIPS, parsing a CSV, loading specs.

  4. **core.fetch.py** Functions for downloading data (TIPS, CPI) from APIs.

  5. **ladder_calc.py** Function for calculating the ladder years given the specs and the tips ladder.

  6. **tinit.py** Initiliazes things and registers new user.

#### CSS/JavaScript/HTML

  7. **style.css**

  8. **make_ladder.js** Contains detailed JS code implementing the in-page logic for the make_ladder page, including ajax calls to the backend python code.

  9. **save_load.js** JS code for the in-page logic for the save/load page allowing data to be stored/loaded in JSON and csv formats.

  10. **specs.js** JS code to implement the parameter entry page.

  11. **base.html**, **home.html**, **ladder_display.html**, **save_load.html**, **specs.html** HTML code to implement these pages.

  #### Other Files

  12. **how-to.md** Help file that displays in-app.

  13. **favicon.png** App icon.