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

    function populateDropdown(selectElement, idType, preselectedValue) {
        selectElement.innerHTML = '<option value="" disabled selected>Select a TIP...</option>';
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

    const ladderForm = document.getElementById('ladderForm');
    const ladderDataInput = document.getElementById('ladderDataInput');

    const saveCsvBtn = document.getElementById('saveCsvBtn');
    const loadCsvBtn = document.getElementById('loadCsvBtn');
    const clearLadderBtn = document.getElementById('clearLadderBtn');

    // --- Dynamic Additional Cash Flows ---
    addCashFlowBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'form-group flex items-center gap-4 add-flow-row';
        row.innerHTML = `
            <div style="flex:1;">
                <input type="number" class="flow-year" placeholder="Year (e.g., 2030)" required>
            </div>
            <div style="flex:1;">
                <input type="number" class="flow-amount" placeholder="Amount ($)" step="100" required>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
        `;
        additionalCashFlowsContainer.appendChild(row);

        row.querySelector('.remove-btn').addEventListener('click', () => {
            row.remove();
        });
    });

    // --- Dynamic Owned TIPS ---
    addOwnedTipBtn.addEventListener('click', () => {
        if (emptyTipsRow) emptyTipsRow.style.display = 'none';

        const tr = document.createElement('tr');
        tr.className = 'owned-tip-row';
        tr.innerHTML = `
            <td>
                <select class="tip-id-type" required>
                    <option value="cusip">CUSIP</option>
                    <option value="coupon_maturity">Coupon & Maturity Date</option>
                </select>
            </td>
            <td>
                <select class="tip-id-value" required>
                    <option value="" disabled selected>Select a TIP...</option>
                </select>
            </td>
            <td>
                <select class="tip-account-type" required>
                    <option value="roth">Roth</option>
                    <option value="pretax">Pretax (e.g., 401k/IRA)</option>
                    <option value="taxable">Taxable Brokerage</option>
                </select>
            </td>
            <td>
                <input type="number" class="tip-quantity" placeholder="No. of $1k bonds" min="1" required>
            </td>
            <td style="display: flex; gap: 0.5rem; justify-content: flex-start;">
                <button type="button" class="btn btn-success btn-sm confirm-btn">Confirm</button>
                <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
            </td>
        `;
        ownedTipsTbody.appendChild(tr);

        const idTypeSelect = tr.querySelector('.tip-id-type');
        const idValueSelect = tr.querySelector('.tip-id-value');

        // Initial populate
        populateDropdown(idValueSelect, idTypeSelect.value);

        // Update on change
        idTypeSelect.addEventListener('change', () => {
            populateDropdown(idValueSelect, idTypeSelect.value);
        });

        const inputsToLock = [idTypeSelect, idValueSelect, tr.querySelector('.tip-account-type'), tr.querySelector('.tip-quantity')];
        const confirmBtn = tr.querySelector('.confirm-btn');

        confirmBtn.addEventListener('click', () => {
            // Basic HTML5 Validity Check on inputs before locking
            const isValid = inputsToLock.every(input => input.checkValidity());
            if (!isValid) {
                // Trigger natural validation warnings
                inputsToLock.forEach(input => input.reportValidity());
                return;
            }

            if (tr.classList.contains('confirmed')) {
                // Edit Mode: Unlock
                tr.classList.remove('confirmed');
                confirmBtn.textContent = 'Confirm';
                confirmBtn.classList.replace('btn-secondary', 'btn-success');
                inputsToLock.forEach(input => input.disabled = false);
            } else {
                // Lock Mode
                tr.classList.add('confirmed');
                confirmBtn.textContent = 'Edit';
                confirmBtn.classList.replace('btn-success', 'btn-secondary');
                inputsToLock.forEach(input => input.disabled = true);
            }
        });

        tr.querySelector('.remove-btn').addEventListener('click', () => {
            tr.remove();
            if (document.querySelectorAll('.owned-tip-row').length === 0 && emptyTipsRow) {
                emptyTipsRow.style.display = 'table-row';
            }
        });
    });

    // Handle CSV loaded rows confirmation simulation
    function triggerConfirm(tr) {
        tr.querySelector('.confirm-btn').click();
    }

    // --- Form Submission / Gathering Data ---
    ladderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const payload = {
            tax_rate: parseFloat(document.getElementById('taxRate').value),
            start_year: parseInt(document.getElementById('startYear').value, 10),
            end_year: parseInt(document.getElementById('endYear').value, 10),
            base_cash_flow: parseFloat(document.getElementById('baseCashFlow').value),
            additional_flows: [],
            owned_tips: []
        };

        document.querySelectorAll('.add-flow-row').forEach(row => {
            payload.additional_flows.push({
                year: parseInt(row.querySelector('.flow-year').value, 10),
                amount: parseFloat(row.querySelector('.flow-amount').value)
            });
        });

        document.querySelectorAll('.owned-tip-row').forEach(row => {
            // Only add tips that are confirmed
            if (row.classList.contains('confirmed')) {
                payload.owned_tips.push({
                    id_type: row.querySelector('.tip-id-type').value,
                    id_value: row.querySelector('.tip-id-value').value,
                    account_type: row.querySelector('.tip-account-type').value,
                    quantity: parseInt(row.querySelector('.tip-quantity').value, 10)
                });
            }
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
        csvContent += `PARAM,start_year,${document.getElementById('startYear').value},,\n`;
        csvContent += `PARAM,end_year,${document.getElementById('endYear').value},,\n`;
        csvContent += `PARAM,base_cash_flow,${document.getElementById('baseCashFlow').value},,\n`;

        document.querySelectorAll('.add-flow-row').forEach(row => {
            const y = row.querySelector('.flow-year').value;
            const a = row.querySelector('.flow-amount').value;
            csvContent += `ADD_FLOW,${y},${a},,\n`;
        });

        document.querySelectorAll('.owned-tip-row').forEach(row => {
            if (row.classList.contains('confirmed')) {
                const t = row.querySelector('.tip-id-type').value;
                const v = row.querySelector('.tip-id-value').value;
                const a = row.querySelector('.tip-account-type').value;
                const q = row.querySelector('.tip-quantity').value;
                // Escape values just in case
                const safeV = v.includes(',') ? `"${v}"` : v;
                csvContent += `OWNED_TIP,${t},${safeV},${a},${q}\n`;
            }
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
                // User may have cancelled the dialog (AbortError)
                if (err.name !== 'AbortError') {
                    console.error('File save error:', err);
                }
            }
        } else {
            // Fallback for older browsers
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

    // --- Clear Ladder Data functionality ---
    if (clearLadderBtn) {
        clearLadderBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear all ladder data?")) {
                document.getElementById('taxRate').value = '';
                document.getElementById('startYear').value = '';
                document.getElementById('endYear').value = '';
                document.getElementById('baseCashFlow').value = '';

                additionalCashFlowsContainer.innerHTML = '';
                document.querySelectorAll('.owned-tip-row').forEach(r => r.remove());
                if (emptyTipsRow) emptyTipsRow.style.display = 'table-row';

                // Submit empty payload to clear session data on backend
                const emptyPayload = {
                    tax_rate: 0,
                    start_year: 0,
                    end_year: 0,
                    base_cash_flow: 0,
                    additional_flows: [],
                    owned_tips: []
                };
                ladderDataInput.value = JSON.stringify(emptyPayload);
                // Dispatch a submit event so the event listener handles the form submission properly
                // ladderForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                ladderForm.submit()
            }
        });
    }

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
            document.querySelectorAll('.owned-tip-row').forEach(r => r.remove());
            if (emptyTipsRow) emptyTipsRow.style.display = 'table-row';

            // Simple CSV parser ignoring headers
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Handle quoted values basic parsing
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

                const type = vals[0];
                if (type === 'PARAM') {
                    const key = vals[1];
                    const val = vals[2];
                    if (key === 'tax_rate') document.getElementById('taxRate').value = val;
                    if (key === 'start_year') document.getElementById('startYear').value = val;
                    if (key === 'end_year') document.getElementById('endYear').value = val;
                    if (key === 'base_cash_flow') document.getElementById('baseCashFlow').value = val;
                } else if (type === 'ADD_FLOW') {
                    addCashFlowBtn.click();
                    const created = additionalCashFlowsContainer.lastElementChild;
                    created.querySelector('.flow-year').value = vals[1];
                    created.querySelector('.flow-amount').value = vals[2];
                } else if (type === 'OWNED_TIP') {
                    addOwnedTipBtn.click();
                    const created = ownedTipsTbody.lastElementChild;
                    const typeSelect = created.querySelector('.tip-id-type');
                    const valueSelect = created.querySelector('.tip-id-value');

                    typeSelect.value = vals[1];
                    populateDropdown(valueSelect, vals[1], vals[2]);

                    // Fallback in case value isn't found in options
                    if (valueSelect.value !== vals[2]) {
                        const opt = document.createElement('option');
                        opt.value = vals[2];
                        opt.textContent = vals[2] + ' (Loaded)';
                        valueSelect.appendChild(opt);
                        valueSelect.value = vals[2];
                    }

                    created.querySelector('.tip-account-type').value = vals[3];
                    created.querySelector('.tip-quantity').value = vals[4];
                    triggerConfirm(created);
                }
            }
        };
        reader.readAsText(file);

        // Reset file input so same file can be loaded again if needed
        loadCsvBtn.value = '';
    });

    // --- Load Saved Session Data ---
    const savedDataElement = document.getElementById('saved-ladder-data');
    if (savedDataElement && savedDataElement.textContent && savedDataElement.textContent !== "{}") {
        try {
            const savedData = JSON.parse(savedDataElement.textContent);

            if (savedData.tax_rate !== undefined) document.getElementById('taxRate').value = savedData.tax_rate;
            if (savedData.start_year !== undefined) document.getElementById('startYear').value = savedData.start_year;
            if (savedData.end_year !== undefined) document.getElementById('endYear').value = savedData.end_year;
            if (savedData.base_cash_flow !== undefined) document.getElementById('baseCashFlow').value = savedData.base_cash_flow;

            if (savedData.additional_flows && Array.isArray(savedData.additional_flows)) {
                savedData.additional_flows.forEach(flow => {
                    addCashFlowBtn.click();
                    const created = additionalCashFlowsContainer.lastElementChild;
                    created.querySelector('.flow-year').value = flow.year;
                    created.querySelector('.flow-amount').value = flow.amount;
                });
            }

            if (savedData.owned_tips && Array.isArray(savedData.owned_tips)) {
                // Ensure tips are loaded to populate selection boxes first
                setTimeout(() => {
                    savedData.owned_tips.forEach(tip => {
                        addOwnedTipBtn.click();
                        const created = ownedTipsTbody.lastElementChild;
                        const typeSelect = created.querySelector('.tip-id-type');
                        const valueSelect = created.querySelector('.tip-id-value');

                        typeSelect.value = tip.id_type;
                        populateDropdown(valueSelect, tip.id_type, tip.id_value);

                        // Fallback in case value isn't found in options
                        if (valueSelect.value !== tip.id_value) {
                            const opt = document.createElement('option');
                            opt.value = tip.id_value;
                            opt.textContent = tip.id_value + ' (Loaded)';
                            valueSelect.appendChild(opt);
                            valueSelect.value = tip.id_value;
                        }

                        created.querySelector('.tip-account-type').value = tip.account_type;
                        created.querySelector('.tip-quantity').value = tip.quantity;
                        triggerConfirm(created);
                    });
                }, 50); // slight delay to guarantee tipsData has been parsed natively
            }
        } catch (e) {
            console.error("Failed to parse saved ladder data", e);
        }
    }
});
