import { createNightingaleChart, secondsToString, getDateString, updateStats } from '../charts/daily.js';
import { displayWeeklySummary } from '../charts/weekly.js';

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
    console.log("IndexedDB opened successfully");
    initializePopup();
};

request.onerror = function(event) {
    console.error("IndexedDB error: ", event.target.errorCode);
};

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

function initializePopup() {
    const today = new Date();
    const presentDate = getDateString(today);

    getData(presentDate, (todayData) => {
        const labels = Object.keys(todayData);
        const data = labels.map(label => todayData[label].reduce((total, session) => total + session.timeSpent, 0));

        createNightingaleChart('dailyChart', 'Top Visited Sites Today', labels, data);

        // Update stats cards with actual data
        updateStats(today, labels, data);

        // Add event listener to the "View detailed" button
        const detailedButton = document.getElementById('viewDetail');
        if (detailedButton) {
            detailedButton.addEventListener('click', () => {
                const webListDiv = document.getElementById('webListDiv');
                const webList = document.getElementById('webList');
                webList.innerHTML = ''; // Clear previous list

                // Create an array of objects with label, totalTimeSpent, and totalSessions
                const siteData = labels.map(label => {
                    const totalTimeSpent = todayData[label].reduce((total, session) => total + session.timeSpent, 0);
                    const totalSessions = todayData[label].length;
                    return { label, totalTimeSpent, totalSessions };
                });

                // Sort the array by totalTimeSpent in descending order
                siteData.sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);

                // Populate the table with sorted data
                siteData.forEach((site, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <th scope="row">${index + 1}</th>
                        <td>${site.label}</td>
                        <td>${secondsToString(site.totalTimeSpent)}</td>
                        <td>${site.totalSessions}</td>
                    `;
                    webList.appendChild(row);
                });

                // Toggle the visibility of the detailed view
                webListDiv.classList.toggle('show');

                // Toggle the button text
                if (webListDiv.classList.contains('show')) {
                    detailedButton.textContent = 'Hide details';
                } else {
                    detailedButton.textContent = 'View detailed';
                }
            });
        }
    });

    // Load theme from storage
    chrome.storage.local.get('theme', (result) => {
        if (result.theme === 'light') {
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
        }
        updateCharts();
    });

    // Add event listener to the Dashboard button using its ID
    const dashboardButton = document.getElementById('dashboard');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('../dashboard/dashboard.html') });
        });
    }
}

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLightMode = body.classList.contains('light-mode');
    chrome.storage.local.set({ theme: isLightMode ? 'light' : 'dark' });
    updateCharts();
});

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const contentSections = document.querySelectorAll('.content-section');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show correct content
        contentSections.forEach(section => {
            section.classList.add('hidden');
            if (section.id === `${tab}Content`) {
                section.classList.remove('hidden');
            }
        });

        // Reinitialize charts
        if (tab === 'weekly') {
            displayWeeklySummary();
        } else {
            updateCharts();
        }
    });
});

function updateCharts() {
    const isLightMode = body.classList.contains('light-mode');
    const textColor = isLightMode ? '#111827' : '#FFFFFF';
    // Update daily chart
    const dailyChart = echarts.getInstanceByDom(document.getElementById('dailyChart'));
    if (dailyChart) {
        dailyChart.setOption({
            title: { textStyle: { color: textColor } },
            legend: { textStyle: { color: textColor } },
            series: [{ label: { color: textColor } }]
        });
    }
    // Update weekly chart
    const weeklyChart = echarts.getInstanceByDom(document.getElementById('weeklyChart'));
    if (weeklyChart) {
        weeklyChart.setOption({
            title: { textStyle: { color: textColor } },
            yAxis: { axisLabel: { color: textColor } },
            xAxis: { axisLabel: { color: textColor } },
            series: [{ label: { color: textColor } }]
        });
    }
}

