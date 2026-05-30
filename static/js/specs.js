document.addEventListener('DOMContentLoaded', function () {

    // --- Elements ---
    const addCashFlowBtn = document.getElementById('addCashFlowBtn');
    const additionalCashFlowsContainer = document.getElementById('additionalCashFlowsContainer');

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

    //--- Form Submission / Gathering Data ---
    specForm.addEventListener('submit', (e) => {
        e.preventDefault();

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
        };

        document.querySelectorAll('.add-flow-row').forEach(row => {
            payload.additional_flows.push({
                year: parseInt(row.querySelector('.flow-year').value, 10),
                amount: parseFloat(row.querySelector('.flow-amount').value)
            });
        });

        specDataInput.value = JSON.stringify(payload);
        specForm.submit();
    });

    // --- Load Saved Session Data ---
    const savedDataElement = document.getElementById('saved-specs-data');
    console.log("DEBUG: Attempting to load saved specs data", savedDataElement);
    if (savedDataElement && savedDataElement.textContent && savedDataElement.textContent !== "{}") {
        try {
            const savedData = JSON.parse(savedDataElement.textContent);

            if ((savedData.start_year !== undefined) && (savedData.start_year !== 0)) {

                if (savedData.tax_rate !== undefined) document.getElementById('taxRate').value = savedData.tax_rate;
                console.log("DEBUG: Loaded tax_rate", savedData.tax_rate);
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

                
            }
        } catch (e) {
            console.error("Failed to parse saved spec data", e);
        }
    }

    // Initial visibility check
    updateEmptyRowVisibility();
});
