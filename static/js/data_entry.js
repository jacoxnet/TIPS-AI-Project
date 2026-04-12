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
    }

    // Given a stored id_type / id_value, return display strings {cusip, maturityCoupon}
    function resolveDisplayValues(idType, idValue) {
        if (idType === 'cusip') {
            const tip = tipsData.find(t => t.cusip === idValue);
            const cusip = idValue;
            const maturityCoupon = tip ? `${tip.maturity_date} / ${tip.interest_rate}%` : '—';
            return { cusip, maturityCoupon };
        } else {
            // idValue is "rate%,maturity_date"
            const parts = idValue.split(',');
            const rate = parts[0];
            const maturity = parts[1] || '';
            const tip = tipsData.find(t => {
                const val = `${t.interest_rate}%,${t.maturity_date}`;
                return val === idValue;
            });
            const cusip = tip ? tip.cusip : '—';
            const maturityCoupon = `${maturity} / ${rate}`;
            return { cusip, maturityCoupon };
        }
    }

    function accountTypeLabel(val) {
        if (val === 'roth') return 'Roth';
        if (val === 'pretax') return 'Pretax (e.g., 401k/IRA)';
        if (val === 'taxable') return 'Taxable Brokerage';
        return val;
    }

    function populateDropdown(selectElement, idType, preselectedValue) {
        selectElement.innerHTML = '<option value="" disabled selected>Select a TIPS...</option>';
        tipsData.forEach(tip => {
            const option = document.createElement('option');
            if (idType === 'cusip') {
                option.value = tip.cusip;
                option.textContent = tip.cusip;
            } else {
                const val = `${tip.interest_rate}%,${tip.maturity_date}`;
                option.value = val;
                option.textContent = `Coupon: ${tip.interest_rate}%, Maturity: ${tip.maturity_date}`;
            }
            selectElement.appendChild(option);
        });
        if (preselectedValue) {
            selectElement.value = preselectedValue;
        }
    }

    // --- Elements ---
    const addCashFlowBtn = document.getElementById('addCashFlowBtn');
    const additionalCashFlowsContainer = document.getElementById('additionalCashFlowsContainer');

    const addOwnedTipBtn = document.getElementById('addOwnedTipBtn');
    const ownedTipsTbody = document.getElementById('ownedTipsTbody');
    const emptyTipsRow = document.getElementById('emptyTipsRow');
    const addTipsActionRow = document.getElementById('addTipsActionRow');

    const ladderForm = document.getElementById('ladderForm');
    const ladderDataInput = document.getElementById('ladderDataInput');

    const saveCsvBtn = document.getElementById('saveCsvBtn');
    const loadCsvBtn = document.getElementById('loadCsvBtn');
    const clearLadderBtn = document.getElementById('clearLadderBtn');

    const taxEffectInflation = document.getElementById('taxEffectInflation');
    const assumedInflationRateContainer = document.getElementById('assumedInflationRateContainer');
    const assumedInflationRate = document.getElementById('assumedInflationRate');

    if (taxEffectInflation && assumedInflationRateContainer && assumedInflationRate) {
        taxEffectInflation.addEventListener('change', () => {
            if (taxEffectInflation.value === 'yes') {
                assumedInflationRateContainer.style.display = 'block';
                assumedInflationRate.required = true;
            } else {
                assumedInflationRateContainer.style.display = 'none';
                assumedInflationRate.required = false;
            }
        });
    }

    const startYearInput = document.getElementById('startYear');
    if (startYearInput) {
        startYearInput.min = new Date().getFullYear();
    }

    // --- Populate As-Of Date Year Dropdown ---
    const baseCashFlowYear = document.getElementById('baseCashFlowYear');
    if (baseCashFlowYear) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear + 1; y >= 1997; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            baseCashFlowYear.appendChild(opt);
        }
    }

    // --- Helpers for As-Of Date ---
    function getBaseCashFlowDate() {
        const m = document.getElementById('baseCashFlowMonth').value;
        const y = document.getElementById('baseCashFlowYear').value;
        if (m && y) return `${y}-${m}`;
        return '';
    }

    function setBaseCashFlowDate(val) {
        const monthSelect = document.getElementById('baseCashFlowMonth');
        const yearSelect = document.getElementById('baseCashFlowYear');
        if (val && val.includes('-')) {
            const parts = val.split('-');
            yearSelect.value = parts[0];
            monthSelect.value = parts[1];
        } else {
            yearSelect.value = '';
            monthSelect.value = '';
        }
    }

    // --- Dynamic Additional Cash Flows ---
    addCashFlowBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'form-group flex items-center gap-4 add-flow-row';
        row.innerHTML = `
            <div style="flex:1;">
                <input type="number" class="flow-year" placeholder="Year (e.g., 2030)" required>
            </div>
            <div style="flex:1;">
                <input type="number" class="flow-amount" placeholder="Amount ($)" required>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
        `;
        additionalCashFlowsContainer.appendChild(row);

        row.querySelector('.remove-btn').addEventListener('click', () => {
            row.remove();
        });
    });

    // -----------------------------------------------------------------------
    // --- Owned TIPS (new icon-based UX) ------------------------------------
    // -----------------------------------------------------------------------

    function updateEmptyRowVisibility() {
        const confirmedRows = document.querySelectorAll('.owned-tip-row');
        if (confirmedRows.length === 0 && emptyTipsRow) {
            emptyTipsRow.style.display = 'table-row';
        } else if (emptyTipsRow) {
            emptyTipsRow.style.display = 'none';
        }
    }

    /**
     * Creates a READ-ONLY display row for a confirmed TIPS entry, with
     * action icons: + (add new below), edit (pencil), delete (trash).
     *
     * @param {string} idType       - 'cusip' or 'coupon_maturity'
     * @param {string} idValue      - the stored identifier value
     * @param {string} accountType  - 'roth' | 'pretax' | 'taxable'
     * @param {number|string} qty   - quantity
     * @returns {HTMLTableRowElement}
     */
    function createDisplayRow(idType, idValue, accountType, qty) {
        const { cusip, maturityCoupon } = resolveDisplayValues(idType, idValue);

        const tr = document.createElement('tr');
        tr.className = 'owned-tip-row confirmed';
        // Store raw data on the row for easy retrieval
        tr.dataset.idType = idType;
        tr.dataset.idValue = idValue;
        tr.dataset.accountType = accountType;
        tr.dataset.qty = qty;

        tr.innerHTML = `
            <td class="tip-display-cusip">${cusip}</td>
            <td class="tip-display-maturity">${maturityCoupon}</td>
            <td class="tip-display-account">${accountTypeLabel(accountType)}</td>
            <td class="tip-display-qty">${qty}</td>
            <td style="white-space:nowrap;">
                <button type="button" class="icon-btn icon-btn-add" title="Add new TIPS below">&#43;</button>
                <button type="button" class="icon-btn icon-btn-edit" title="Edit this TIPS">&#9998;</button>
                <button type="button" class="icon-btn icon-btn-delete" title="Delete this TIPS">&#128465;</button>
            </td>
        `;

        // + button: insert a new entry form row below this display row
        tr.querySelector('.icon-btn-add').addEventListener('click', () => {
            // If there's already an open entry form right after, ignore
            const next = tr.nextElementSibling;
            if (next && next.classList.contains('tip-entry-row')) return;
            const entryRow = createEntryRow(null, tr);
            tr.insertAdjacentElement('afterend', entryRow);
        });

        // Edit button: replace this display row with an entry row pre-filled
        tr.querySelector('.icon-btn-edit').addEventListener('click', () => {
            const entryRow = createEntryRow(tr, null);
            tr.replaceWith(entryRow);
            updateEmptyRowVisibility();
        });

        // Delete button: remove row immediately
        tr.querySelector('.icon-btn-delete').addEventListener('click', () => {
            tr.remove();
            updateEmptyRowVisibility();
        });

        return tr;
    }

    /**
     * Creates an EDITABLE entry form row.
     *
     * @param {HTMLTableRowElement|null} editingRow  - the display row being edited (null = new)
     * @param {HTMLTableRowElement|null} insertAfter - the display row to insert after (for add-below)
     * @returns {HTMLTableRowElement}
     */
    function createEntryRow(editingRow, insertAfter) {
        const prefill = editingRow ? {
            idType: editingRow.dataset.idType,
            idValue: editingRow.dataset.idValue,
            accountType: editingRow.dataset.accountType,
            qty: editingRow.dataset.qty
        } : null;

        const tr = document.createElement('tr');
        tr.className = 'tip-entry-row';

        tr.innerHTML = `
            <td colspan="2">
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <select class="tip-id-type" style="flex:0 0 auto; width:auto; padding:0.35rem 0.5rem; font-size:0.85rem;">
                        <option value="cusip">CUSIP</option>
                        <option value="coupon_maturity">Coupon &amp; Maturity</option>
                    </select>
                    <select class="tip-id-value" style="flex:1; min-width:160px; padding:0.35rem 0.5rem; font-size:0.85rem;">
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

        const idTypeSelect = tr.querySelector('.tip-id-type');
        const idValueSelect = tr.querySelector('.tip-id-value');
        const accountTypeSelect = tr.querySelector('.tip-account-type');
        const qtyInput = tr.querySelector('.tip-quantity');

        // Populate dropdown based on initial type
        populateDropdown(idValueSelect, idTypeSelect.value, prefill ? idTypeSelect.value === prefill.idType ? prefill.idValue : null : null);

        // Pre-fill if editing
        if (prefill) {
            idTypeSelect.value = prefill.idType;
            populateDropdown(idValueSelect, prefill.idType, prefill.idValue);
            // Fallback if value isn't found
            if (idValueSelect.value !== prefill.idValue) {
                const opt = document.createElement('option');
                opt.value = prefill.idValue;
                opt.textContent = prefill.idValue + ' (Loaded)';
                idValueSelect.appendChild(opt);
                idValueSelect.value = prefill.idValue;
            }
            accountTypeSelect.value = prefill.accountType;
            qtyInput.value = prefill.qty;
        }

        idTypeSelect.addEventListener('change', () => {
            populateDropdown(idValueSelect, idTypeSelect.value);
        });

        // Confirm (green check)
        tr.querySelector('.icon-btn-confirm').addEventListener('click', () => {
            // Validate
            const fields = [idTypeSelect, idValueSelect, accountTypeSelect, qtyInput];
            const isValid = fields.every(f => f.checkValidity() && f.value !== '');
            if (!isValid) {
                fields.forEach(f => f.reportValidity && f.reportValidity());
                return;
            }

            const newDisplayRow = createDisplayRow(
                idTypeSelect.value,
                idValueSelect.value,
                accountTypeSelect.value,
                qtyInput.value
            );

            if (editingRow) {
                // We're editing — restore the original row position
                tr.replaceWith(newDisplayRow);
            } else {
                // New addition — replace the entry row with the display row
                if (insertAfter) {
                    // Inserted below a specific row
                    tr.replaceWith(newDisplayRow);
                } else {
                    // Appended from the bottom add button
                    tr.replaceWith(newDisplayRow);
                }
            }
            updateEmptyRowVisibility();
        });

        // Cancel (red X)
        tr.querySelector('.icon-btn-cancel').addEventListener('click', () => {
            if (editingRow) {
                // Restore the original display row
                tr.replaceWith(editingRow);
                // Re-attach event listeners (already attached on original)
            } else {
                tr.remove();
            }
            updateEmptyRowVisibility();
        });

        return tr;
    }

    // The persistent bottom "+" button (in addTipsActionRow)
    addOwnedTipBtn.addEventListener('click', () => {
        // Don't add another entry row if one is already open just before addTipsActionRow
        const prev = addTipsActionRow.previousElementSibling;
        if (prev && prev.classList.contains('tip-entry-row')) return;

        const entryRow = createEntryRow(null, null);
        // Insert the entry row just before the action row
        ownedTipsTbody.insertBefore(entryRow, addTipsActionRow);
        updateEmptyRowVisibility();
    });

    // --- Form Submission / Gathering Data ---
    ladderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const payload = {
            tax_rate: parseFloat(document.getElementById('taxRate').value),
            start_year: parseInt(document.getElementById('startYear').value, 10),
            end_year: parseInt(document.getElementById('endYear').value, 10),
            base_cash_flow: parseFloat(document.getElementById('baseCashFlow').value),
            base_cash_flow_date: getBaseCashFlowDate(),
            tax_effect_inflation: document.getElementById('taxEffectInflation') && document.getElementById('taxEffectInflation').value === 'yes',
            assumed_inflation_rate: (document.getElementById('taxEffectInflation') && document.getElementById('taxEffectInflation').value === 'yes') ? parseFloat(document.getElementById('assumedInflationRate').value || 0) : 0.0,
            additional_flows: [],
            owned_tips: []
        };

        document.querySelectorAll('.add-flow-row').forEach(row => {
            payload.additional_flows.push({
                year: parseInt(row.querySelector('.flow-year').value, 10),
                amount: parseFloat(row.querySelector('.flow-amount').value)
            });
        });

        // Collect from confirmed display rows (have dataset stored on them)
        document.querySelectorAll('.owned-tip-row.confirmed').forEach(row => {
            payload.owned_tips.push({
                id_type: row.dataset.idType,
                id_value: row.dataset.idValue,
                account_type: row.dataset.accountType,
                quantity: parseInt(row.dataset.qty, 10)
            });
        });

        ladderDataInput.value = JSON.stringify(payload);
        ladderForm.submit();
    });

    // --- File Session Tracking ---
    let currentFileHandle = null;

    // --- CSV Save functionality ---
    saveCsvBtn.addEventListener('click', async () => {
        let csvContent = "Type,Field1,Field2,Field3,Field4\n";

        csvContent += `PARAM,tax_rate,${document.getElementById('taxRate').value},,\n`;
        csvContent += `PARAM,tax_effect_inflation,${document.getElementById('taxEffectInflation') ? document.getElementById('taxEffectInflation').value === 'yes' : false},,\n`;
        csvContent += `PARAM,assumed_inflation_rate,${document.getElementById('assumedInflationRate') ? document.getElementById('assumedInflationRate').value : ''},,\n`;
        csvContent += `PARAM,start_year,${document.getElementById('startYear').value},,\n`;
        csvContent += `PARAM,end_year,${document.getElementById('endYear').value},,\n`;
        csvContent += `PARAM,base_cash_flow,${document.getElementById('baseCashFlow').value},,\n`;
        csvContent += `PARAM,base_cash_flow_date,${getBaseCashFlowDate()},,\n`;

        document.querySelectorAll('.add-flow-row').forEach(row => {
            const y = row.querySelector('.flow-year').value;
            const a = row.querySelector('.flow-amount').value;
            csvContent += `ADD_FLOW,${y},${a},,\n`;
        });

        document.querySelectorAll('.owned-tip-row.confirmed').forEach(row => {
            const t = row.dataset.idType;
            const v = row.dataset.idValue;
            const a = row.dataset.accountType;
            const q = row.dataset.qty;
            const safeV = v.includes(',') ? `"${v}"` : v;
            csvContent += `OWNED_TIP,${t},${safeV},${a},${q}\n`;
        });

        // Use modern File System Access API if supported
        if ('showSaveFilePicker' in window) {
            try {
                const suggestedName = currentFileHandle ? currentFileHandle.name : 'ladder_config.csv';
                currentFileHandle = await window.showSaveFilePicker({
                    suggestedName,
                    startIn: 'downloads',
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }],
                });

                const writable = await currentFileHandle.createWritable();
                await writable.write(csvContent);
                await writable.close();

            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('File save error:', err);
                }
            }
        } else {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ladder_config.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    // --- CSV Load functionality ---
    loadCsvBtn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n');

            // Clear current dynamic rows
            additionalCashFlowsContainer.innerHTML = '';
            document.querySelectorAll('.owned-tip-row, .tip-entry-row').forEach(r => r.remove());
            if (emptyTipsRow) emptyTipsRow.style.display = 'table-row';

            let isOldFormat = false;
            let startIndex = 0;
            if (lines.length > 0) {
                const checkLine = lines[0].toUpperCase();
                if (checkLine.startsWith('TYPE,')) {
                    isOldFormat = true;
                    startIndex = 1;
                } else if (checkLine.startsWith('PARAM,') || checkLine.startsWith('OWNED_TIP,') || checkLine.startsWith('ADD_FLOW,')) {
                    isOldFormat = true;
                    startIndex = 0;
                }
            }

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                let inQuotes = false;
                let currentVal = '';
                let vals = [];
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        vals.push(currentVal);
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                vals.push(currentVal);

                if (isOldFormat) {
                    const type = vals[0];
                    if (type === 'PARAM') {
                        const key = vals[1];
                        const val = vals[2];
                        if (key === 'tax_rate') document.getElementById('taxRate').value = val;
                        if (key === 'tax_effect_inflation' && document.getElementById('taxEffectInflation')) {
                            document.getElementById('taxEffectInflation').value = val === 'true' ? 'yes' : 'no';
                            document.getElementById('taxEffectInflation').dispatchEvent(new Event('change'));
                        }
                        if (key === 'assumed_inflation_rate' && document.getElementById('assumedInflationRate')) {
                            document.getElementById('assumedInflationRate').value = val;
                        }
                        if (key === 'start_year') {
                            let loadedYear = parseInt(val, 10);
                            const currentYear = new Date().getFullYear();
                            if (loadedYear < currentYear) {
                                loadedYear = currentYear;
                            }
                            document.getElementById('startYear').value = loadedYear;
                        }
                        if (key === 'end_year') document.getElementById('endYear').value = val;
                        if (key === 'base_cash_flow') document.getElementById('baseCashFlow').value = val;
                        if (key === 'base_cash_flow_date') setBaseCashFlowDate(val);
                    } else if (type === 'ADD_FLOW') {
                        addCashFlowBtn.click();
                        const created = additionalCashFlowsContainer.lastElementChild;
                        created.querySelector('.flow-year').value = vals[1];
                        created.querySelector('.flow-amount').value = vals[2];
                    } else if (type === 'OWNED_TIP') {
                        // vals: OWNED_TIP, id_type, id_value, account_type, quantity
                        let idType = vals[1];
                        let idValue = vals[2];
                        // Ensure idValue is in options; resolve CUSIP if needed
                        if (idType === 'cusip') {
                            const tip = tipsData.find(t => t.cusip === idValue);
                            if (!tip) {
                                // Keep as-is — will show with (Loaded) label
                            }
                        }

                        let skip = false;
                        const currentYear = new Date().getFullYear();
                        const resolved = resolveDisplayValues(idType, idValue);
                        if (resolved.maturityCoupon && resolved.maturityCoupon !== '—') {
                            const maturityDate = resolved.maturityCoupon.split(' / ')[0];
                            const maturityYear = parseInt(maturityDate.substring(0, 4), 10);
                            if (!isNaN(maturityYear) && maturityYear < currentYear) {
                                skip = true;
                            }
                        }

                        if (!skip) {
                            const displayRow = createDisplayRow(idType, idValue, vals[3], vals[4]);
                            ownedTipsTbody.insertBefore(displayRow, addTipsActionRow);
                            updateEmptyRowVisibility();
                        }
                    }
                } else {
                    // Simple format: CUSIP, Quantity
                    if (vals.length >= 2) {
                        const cusip = vals[0].trim();
                        const quantity = vals[1].trim();

                        let skip = false;
                        const currentYear = new Date().getFullYear();
                        const resolved = resolveDisplayValues('cusip', cusip);
                        if (resolved.maturityCoupon && resolved.maturityCoupon !== '—') {
                            const maturityDate = resolved.maturityCoupon.split(' / ')[0];
                            const maturityYear = parseInt(maturityDate.substring(0, 4), 10);
                            if (!isNaN(maturityYear) && maturityYear < currentYear) {
                                skip = true;
                            }
                        }

                        if (!skip) {
                            const displayRow = createDisplayRow('cusip', cusip, 'pretax', quantity);
                            ownedTipsTbody.insertBefore(displayRow, addTipsActionRow);
                            updateEmptyRowVisibility();
                        }
                    }
                }
            }
        };
        reader.readAsText(file);

        loadCsvBtn.value = '';
    });

    // --- Load Saved Session Data ---
    const savedDataElement = document.getElementById('saved-ladder-data');
    if (savedDataElement && savedDataElement.textContent && savedDataElement.textContent !== "{}") {
        try {
            const savedData = JSON.parse(savedDataElement.textContent);

            if ((savedData.start_year !== undefined) && (savedData.start_year !== 0)) {

                if (savedData.tax_rate !== undefined) document.getElementById('taxRate').value = savedData.tax_rate;
                if (savedData.tax_effect_inflation !== undefined && document.getElementById('taxEffectInflation')) {
                    document.getElementById('taxEffectInflation').value = savedData.tax_effect_inflation ? 'yes' : 'no';
                    document.getElementById('taxEffectInflation').dispatchEvent(new Event('change'));
                }
                if (savedData.assumed_inflation_rate !== undefined && document.getElementById('assumedInflationRate')) {
                    document.getElementById('assumedInflationRate').value = savedData.assumed_inflation_rate;
                }
                if (savedData.start_year !== undefined) {
                    let loadedYear = parseInt(savedData.start_year, 10);
                    const currentYear = new Date().getFullYear();
                    if (loadedYear < currentYear) {
                        loadedYear = currentYear;
                    }
                    document.getElementById('startYear').value = loadedYear;
                }
                if (savedData.end_year !== undefined) document.getElementById('endYear').value = savedData.end_year;
                if (savedData.base_cash_flow !== undefined) document.getElementById('baseCashFlow').value = savedData.base_cash_flow;
                if (savedData.base_cash_flow_date !== undefined) setBaseCashFlowDate(savedData.base_cash_flow_date);

                if (savedData.additional_flows && Array.isArray(savedData.additional_flows)) {
                    savedData.additional_flows.forEach(flow => {
                        addCashFlowBtn.click();
                        const created = additionalCashFlowsContainer.lastElementChild;
                        created.querySelector('.flow-year').value = flow.year;
                        created.querySelector('.flow-amount').value = flow.amount;
                    });
                }

                if (savedData.owned_tips && Array.isArray(savedData.owned_tips)) {
                    setTimeout(() => {
                        savedData.owned_tips.forEach(tip => {
                            const displayRow = createDisplayRow(tip.id_type, tip.id_value, tip.account_type, tip.quantity);
                            ownedTipsTbody.insertBefore(displayRow, addTipsActionRow);
                        });
                        updateEmptyRowVisibility();
                    }, 50);
                }
            }
        } catch (e) {
            console.error("Failed to parse saved ladder data", e);
        }
    }

    // Initial visibility check
    updateEmptyRowVisibility();
});
