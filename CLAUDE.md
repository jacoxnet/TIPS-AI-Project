# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

A Django web app that helps users plan a TIPS (Treasury Inflation-Protected Securities) ladder — calculating how existing TIPS holdings produce after-tax, inflation-adjusted cash flow year by year and where shortfalls exist.

## Commands

Activate the virtualenv before running anything:
```bash
source venv/bin/activate
```

Run the dev server:
```bash
python manage.py runserver
```

Run standalone test scripts (not the Django test runner):
```bash
python test_calc.py    # tests the ladder calculation with live TIPS data
python test_fetch.py   # tests the Treasury API fetch directly
```

Run Django migrations:
```bash
python manage.py migrate
```

## Environment variables

Two variables must be present (loaded via `python-dotenv` from a `.env` file):
- `DJANGO_SECRET_KEY` — Django secret key
- `FRED_API_KEY` — API key for the St. Louis Fed FRED API (used to fetch CPI data)

## Architecture

### Django layout
The project has one Django app (`core`) and one settings package (`tipsladder`). All application logic lives in `core/`.

### Request flow
1. Every session starts at `/` → `init_view`, which resets session state and redirects to data entry.
2. **Data Entry** (`/data-entry/`) — user fills in ladder parameters and owned TIPS; the form collects everything into a JSON blob and POSTs it to `/ladder-display/`.
3. **Ladder Display** (`/ladder-display/`) — receives the JSON, calls `calculate_ladder()`, renders results. The JSON is also saved to Django's session so the results persist on page reload.

### In-memory singletons
`Tips` and `CpiData` in [core/tipsdata.py](core/tipsdata.py) use **class-level variables** as a cache shared across all requests in the same process. `Tips.all_tips` / `Tips.download_date` store TIPS fetched from Treasury; `CpiData.cpi_cache` / `CpiData.download_date` store CPI observations from FRED. Both caches are invalidated daily. `clear_data()` in [core/tinit.py](core/tinit.py) resets `Tips` (but not CPI) and wipes session state.

### External API calls
- **Treasury Fiscal Data API** ([core/fetch.py](core/fetch.py) `fetch_tips_data()`): fetches summary data (CUSIP, maturity, coupon rate, ref CPI) then detail data (index ratios) for today's date. Called on every page load but skipped if already fetched today.
- **FRED API** ([core/fetch.py](core/fetch.py) `fetch_cpi_data()`): fetches the latest CPI-U (`CPIAUCNS`) and the CPI as of the user's base cash flow date. October 2025 has a hard-coded value (`HARD_CODED_CPI_2025_10 = 324.461`) to work around a missing FRED data point caused by a government shutdown.

### Calculation logic ([core/ladder_calc.py](core/ladder_calc.py))
`calculate_ladder(ladderp)` takes a `Ladder_values` object and returns a list of per-year dicts. Key mechanics:
- **Inflation adjustment**: unless `use_pretax=True`, the base cash flow target is scaled by `latest_cpi / as_of_cpi` to convert from the user's base date dollars to current dollars.
- **Account type taxation**: coupons from pretax and taxable accounts are taxed; principal from pretax accounts is taxed at maturity; taxable accounts optionally incur tax on the inflation adjustment to principal (`tax_effect_inflation`).
- TIPS are identified in `owned_tips` by either `cusip` or `coupon_maturity` (`"rate%,YYYY-MM-DD"`); `get_tip_details()` looks them up against `Tips.all_tips`.

### Frontend ([static/js/data_entry.js](static/js/data_entry.js))
Vanilla JS — no build step. The data entry page manages owned TIPS as display/edit rows in a table, collects all form state into a JSON payload on submit, and supports CSV save/load. Two CSV formats are understood: a simple `CUSIP,Quantity` format and a richer tagged format (`PARAM`, `ADD_FLOW`, `OWNED_TIP` rows). The `Ladder_values` JSON blob is passed back and forth between the browser and Django entirely as a hidden form field.

### Session persistence
`SESSION_EXPIRE_AT_BROWSER_CLOSE = True`. The `ladder_data` session key holds the JSON-serialized `Ladder_values`. A `start_year` of `0` is the sentinel for "no data / cleared."
