# TIPS Ladder Web App

Using the Django framework, Python, and JavaScript, create a web application that allows the user to build a ladder of TIPS (treasury inflation protected securities) to provide a constant after-tax real dollar (not nominal dollar) cash flow in each calendar year of the ladder. 

More detailed specifications:

1. There should be a navigation bar or menu at the top of all pages allowing users to visit any page of the site.

2. The home page should display a scrollable table with information about currently outstanding/available TIPS. TIPS data should be obtained from the Fiscal Data RESTful API: 

        `api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_summary`
        `api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/tips_cpi_data_detail`

3. There should be a data entry page that allows a user to enter: 
    - The user's marginal income tax rate
    - The calendar years to be covered by the ladder
    - The desired real dollar cash flow after tax desired to be produced by the TIPS ladder, both as a base amount for each year covered by the ladder and as optional additional amounts for particular, specified years included in the ladder
    - The number of TIPS already owned by the user, each TIPS having an original principal of $1,000 nominal dollars as of its issuance. These TIPS can be specified either by the CUSIP number or by the coupon rate and maturity date of such TIPS
    - For each owned TIPS, the type of account (Roth, pretax, or taxable brokerage) in which each such TIPS is held.
    - The ability to load and save this data into a csv file specified by the user.

4. There should be a ladder display page that, when data entry is complete, displays a table including the after-tax real dollar (not nominal dollar) cash flow in each calendar year of the ladder. The table should include for each year the amount by which cash flow from the user's already-owned TIPS falls short of or exceeds the desired after-tax real cash flow. Cash flow for a calendar year should consist of 
    - (plus) coupon payments on the TIPS owned by the user of the app maturing in such calendar year or in later calendar years
    - (plus) the principal of TIPS owned by the user maturing in such calendar year
    - (minus) the marginal income tax rate specified by the user multiplied by 
        - the coupon payments on any TIPS owned by the user that are held in any account that is not a Roth account
        - the principal of any TIPS owned by the user held in a pretax account (such as a pretax IRA or 401(k)) that mature in such calendar year.
        