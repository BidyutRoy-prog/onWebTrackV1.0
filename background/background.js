// Listener for when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
    // Create an alarm to wake up the service worker every 5 minutes
    chrome.alarms.create('keepAlive', { periodInMinutes: 5 });
});

// Listener for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        console.log("Waking up service worker");
        // Perform a no-op to keep the service worker alive
        chrome.runtime.getPlatformInfo(() => {});
    }
});

// Function to check if a given URL is valid
function isValidURL(givenURL) {
    if (givenURL) {
        if (givenURL.includes(".") || givenURL.startsWith("file://")) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// Function to convert seconds into a human-readable string
function secondsToString(seconds, compressed = false) {
    let hours = parseInt(seconds / 3600);
    seconds = seconds % 3600;
    let minutes = parseInt(seconds / 60);
    seconds = seconds % 60;
    let timeString = "";
    if (hours) {
        timeString += hours + " hrs ";
    }
    if (minutes) {
        timeString += minutes + " min ";
    }
    if (seconds) {
        timeString += seconds + " sec ";
    }
    if (!compressed) {
        return timeString;
    } else {
        if (hours) {
            return `${hours}h`;
        }
        if (minutes) {
            return `${minutes}m`;
        }
        if (seconds) {
            return `${seconds}s`;
        }
    }
}

// Function to format a date object into a string "YYYY-MM-DD"
function getDateString(nDate) {
    let nDateDate = nDate.getDate();
    let nDateMonth = nDate.getMonth() + 1;
    let nDateYear = nDate.getFullYear();
    if (nDateDate < 10) {
        nDateDate = "0" + nDateDate;
    }
    if (nDateMonth < 10) {
        nDateMonth = "0" + nDateMonth;
    }
    let presentDate = nDateYear + "-" + nDateMonth + "-" + nDateDate;
    return presentDate;
}

// Function to extract the domain from a URL
function getDomain(tablink) {
    if (tablink && tablink[0] && tablink[0].url) {
        let url = tablink[0].url;
        return url.split("/")[2];
    } else {
        return null;
    }
}

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

// Function to get data from IndexedDB
function getData(date, callback) {
    const transaction = db.transaction(["userData"], "readonly");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.get(date);

    request.onsuccess = function(event) {
        callback(event.target.result ? event.target.result.data : {});
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}

// Function to set data in IndexedDB
function setData(date, data, callback) {
    const transaction = db.transaction(["userData"], "readwrite");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.put({ date, data });

    request.onsuccess = function(event) {
        callback();
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}

// Function to update the time spent on the current active tab and the session
function updateTime() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (activeTab) {
        let domain = getDomain(activeTab);
        let url = activeTab[0].url;
        if (isValidURL(domain)) {
            let today = new Date();
            let presentDate = getDateString(today);
            let startTime = today.toTimeString().split(" ")[0];
            getData(presentDate, function(storedObject) {
                if (!storedObject[domain]) {
                    storedObject[domain] = [];
                }
                let lastSession = storedObject[domain].slice(-1)[0];
                if (lastSession && lastSession.url === url) {
                    lastSession.timeSpent++;
                    lastSession.endTime = startTime;
                } else {
                    storedObject[domain].push({ url, startTime, endTime: startTime, timeSpent: 1, sessions: (lastSession ? lastSession.sessions : 0) + 1 });
                }
                setData(presentDate, storedObject, function() {
                    console.log("Set " + domain + " at " + storedObject[domain]);
                    const totalTimeSpent = storedObject[domain].reduce((total, session) => total + session.timeSpent, 0);
                    chrome.action.setBadgeText({ text: secondsToString(totalTimeSpent, true) });
                });
            });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    });
}

// Function to update the badge text with the current tab's spending time
function updateBadge() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (activeTab) {
        let domain = getDomain(activeTab);
        let url = activeTab[0].url;
        if (isValidURL(domain)) {
            let today = new Date();
            let presentDate = getDateString(today);
            getData(presentDate, function(storedObject) {
                if (storedObject[domain]) {
                    const totalTimeSpent = storedObject[domain].reduce((total, session) => total + session.timeSpent, 0);
                    chrome.action.setBadgeText({ text: secondsToString(totalTimeSpent, true) });
                } else {
                    chrome.action.setBadgeText({ text: '0s' });
                }
            });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    });
}

// Function to download data as CSV
function downloadCSV(data) {
    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "user_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to format data for CSV
function formatDataForCSV(data) {
    const csvData = [["Date", "Start Time", "End Time", "Website", "Time Spent (s)", "Sessions"]];
    for (const date in data) {
        for (const domain in data[date]) {
            data[date][domain].forEach(session => {
                csvData.push([date, session.startTime, session.endTime, domain, session.timeSpent, session.sessions]);
            });
        }
    }
    return csvData;
}

// Listener for download request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "downloadCSV") {
        const transaction = db.transaction(["userData"], "readonly");
        const objectStore = transaction.objectStore("userData");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            const data = event.target.result.reduce((acc, item) => {
                acc[item.date] = item.data;
                return acc;
            }, {});
            const csvData = formatDataForCSV(data);
            downloadCSV(csvData);
            sendResponse({ success: true });
        };

        request.onerror = function(event) {
            console.error("IndexedDB error: ", event.target.errorCode);
        };

        return true;
    }
});

// Variable to store the interval ID for updating time
let intervalID;

// Set an interval to update time every second
intervalID = setInterval(updateTime, 1000);
// Set an interval to check the focus of the window every 500 milliseconds
setInterval(checkFocus, 500);

// Update the badge text every second
setInterval(updateBadge, 1000);

// Function to check if the current window is focused
function checkFocus() {
    chrome.windows.getCurrent(function (window) {
        if (window.focused) {
            if (!intervalID) {
                intervalID = setInterval(updateTime, 1000);
            }
        } else {
            if (intervalID) {
                clearInterval(intervalID);
                intervalID = null;
            }
        }
    });
}

// Listener for tab updates to ensure accurate tracking
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        updateTime();
        updateBadge();
    }
});

// Listener for tab activation to ensure accurate tracking
chrome.tabs.onActivated.addListener(() => {
    updateTime();
    updateBadge();
});
