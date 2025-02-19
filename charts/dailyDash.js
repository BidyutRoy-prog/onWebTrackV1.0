import { getDateString } from './daily.js';

let db = null;

// Initialize IndexedDB
function initializeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('UserDataDB', 1);
        
        request.onerror = () => reject('Failed to open database');
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('userData')) {
                db.createObjectStore('userData', { keyPath: 'date' });
            }
        };
    });
}

// Get data for specific date
async function getDailyData(date) {
    if (!db) await initializeDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['userData'], 'readonly');
        const store = transaction.objectStore('userData');
        const request = store.get(getDateString(date));
        
        request.onsuccess = () => resolve(request.result?.data || {});
        request.onerror = () => reject('Failed to fetch data');
    });
}

// Update UI with data
function updateUI(data, date) {
    // Update total time
    const totalTime = Object.values(data).reduce((sum, sessions) => 
        sum + sessions.reduce((total, session) => total + session.timeSpent, 0), 0);
    
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    const seconds = totalTime % 60;
    
    document.getElementById('total-time').textContent = `${hours}h ${minutes}m ${seconds}s`;
    document.getElementById('sites-count').textContent = Object.keys(data).length;
    
    // Create chart data
    const chartData = Object.entries(data).map(([domain, sessions]) => ({
        name: domain,
        value: sessions.reduce((sum, session) => sum + session.timeSpent, 0)
    })).sort((a, b) => b.value - a.value);

    // Update chart using ECharts
    const chartElement = document.getElementById('time-distribution-chart');
    if (chartElement && window.echarts) {
        const chart = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const hours = Math.floor(params.value / 3600);
                    const minutes = Math.floor((params.value % 3600) / 60);
                    const seconds = params.value % 60;
                    return `${params.name}<br/>
                            Time: ${hours}h ${minutes}m ${seconds}s<br/>
                            Percentage: ${params.percent}%`;
                }
            },
            legend: {
                orient: 'horizontal',
                // right: 10,
                // top: 'center',
                top: 'bottom',
                type: 'scroll'
            },
            series: [{
                name: 'Time Distribution',
                type: 'pie',
                radius: ['30%', '70%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    formatter: function(params) {
                        return params.name + '\n' + Math.round(params.percent) + '%';
                    }
                },
                emphasis: {
                    label: {
                        show: false,
                        fontSize: '16',
                        fontWeight: 'bold'
                    }
                },
                data: chartData
            }]
        };

        // Handle window resize
        window.addEventListener('resize', () => chart.resize());
        
        // Set chart options
        chart.setOption(option);
    }

    // Update visited sites list
    const sitesTableBody = document.getElementById('sites-table-body');
    sitesTableBody.innerHTML = '';

    // Sort sites by time spent
    const sortedSites = Object.entries(data)
        .map(([domain, sessions]) => ({
            domain,
            timeSpent: sessions.reduce((total, session) => total + session.timeSpent, 0),
            sessionCount: sessions.length
        }))
        .sort((a, b) => b.timeSpent - a.timeSpent);

    // Create table rows with seconds
    sortedSites.forEach((site, index) => {
        const row = document.createElement('tr');
        const hrs = Math.floor(site.timeSpent / 3600);
        const mins = Math.floor((site.timeSpent % 3600) / 60);
        const secs = site.timeSpent % 60;
        const timeString = `${hrs}h ${mins}m ${secs}s`;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${site.domain}</td>
            <td>${timeString}</td>
            <td>${site.sessionCount}</td>
        `;
        sitesTableBody.appendChild(row);
    });
}

// Main update function
export async function updateDashboard(date) {
    try {
        const data = await getDailyData(date);
        updateUI(data, date);
        return data;
    } catch (error) {
        console.error('Failed to update dashboard:', error);
        return {};
    }
}

// Initialize when module loads
initializeDB().catch(console.error);

document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    document.getElementById('current-date').textContent = currentDate.toDateString();
    updateDashboard(currentDate);

    document.getElementById('prev-day').addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() - 1);
        document.getElementById('current-date').textContent = currentDate.toDateString();
        updateDashboard(currentDate);
    });

    document.getElementById('next-day').addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() + 1);
        document.getElementById('current-date').textContent = currentDate.toDateString();
        updateDashboard(currentDate);
    });
});


