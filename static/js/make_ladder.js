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
            const datedDate = tip ? tip.dated_date : null;
            return { cusip, maturityCoupon, datedDate };
        } else {
            // idValue is "rate%,maturity_date"
            const parts = idValue.split(',');
            const rate = parts[0];
            const maturity = parts[1] || '';
            // Normalize the rate to a float for comparison so "0.125000%" == "0.125%"
            const rateNum = parseFloat(rate);
            const tip = tipsData.find(t => {
                const tRateNum = parseFloat(t.interest_rate);
                return !isNaN(tRateNum) && !isNaN(rateNum) &&
                    Math.abs(tRateNum - rateNum) < 1e-6 &&
                    t.maturity_date === maturity;
            });
            const cusip = tip ? tip.cusip : '—';
            const maturityCoupon = `${maturity} / ${rate}`;
            const datedDate = tip ? tip.dated_date : null;
            return { cusip, maturityCoupon, datedDate };
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

    // --- Use Pre-Tax Cash Flow checkbox ---
    const usePretaxCheckbox = document.getElementById('usePretax');

    function updatePretaxState() {
        // no-op: pretax checkbox no longer affects the inflation section
    }

    if (usePretaxCheckbox) {
        usePretaxCheckbox.addEventListener('change', updatePretaxState);
    }

    // --- Inflate Base Cash Flow Yes/No ---
    const inflateBaseCfEl = document.getElementById('inflateBaseCf');
    const asOfDateSubGroup = document.getElementById('asOfDateSubGroup');
    const baseCashFlowMonthEl = document.getElementById('baseCashFlowMonth');
    const baseCashFlowYearEl = document.getElementById('baseCashFlowYear');

    function updateInflateState() {
        if (!inflateBaseCfEl || !asOfDateSubGroup) return;
        const isYes = inflateBaseCfEl.value === 'yes';
        asOfDateSubGroup.style.display = isYes ? 'block' : 'none';
        if (baseCashFlowMonthEl) baseCashFlowMonthEl.required = isYes;
        if (baseCashFlowYearEl) baseCashFlowYearEl.required = isYes;
    }

    if (inflateBaseCfEl) {
        inflateBaseCfEl.addEventListener('change', updateInflateState);
        updateInflateState();
    }

    const startYearInput = document.getElementById('startYear');
    if (startYearInput) {
        startYearInput.min = new Date().getFullYear();
    }

    // --- Populate As-Of Date Year Dropdown ---
    const baseCashFlowYear = document.getElementById('baseCashFlowYear');
    if (baseCashFlowYear) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1997; y--) {
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
            const fields = [idTypeSelect, idValueSelect, accountTypeSelect, qtyInput];
            const isValid = fields.every(f => f.checkValidity() && f.value !== '');
            if (!isValid) {
                fields.forEach(f => f.reportValidity && f.reportValidity());
                return;
            }
            tr.replaceWith(createDisplayRow(
                idTypeSelect.value,
                idValueSelect.value,
                accountTypeSelect.value,
                qtyInput.value
            ));
            updateEmptyRowVisibility();
        });

        // Cancel (red X)
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

        // Automatically cancel any unconfirmed edits/additions before submission
        document.querySelectorAll('.tip-entry-row .icon-btn-cancel').forEach(btn => btn.click());

        const payload = {
            tax_rate: parseFloat(document.getElementById('taxRate').value),
            start_year: parseInt(document.getElementById('startYear').value, 10),
            end_year: parseInt(document.getElementById('endYear').value, 10),
            base_cash_flow: parseFloat(document.getElementById('baseCashFlow').value),
            inflate_base_cf: inflateBaseCfEl ? inflateBaseCfEl.value === 'yes' : false,
            base_cash_flow_date: getBaseCashFlowDate(),
            tax_effect_inflation: document.getElementById('taxEffectInflation') && document.getElementById('taxEffectInflation').value === 'yes',
            assumed_inflation_rate: (document.getElementById('taxEffectInflation') && document.getElementById('taxEffectInflation').value === 'yes') ? parseFloat(document.getElementById('assumedInflationRate').value || 0) : 0.0,
            use_pretax: usePretaxCheckbox ? usePretaxCheckbox.checked : false,
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

    // --- CSV Save ---
    saveCsvBtn.addEventListener('click', async () => {
        let csvContent = "Type,Field1,Field2,Field3,Field4\n";

        csvContent += `PARAM,tax_rate,${document.getElementById('taxRate').value},,\n`;
        csvContent += `PARAM,tax_effect_inflation,${document.getElementById('taxEffectInflation') ? document.getElementById('taxEffectInflation').value === 'yes' : false},,\n`;
        csvContent += `PARAM,assumed_inflation_rate,${document.getElementById('assumedInflationRate') ? document.getElementById('assumedInflationRate').value : ''},,\n`;
        csvContent += `PARAM,start_year,${document.getElementById('startYear').value},,\n`;
        csvContent += `PARAM,end_year,${document.getElementById('endYear').value},,\n`;
        csvContent += `PARAM,base_cash_flow,${document.getElementById('baseCashFlow').value},,\n`;
        csvContent += `PARAM,inflate_base_cf,${inflateBaseCfEl ? inflateBaseCfEl.value === 'yes' : false},,\n`;
        csvContent += `PARAM,base_cash_flow_date,${getBaseCashFlowDate()},,\n`;
        csvContent += `PARAM,use_pretax,${usePretaxCheckbox ? usePretaxCheckbox.checked : false},,\n`;

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

    // -----------------------------------------------------------------------
    // --- CSV Parse / Apply helpers -----------------------------------------
    // -----------------------------------------------------------------------

    // Split one CSV line into fields, respecting double-quoted values.
    function parseCsvLine(line) {
        let inQuotes = false;
        let currentVal = '';
        const vals = [];
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
        return vals;
    }

    // Parse CSV text into a structured object without touching the DOM.
    // Handles both the full PARAM/ADD_FLOW/OWNED_TIP format and the legacy
    // simple CUSIP,Quantity format.
    // Returns { params, additionalFlows, ownedTips } where each ownedTips
    // entry includes resolved maturityYear and datedYear for optional
    // start/end year auto-fill.
    function parseCsvText(text) {
        const lines = text.split('\n');
        const result = { params: {}, additionalFlows: [], ownedTips: [] };

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

        const currentYear = new Date().getFullYear();

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const vals = parseCsvLine(line);

            if (isOldFormat) {
                const type = vals[0];
                if (type === 'PARAM') {
                    result.params[vals[1]] = vals[2];
                } else if (type === 'ADD_FLOW') {
                    result.additionalFlows.push({ year: vals[1], amount: vals[2] });
                } else if (type === 'OWNED_TIP') {
                    const idType = vals[1];
                    const idValue = vals[2];
                    const resolved = resolveDisplayValues(idType, idValue);
                    let maturityYear = NaN;
                    let skip = false;
                    if (resolved.maturityCoupon && resolved.maturityCoupon !== '—') {
                        const maturityDate = resolved.maturityCoupon.split(' / ')[0];
                        maturityYear = parseInt(maturityDate.substring(0, 4), 10);
                        if (!isNaN(maturityYear) && maturityYear < currentYear) skip = true;
                    }
                    if (!skip) {
                        const datedYear = resolved.datedDate ? parseInt(resolved.datedDate.substring(0, 4), 10) : NaN;
                        result.ownedTips.push({ idType, idValue, accountType: vals[3], qty: vals[4], maturityYear, datedYear });
                    }
                }
            } else {
                // Simple format: CUSIP, Quantity (with optional header row)
                if (vals.length >= 2 && !isNaN(parseInt(vals[1].trim(), 10))) {
                    const cusip = vals[0].trim();
                    const quantity = vals[1].trim();
                    const resolved = resolveDisplayValues('cusip', cusip);
                    let maturityYear = NaN;
                    let skip = false;
                    if (resolved.maturityCoupon && resolved.maturityCoupon !== '—') {
                        const maturityDate = resolved.maturityCoupon.split(' / ')[0];
                        maturityYear = parseInt(maturityDate.substring(0, 4), 10);
                        if (!isNaN(maturityYear) && maturityYear < currentYear) skip = true;
                    }
                    if (!skip) {
                        const datedYear = resolved.datedDate ? parseInt(resolved.datedDate.substring(0, 4), 10) : NaN;
                        result.ownedTips.push({ idType: 'cusip', idValue: cusip, accountType: 'pretax', qty: quantity, maturityYear, datedYear });
                    }
                }
            }
        }

        return result;
    }

    // Apply a parsed CSV object to the form.
    // Pass { autoFillYears: true } to infer start/end year from TIPS
    // maturity/dated dates when those params were absent in the file.
    function applyCsvData(parsed, { autoFillYears = false } = {}) {
        additionalCashFlowsContainer.innerHTML = '';
        document.querySelectorAll('.owned-tip-row, .tip-entry-row').forEach(r => r.remove());
        if (emptyTipsRow) emptyTipsRow.style.display = 'table-row';

        const { params, additionalFlows, ownedTips } = parsed;
        let foundStartYear = false;
        let foundEndYear = false;

        if (params.tax_rate !== undefined) document.getElementById('taxRate').value = params.tax_rate;
        if (params.tax_effect_inflation !== undefined && document.getElementById('taxEffectInflation')) {
            document.getElementById('taxEffectInflation').value = params.tax_effect_inflation === 'true' ? 'yes' : 'no';
            document.getElementById('taxEffectInflation').dispatchEvent(new Event('change'));
        }
        if (params.assumed_inflation_rate !== undefined && document.getElementById('assumedInflationRate')) {
            document.getElementById('assumedInflationRate').value = params.assumed_inflation_rate;
        }
        if (params.start_year !== undefined) {
            foundStartYear = true;
            let loadedYear = parseInt(params.start_year, 10);
            const currentYear = new Date().getFullYear();
            if (loadedYear < currentYear) loadedYear = currentYear;
            document.getElementById('startYear').value = loadedYear;
        }
        if (params.end_year !== undefined) {
            foundEndYear = true;
            document.getElementById('endYear').value = params.end_year;
        }
        if (params.base_cash_flow !== undefined) document.getElementById('baseCashFlow').value = params.base_cash_flow;
        if (params.inflate_base_cf !== undefined && inflateBaseCfEl) {
            inflateBaseCfEl.value = params.inflate_base_cf === 'true' ? 'yes' : 'no';
            updateInflateState();
        }
        if (params.base_cash_flow_date !== undefined) setBaseCashFlowDate(params.base_cash_flow_date);
        if (params.use_pretax !== undefined && usePretaxCheckbox) {
            usePretaxCheckbox.checked = params.use_pretax === 'true';
            updatePretaxState();
        }

        additionalFlows.forEach(({ year, amount }) => {
            addCashFlowBtn.click();
            const created = additionalCashFlowsContainer.lastElementChild;
            created.querySelector('.flow-year').value = year;
            created.querySelector('.flow-amount').value = amount;
        });

        const loadedMaturityYears = [];
        const loadedDatedYears = [];
        ownedTips.forEach(({ idType, idValue, accountType, qty, maturityYear, datedYear }) => {
            ownedTipsTbody.insertBefore(createDisplayRow(idType, idValue, accountType, qty), addTipsActionRow);
            updateEmptyRowVisibility();
            if (!isNaN(maturityYear)) loadedMaturityYears.push(maturityYear);
            if (!isNaN(datedYear)) loadedDatedYears.push(datedYear);
        });

        if (autoFillYears) {
            const currentYear = new Date().getFullYear();
            if (!foundStartYear && loadedDatedYears.length > 0) {
                document.getElementById('startYear').value = Math.max(Math.min(...loadedDatedYears), currentYear);
            }
            if (!foundEndYear && loadedMaturityYears.length > 0) {
                document.getElementById('endYear').value = Math.max(...loadedMaturityYears);
            }
        }
    }

    // --- CSV Load ---
    loadCsvBtn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            applyCsvData(parseCsvText(event.target.result), { autoFillYears: true });
        };
        reader.readAsText(file);
        loadCsvBtn.value = '';
    });

    // --- Sample CSV Load ---
    const sampleCsvBtn = document.getElementById('sampleCsvBtn');
    if (sampleCsvBtn) {
        sampleCsvBtn.addEventListener('click', () => {
            fetch('/sample-csv/')
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error loading sample: ' + data.error);
                        return;
                    }
                    applyCsvData(parseCsvText(data.csv_content));
                })
                .catch(err => {
                    console.error('Error loading sample CSV:', err);
                    alert('Failed to load sample ladder data.');
                });
        });
    }

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
                if (savedData.inflate_base_cf !== undefined && inflateBaseCfEl) {
                    inflateBaseCfEl.value = savedData.inflate_base_cf ? 'yes' : 'no';
                    updateInflateState();
                }
                if (savedData.base_cash_flow_date !== undefined) setBaseCashFlowDate(savedData.base_cash_flow_date);
                if (savedData.use_pretax !== undefined && usePretaxCheckbox) {
                    usePretaxCheckbox.checked = savedData.use_pretax;
                    updatePretaxState();
                }

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
