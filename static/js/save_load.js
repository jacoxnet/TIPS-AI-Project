document.addEventListener('DOMContentLoaded', function () {
    // --- Constants
    const dataFileName = 'after_tax_TIPS_data.json';

    // --- Elements ---
    const saveDataBtn = document.getElementById('saveDataBtn');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const loadCsvBtn = document.getElementById('loadCsvBtn');
    const sampleCsvBtn = document.getElementById('sampleCsvBtn');
    const clrDataBtn = document.getElementById('clrDataBtn');

    // test place to display retrieved file contents
    // const fileContent = document.getElementById('fileContent');
    const errorContent = document.getElementById('errorContent');

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
                errorContent.textContent = "File saved";

            } catch (err) {
                if (err.name !== 'AbortError') {
                    errorContent.textContent = "File save error";
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
            errorContent.textContent = "File saved";
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
            // fileContent.textContent = r;
            const formData = new FormData();
            formData.append('data', r)
            formData.append('csrfmiddlewaretoken', csrfToken);
            try {
                const response = await fetch(importDataURL, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                errorContent.textContent = data.data
            } catch (e) {
                console.error(e);
                errorContent.textContent = data.data
            }
        };
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
        reader.onload = async () => {
            const r = reader.result
            console.log('file content is', r, 'type of r is', typeof r)
            // fileContent.textContent = r;
            const formData = new FormData();
            formData.append('data', r)
            formData.append('csrfmiddlewaretoken', csrfToken);
            try {
                const response = await fetch(importCsvURL, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                errorContent.textContent = data.data
            } catch (e) {
                console.error(e);
                errorContent.textContent = data.data
            }
        };
        reader.onerror = () => { console.log('error reading file') };
        reader.readAsText(file);
        loadCsvBtn.value = '';
    });


    // --- Load Sample Ladder -- done by backend ---
    sampleCsvBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(sampleCsvURL, {
                method: 'GET'
            });
            const data = await response.json();
            errorContent.textContent = data.data
        } catch (e) {
            console.error(e);
            errorContent.textContent = data.data
        }
        sampleCsvBtn.value = '';
    });


    // --- Clear Ladder Data -- done by backend ---
    clrDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(clrDataURL, {
                method: 'GET'
            });
            const data = await response.json();
            errorContent.textContent = data.data
        } catch (e) {
            console.error(e);
            errorContent.textContent = data.data
        }
        sampleCsvBtn.value = '';
    });

});
