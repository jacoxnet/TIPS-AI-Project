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

    // --- Dynamic Additional Cash Flows ---
    addCashFlowBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'form-group flex items-center gap-4 add-flow-row';
        row.innerHTML = `
            <div style="flex:1;">
                <input type="number" class="flow-year" placeholder="Year (e.g., 2030)" required>
            </div>
            <div style="flex:1;">
                <input type="number" class="flow-amount" placeholder="Additional Amount ($)" step="100" required>
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
            <td>
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

        tr.querySelector('.remove-btn').addEventListener('click', () => {
            tr.remove();
            if (document.querySelectorAll('.owned-tip-row').length === 0 && emptyTipsRow) {
                emptyTipsRow.style.display = 'table-row';
            }
        });
    });

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
            payload.owned_tips.push({
                id_type: row.querySelector('.tip-id-type').value,
                id_value: row.querySelector('.tip-id-value').value,
                account_type: row.querySelector('.tip-account-type').value,
                quantity: parseInt(row.querySelector('.tip-quantity').value, 10)
            });
        });

        ladderDataInput.value = JSON.stringify(payload);
        ladderForm.submit();
    });

    // --- CSV Save functionality ---
    saveCsvBtn.addEventListener('click', () => {
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
            const t = row.querySelector('.tip-id-type').value;
            const v = row.querySelector('.tip-id-value').value;
            const a = row.querySelector('.tip-account-type').value;
            const q = row.querySelector('.tip-quantity').value;
            // Escape values just in case
            const safeV = v.includes(',') ? `"${v}"` : v;
            csvContent += `OWNED_TIP,${t},${safeV},${a},${q}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ladder_config.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                }
            }
        };
        reader.readAsText(file);

        // Reset file input so same file can be loaded again if needed
        loadCsvBtn.value = '';
    });
});
