# How to Use this App:

## General instructions and overview:  

### Entering Data

- Enter your existing TIPS holdings. You can do this by:

    - manually entering them on the Build Your Ladder page, or 

    - uploading a csv file of your TIPS holdings from [TipsLadder](https://tipsladder.com), from [Treasury Investors Portal](https://aerokam.github.io/Treasuries), or from another source that can produce a Cusip-Quantity csv file with those fields;

    - if you uploaded a csv file, you will need to add the types of account (taxable, pretax, or Roth) in which the TIPS are held. Otherwise, the app assumes uploaded TIPS are in a pretax account.

- Enter the additional information on the Ladder Parameters page that the app needs to produce its analysis, including:

    - the assumed federal income tax rate, 

    - the desired real after-tax annual cash flow, 

    - the month and year in which such real cash flow is first determined (the "as-of date"), and

    - the parameters for any years for which there should be a different amount of real after-tax cash flow (specified using dollars from the as-of date).

- When you're finished entering data on the Ladder Parameters page, click on the Confirm Parameters button. When you're finished entering your owned TIPS, click on the Confirm Ladder button. 

### Viewing Results

- As you enter owned TIPS on the Build Your Ladder page, the app dynamically calculates the per-year surplus or shortfall in comparison to the desired cash flow.

- The Display Results page shows more detailed calculations for each ladder year, together with an overall surplus or shortfall.

- You can modify your earlier entries by returning to the Ladder Parameters and Build Your Ladder pages. 

### What-If Calculations

- Once you've entered a ladder, you might want to explore what would happen to the cash flows if you made changes to your owned TIPS portfolio. You can do this by clicking on the change or delete icons next to each existing TIPS and the add-TIPS icon at the bottom. The app dynamically adjusts the calculated cash flow using the new ladder entries, but it keeps track of each change and can display and save the change list using the Change List button. 

- You can clear the change list by clicking on the Confirm Ladder page, which confirms and incorporates all changes.

## Calculation Assumptions:

- The basic after-tax proceeds are determined as follows:

    - For TIPS held in a taxable brokerage account, all interest received each year is reduced using the specified tax rate.

    - For TIPS held in a pretax account (such as a traditional IRA or 401(k)), both the interest received and the principal received in any year are reduced using the specified tax rate.

    - For TIPS held in a Roth account, neither the interest nor the principal received is reduced.

- There is an optional tax adjustment for the taxes on the phantom (or real) income on the annual principal adjustments to all TIPS held in a taxable brokerage account.  

    - This adjustment is made for only TIPS held in a taxable brokerage account, because there are no taxes on principal adjustments for TIPS held in a Roth account and the taxes on principal adjustments for TIPS held in a pretax account only occur in the year the TIPS matures and the proceeds are removed from the pretax account (which taxes are already included in the basic adjustments described above).

- This app does not take into account taxes, if any, on Original Issue Discount (OID).

- This app assumes that cash flow from TIPS  (i.e., coupon payments and maturing principal) is withdrawn from tax advantaged accounts (e.g., an IRA, a 401(k) or a Roth account) in the year received.  

    - Thus, coupon payments on TIPS held in pretax accounts and principal payments on TIPS held in pretax accounts are reduced in the year received by taxes thereon at the specified tax rate.  However, this app does not include any early withdrawal penalties that could be owed on money withdrawn from a tax-advantaged account.

- The formula for tax-effecting increases in principal based on a specified assumed inflation rate does not presently adjust for partial years.  This feature may be added in a subsequent update.
