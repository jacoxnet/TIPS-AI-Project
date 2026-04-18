# How to Use this App:

## General instructions and overview:  

- Input, either manually or by uploading a csv file, existing TIPS holdings. Include in the input 

    - the types of account in which the various TIPS are held,

    - the applicable income tax rate,

    - the desired real after-tax annual cash flow, 

    - the month and year in which such real cash flow is first determined (the "as-of date"), and

    - the parameters for any years for which there should be a different amount of real after-tax cash flow (specified using dollars from the as-of date).

- Click the "Calculate Ladder Output" button to see, on the "View Results" page, any deficits or surpluses in the existing ladder.

- You can modify TIPS you had previously entered on the "Build Ladder" page.  To save the modification, you must click the check mark icon in the "Action" column.  If the check mark is not clicked, the changes will not be saved.    

## Additional Explanations:

- The basic after-tax proceeds are determined as follows:

    - For TIPS held in a taxable brokerage account, all interest received each year is reduced using the specified tax rate.

    - For TIPS held in a pretax account (such as a traditional IRA or 401(k)), both the interest received and the principal received in any year are reduced using the specified tax rate.

    - For TIPS held in a Roth account, neither the interest nor the principal received is reduced.

- There is an optional tax adjustment for the taxes on the phantom (or real) income on the annual principal adjustments to all TIPS held in a taxable brokerage account.  

    - This adjustment is made for only TIPS held in a taxable brokerage account, because there are no taxes on principal adjustments for TIPS held in a Roth account and the taxes on principal adjustments for TIPS held in a pretax account only occur in the year the TIPS matures and the proceeds are removed from the pretax account (which taxes are already included in the basic adjustments described above).

- Note that, if uploading a csv file from tipsladder.com or certain other sources that do not specify which types of accounts hold the various TIPS, this app will assume that the TIPS are held in a pretax acount. 

    - That assumed account type may be adjusted using the "Edit this TIPS" buttons on the Build Ladder page.

- This app does not take into account taxes, if any, on Original Issue Discount (OID).

- This app assumes that cash flow from TIPS  (i.e., coupon payments and maturing principal) is withdrawn from tax advantaged accounts (e.g., an IRA, a 401(k) or a Roth acount) in the year received.  

    - Thus, coupon payments on TIPS held in pretax accounts and principal payments on TIPS held in pretax accounts are reduced in the year received by taxes thereon at the specified tax rate.  However, this app does not include any early withdrawal penalties that could be owed on money withdrawn from a tax-advantaged account.

- The formula for tax-effecting increases in principal based on a specified assumed inflation rate does not presently adjust for partial years.  This feature may be added in a subsequent update.
