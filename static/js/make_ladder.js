document.addEventListener('DOMContentLoaded', function () {

    // --- Parse TIPS Data ---
    const tipsDataElement = document.getElementById('tips-data');
    let tipsData = [];
    if (tipsDataElement) {
        try {
            tipsData = JSON.parse(tipsDataElement.textContent);
        } catch (e) {
            console.error("Failed to parse TIPS data", e);
        }
        // add dropdown field to tipsData
        tipsData.forEach(tip => {
            tip.dropdownValue = `${tip.cusip},${tip.coupon_rate}%,${tip.maturity_date}`;
            tip.dropdownText = `CUSIP: ${tip.cusip}, Coupon: ${tip.coupon_rate}%, Maturity: ${tip.maturity_date}`;
        });
    }

    const specsDataElement = document.getElementById('specs-data');
    let specsData = {};
    if (specsDataElement) {
        try {
            specsData = JSON.parse(specsDataElement.textContent);
        } catch (e) {
            console.error("Failed to parse specs data", e);
        }
    }

    function accountTypeLabel(val) {
        if (val === 'roth') return 'Roth';
        if (val === 'pretax') return 'Pretax (e.g., 401k/IRA)';
        if (val === 'taxable') return 'Taxable Brokerage';
        return val;
    }

    // --- Elements ---
    const addOwnedTipBtn = document.getElementById('addOwnedTipBtn');
    const ownedTipsTbody = document.getElementById('ownedTipsTbody');
    const emptyTipsRow = document.getElementById('emptyTipsRow');
    const addTipsActionRow = document.getElementById('addTipsActionRow');

    const ladderForm = document.getElementById('ladderForm');
    const ladderDataInput = document.getElementById('ladderDataInput');

    // Modal elements
    const changeListModal = document.getElementById('changeListModal');
    const closeChangeListModal = document.getElementById('closeChangeListModal');
    const closeChangeListBtn = document.getElementById('closeChangeListBtn');
    const changeListTbody = document.getElementById('changeListTbody');
    const saveChangeListCsvBtn = document.getElementById('saveChangeListCsvBtn');

    // Global tracking of data
    let currentOtipsData = [];
    let currentLadderYears = [];

    function updateEmptyRowVisibility() {
        const confirmedRows = document.querySelectorAll('.owned-tip-row');
        if (confirmedRows.length === 0 && emptyTipsRow) {
            emptyTipsRow.style.display = 'table-row';
        } else if (emptyTipsRow) {
            emptyTipsRow.style.display = 'none';
        }
    }

    /**
     * Creates a READ-ONLY display row for a confirmed TIPS entry.
     */
    function createDisplayRow(tip, accountType, qty, prevQty) {
        const tr = document.createElement('tr');
        tr.className = 'owned-tip-row confirmed';
        
        tr.dataset.cusip = tip.cusip;
        tr.dataset.maturity = tip.maturity;
        tr.dataset.coupon = tip.coupon;
        tr.dataset.accountType = accountType;
        tr.dataset.qty = qty;
        tr.dataset.prevQty = prevQty;
        
        const matchedTip = tipsData.find(t => t.cusip == tip.cusip);
        tr.dataset.dropdownValue = matchedTip ? matchedTip.dropdownValue : '';

        // Display qty with (previously prevQty) if different
        let qtyDisplay = `${qty}`;
        if (prevQty !== undefined && parseInt(prevQty, 10) !== parseInt(qty, 10)) {
            qtyDisplay += ` <em style="font-size:0.85rem; color:var(--text-secondary);">(previously ${prevQty})</em>`;
        }

        tr.innerHTML = `
            <td class="tip-display-cusip">${tip.cusip}</td>
            <td class="tip-display-maturity">${tip.maturity}</td>
            <td class="tip-display-coupon">${tip.coupon}%</td>
            <td class="tip-display-account">${accountTypeLabel(accountType)}</td>
            <td class="tip-display-qty">${qtyDisplay}</td>
            <td style="white-space:nowrap;">                
                <button type="button" class="icon-btn icon-btn-edit" title="Edit this TIPS">&#9998;</button>
                <button type="button" class="icon-btn icon-btn-delete" title="Delete this TIPS">&#128465;</button>
            </td>
        `;

        // If quantity is 0 (deleted), hide delete button
        if (parseInt(qty, 10) === 0) {
            const delBtn = tr.querySelector('.icon-btn-delete');
            if (delBtn) delBtn.style.display = 'none';
        }

        // Edit button
        tr.querySelector('.icon-btn-edit').addEventListener('click', () => {
            const entryRow = createEntryRow(tr, null);
            tr.replaceWith(entryRow);
            updateEmptyRowVisibility();
        });

        // Delete button
        tr.querySelector('.icon-btn-delete').addEventListener('click', () => {
            const payload = [];
            document.querySelectorAll('.owned-tip-row.confirmed').forEach(row => {
                if (row === tr) return; // skip this row
                payload.push({
                    cusip: row.dataset.cusip,
                    account_type: row.dataset.accountType,
                    quantity: parseInt(row.dataset.qty, 10)
                });
            });
            updateOwnedTips(payload);
        });

        return tr;
    }

    /**
     * Creates an EDITABLE entry form row.
     */
    function createEntryRow(editingRow, insertAfter) {
        const prefill = editingRow ? {
            cusipMaturityCoupon: editingRow.dataset.dropdownValue,
            accountType: editingRow.dataset.accountType,
            qty: editingRow.dataset.qty
        } : null;

        const tr = document.createElement('tr');
        tr.className = 'tip-entry-row';

        tr.innerHTML = `
            <td colspan="2">
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <select class="tip-id-cusipmaturitycoupon" style="flex:1; min-width:160px; padding:0.35rem 0.5rem; font-size:0.85rem;">
                        <option value="" disabled selected>Select a TIPS...</option>
                    </select>
                </div>
            </td>
            <td>
                <select class="tip-account-type" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                    <option value="roth">Roth</option>
                    <option value="pretax">Pretax (e.g., 401k/IRA)</option>
                    <option value="taxable">Taxable Brokerage</option>
                </select>
            </td>
            <td>
                <input type="number" class="tip-quantity" placeholder="No. of $1k bonds" min="1"
                    style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
            </td>
            <td style="white-space:nowrap;">
                <button type="button" class="icon-btn icon-btn-confirm" title="Confirm">&#10003;</button>
                <button type="button" class="icon-btn icon-btn-cancel" title="Cancel">&#10005;</button>
            </td>
        `;

        const cusipMaturityCouponSelect = tr.querySelector('.tip-id-cusipmaturitycoupon');
        const accountTypeSelect = tr.querySelector('.tip-account-type');
        const qtyInput = tr.querySelector('.tip-quantity');

        // Populate dropdown
        tipsData.forEach(tip => {
            const opt = document.createElement('option');
            opt.value = tip.dropdownValue;
            opt.textContent = tip.dropdownText;
            cusipMaturityCouponSelect.appendChild(opt);
        });

        if (prefill) {
            cusipMaturityCouponSelect.value = prefill.cusipMaturityCoupon;
            accountTypeSelect.value = prefill.accountType;
            qtyInput.value = prefill.qty;
        }

        // Confirm
        tr.querySelector('.icon-btn-confirm').addEventListener('click', () => {
            const fields = [cusipMaturityCouponSelect, accountTypeSelect, qtyInput];
            const isValid = fields.every(f => f.checkValidity() && f.value !== '');
            if (!isValid) {
                fields.forEach(f => f.reportValidity && f.reportValidity());
                return;
            }
            
            const tparm = tipsData.find(t => t.dropdownValue == cusipMaturityCouponSelect.value);
            
            // Gather all other confirmed tips
            const payload = [];
            document.querySelectorAll('.owned-tip-row.confirmed').forEach(row => {
                if (editingRow && row === editingRow) return;
                payload.push({
                    cusip: row.dataset.cusip,
                    account_type: row.dataset.accountType,
                    quantity: parseInt(row.dataset.qty, 10)
                });
            });
            
            // Add current new/edited tip
            payload.push({
                cusip: tparm.cusip,
                account_type: accountTypeSelect.value,
                quantity: parseInt(qtyInput.value, 10)
            });
            
            updateOwnedTips(payload);
        });

        // Cancel
        tr.querySelector('.icon-btn-cancel').addEventListener('click', () => {
            if (editingRow) {
                tr.replaceWith(editingRow);
            } else {
                tr.remove();
            }
            updateEmptyRowVisibility();
        });

        return tr;
    }

    // Persistent add button
    addOwnedTipBtn.addEventListener('click', () => {
        const prev = addTipsActionRow.previousElementSibling;
        if (prev && prev.classList.contains('tip-entry-row')) return;

        const entryRow = createEntryRow(null, null);
        ownedTipsTbody.insertBefore(entryRow, addTipsActionRow);
        updateEmptyRowVisibility();
    });

    /**
     * Submit confirmed payload to server
     */
    function updateOwnedTips(payload) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        fetch('/update_owned_tips/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ owned_tips: payload })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                return;
            }
            currentOtipsData = data.otips_data;
            currentLadderYears = data.ladder_years;
            renderTable(currentOtipsData, currentLadderYears);
        })
        .catch(err => {
            console.error("Error updating owned tips:", err);
            alert("Failed to save changes. Please try again.");
        });
    }

    /**
     * Clear and redraw the table, inserting subtotal rows chronologically.
     */
    function renderTable(otips, ladderYears) {
        // Remove existing confirmed, subtotal, and entry rows
        const rowsToRemove = ownedTipsTbody.querySelectorAll('.owned-tip-row, .subtotal-row, .tip-entry-row');
        rowsToRemove.forEach(row => row.remove());

        const startYear = specsData.start_year;
        const endYear = specsData.end_year;
        let hasChanges = false;

        for (let y = startYear; y <= endYear; y++) {
            // Find tips maturing in year y
            const tipsInYear = otips.filter(otip => {
                const matYear = parseInt(otip.maturity_date.split('-')[0], 10);
                return matYear === y;
            });

            // Draw subtotal row for year y
            const rowData = ladderYears.find(r => r.year === y);
            let balance = 0;
            const isPretax = specsData.use_pretax;
            if (rowData) {
                balance = isPretax ? rowData.pretax_balance : rowData.balance;
            }

            let displayText = "";
            let displayClass = "";
            if (balance > 0) {
                displayText = `+$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                displayClass = "text-success";
            } else if (balance < 0) {
                displayText = `-$${Math.abs(balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                displayClass = "text-danger";
            } else {
                displayText = "$0.00";
                displayClass = "";
            }

            const subtotalTr = document.createElement('tr');
            subtotalTr.className = 'subtotal-row';
            subtotalTr.style.fontWeight = '600';
            subtotalTr.innerHTML = `
                <td colspan="4" style="color: var(--text-secondary); padding: 0.75rem 1rem;">
                    Year ${y} Surplus/Shortfall
                </td>
                <td class="text-right ${displayClass}" style="font-weight: 700; padding: 0.75rem 1rem;">
                    ${displayText}
                </td>
                <td></td>
            `;
            ownedTipsTbody.insertBefore(subtotalTr, addTipsActionRow);

            // Draw tips
            tipsInYear.forEach(otip => {
                const displayRow = createDisplayRow(
                    {
                        cusip: otip.cusip,
                        maturity: otip.maturity_date,
                        coupon: otip.coupon_rate
                    },
                    otip.account_type,
                    otip.quantity,
                    otip.prev_quantity
                );
                ownedTipsTbody.insertBefore(displayRow, addTipsActionRow);

                if (parseInt(otip.quantity, 10) !== parseInt(otip.prev_quantity, 10)) {
                    hasChanges = true;
                }
            });
        }

        // Display/hide "Change List" buttons
        const changeListBtns = document.querySelectorAll('.change-list-btn');
        changeListBtns.forEach(btn => {
            btn.style.display = hasChanges ? 'inline-block' : 'none';
        });

        updateEmptyRowVisibility();
    }

    // --- Form Submission / Gathering Data ---
    ladderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Automatically cancel any unconfirmed edits/additions before submission
        document.querySelectorAll('.tip-entry-row .icon-btn-cancel').forEach(btn => btn.click());

        const payload = {
            owned_tips: []
        };

        // Collect only confirmed tips where quantity > 0
        currentOtipsData.forEach(otip => {
            if (parseInt(otip.quantity, 10) > 0) {
                payload.owned_tips.push({
                    cusip: otip.cusip,
                    account_type: otip.account_type,
                    quantity: otip.quantity
                });
            }
        });

        ladderDataInput.value = JSON.stringify(payload);
        ladderForm.submit();
    });

    // --- Modal Display Logic ---
    function showChangeListModal() {
        changeListTbody.innerHTML = '';
        
        const changes = [];
        currentOtipsData.forEach(otip => {
            const diff = parseInt(otip.quantity, 10) - parseInt(otip.prev_quantity, 10);
            if (diff !== 0) {
                changes.push({
                    action: diff < 0 ? 'Sell' : 'Buy',
                    cusip: otip.cusip,
                    maturity: otip.maturity_date,
                    coupon: otip.coupon_rate,
                    accountType: otip.account_type,
                    quantity: diff
                });
            }
        });

        if (changes.length === 0) {
            changeListTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-secondary">No changes made.</td>
                </tr>
            `;
        } else {
            changes.forEach(c => {
                const tr = document.createElement('tr');
                const actionClass = c.action === 'Sell' ? 'text-danger' : 'text-success';
                const qtyText = c.quantity > 0 ? `+${c.quantity}` : `${c.quantity}`;
                tr.innerHTML = `
                    <td class="${actionClass}" style="font-weight:700;">${c.action}</td>
                    <td>${c.cusip}</td>
                    <td>${c.maturity}</td>
                    <td>${c.coupon}%</td>
                    <td>${accountTypeLabel(c.accountType)}</td>
                    <td class="text-right ${actionClass}" style="font-weight:700;">${qtyText}</td>
                `;
                changeListTbody.appendChild(tr);
            });
        }
        
        changeListModal.style.display = 'block';
    }

    function saveChangeListToCsv() {
        const header = "cusip,maturity_date,coupon_rate,quantity\n";
        let csvContent = header;
        
        currentOtipsData.forEach(otip => {
            const diff = parseInt(otip.quantity, 10) - parseInt(otip.prev_quantity, 10);
            if (diff !== 0) {
                csvContent += `${otip.cusip},${otip.maturity_date},${otip.coupon_rate},${diff}\n`;
            }
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tips_change_list.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Attach modal events
    document.querySelectorAll('.change-list-btn').forEach(btn => {
        btn.addEventListener('click', showChangeListModal);
    });
    if (closeChangeListModal) {
        closeChangeListModal.addEventListener('click', () => changeListModal.style.display = 'none');
    }
    if (closeChangeListBtn) {
        closeChangeListBtn.addEventListener('click', () => changeListModal.style.display = 'none');
    }
    if (saveChangeListCsvBtn) {
        saveChangeListCsvBtn.addEventListener('click', saveChangeListToCsv);
    }
    window.addEventListener('click', (e) => {
        if (e.target === changeListModal) {
            changeListModal.style.display = 'none';
        }
    });

    // --- Load Initial Data ---
    const otipsDataElement = document.getElementById('otips-data');
    const ladderYearsElement = document.getElementById('ladder-years');

    let initialOtipsData = [];
    let initialLadderYears = [];

    if (otipsDataElement && otipsDataElement.textContent && otipsDataElement.textContent !== "{}") {
        try {
            initialOtipsData = JSON.parse(otipsDataElement.textContent);
        } catch (e) {
            console.error("Failed to parse initial otips data", e);
        }
    }

    if (ladderYearsElement && ladderYearsElement.textContent && ladderYearsElement.textContent !== "{}") {
        try {
            initialLadderYears = JSON.parse(ladderYearsElement.textContent);
        } catch (e) {
            console.error("Failed to parse initial ladder years", e);
        }
    }

    currentOtipsData = initialOtipsData;
    currentLadderYears = initialLadderYears;

    renderTable(initialOtipsData, initialLadderYears);
});
