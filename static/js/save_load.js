document.addEventListener('DOMContentLoaded', function () {
    // --- Constants
    const dataFileName = 'after_tax_TIPS_data.json';

    // --- Elements ---
    const saveDataBtn = document.getElementById('saveDataBtn');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const loadCsvBtn = document.getElementById('loadCsvBtn');

    // test place to display retrieved file contents
    const fileContent = document.getElementById('fileContent');

    // --- saved data from elements
    const savedSpecs = document.getElementById('saved-specs-data');
    const savedOTips = document.getElementById('saved-otips-data');


    // --- File Session Tracking ---
    let currentFileHandle = null;

    // --- Save App Data to JSON file ---
    saveDataBtn.addEventListener('click', async () => {
        specsData = JSON.parse(savedSpecs.textContent);
        otipsData = JSON.parse(savedOTips.textContent);
        allData = { specsData: specsData, otipsData: otipsData };
        writeText = JSON.stringify(allData)

        // Use modern File System Access API if supported
        if ('showSaveFilePicker' in window) {
            try {
                const suggestedName = currentFileHandle ? currentFileHandle.name : dataFileName;
                currentFileHandle = await window.showSaveFilePicker({
                    suggestedName,
                    startIn: 'downloads',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'text/json': ['.json'] }
                    }],
                });

                const writable = await currentFileHandle.createWritable();
                await writable.write(writeText);
                await writable.close();

            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('File save error:', err);
                }
            }
        } else {
            const blob = new Blob([writeText], { type: 'text/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = dataFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    // --- Load App Data from JSON file and send to backend ---
    loadDataBtn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("application/json")) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const r = reader.result
            fileContent.textContent = r;
            const formData = new FormData();
            formData.append('data', r)
            formData.append('csrfmiddlewaretoken', csrfToken);
            try {
                const response = await fetch(importDataURL, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                console.log('success in retrieving data from import data view', data)
            } catch (e) {
                console.error(e);
            }
        }
        reader.onerror = () => { console.log('error reading file') };
        reader.readAsText(file);
        loadDataBtn.value = '';
    });

    // --- Load External CSV file and send to backend ---
    loadCsvBtn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("text/csv")) return;
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result
            const parsedCsv = getParsedCsv(r)
            fileContent.textContent = JSON.stringify(parsedCsv);
        }
        reader.onerror = () => { console.log('error reading file') };
        reader.readAsText(file);
        loadCsvBtn.value = '';
    })

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
            } else if (char != ' ') {
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
    function getParsedCsv(text) {
        const lines = text.split('\n');
        const rlines = [];
        for (const line of lines) {
            if (!line) continue;
            rlines.push(parseCsvLine(line));
        }
        return rlines;
    }




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
});
