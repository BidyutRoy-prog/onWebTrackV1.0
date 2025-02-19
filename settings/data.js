// Open IndexedDB
let db;
const request = indexedDB.open("UserDataDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const objectStore = db.createObjectStore("userData", { keyPath: "date" });
    objectStore.createIndex("domain", "domain", { unique: false });
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onerror = function(event) {
    console.error("IndexedDB error: ", event.target.errorCode);
};

// Export Data
function exportData() {
    const transaction = db.transaction(["userData"], "readonly");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const data = event.target.result.reduce((acc, item) => {
            acc[item.date] = item.data;
            return acc;
        }, {});
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'onWebTrack-data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}

// Import Data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                const data = JSON.parse(e.target.result);
                const transaction = db.transaction(["userData"], "readwrite");
                const objectStore = transaction.objectStore("userData");
                for (const date in data) {
                    objectStore.put({ date, data: data[date] });
                }
                transaction.oncomplete = function() {
                    console.log('Data imported');
                };
                transaction.onerror = function(event) {
                    console.error("IndexedDB error: ", event.target.errorCode);
                };
            };
            reader.readAsText(file);
        }
    });
    input.click();
}

// Clear Data
function clearData() {
    const transaction = db.transaction(["userData"], "readwrite");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.clear();

    request.onsuccess = function() {
        console.log('Data cleared');
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}

export { exportData, importData, clearData };
