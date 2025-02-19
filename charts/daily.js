// Function to convert seconds into a human-readable string
export function secondsToString(seconds) {
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Function to format a date object into a string "YYYY-MM-DD"
export function getDateString(date) {
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    if (day < 10) day = '0' + day;
    if (month < 10) month = '0' + month;
    return `${year}-${month}-${day}`;
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
    console.log("IndexedDB opened successfully");
};

request.onerror = function(event) {
    console.error("IndexedDB error: ", event.target.errorCode);
};

// Function to create a Nightingale chart using ECharts library
export function createNightingaleChart(elementId, title, labels, data) {
    // Sort labels and data by time spent in descending order
    const sortedData = labels.map((label, index) => ({
        label: label,
        value: data[index]
    })).sort((a, b) => b.value - a.value);

    // Take only the top 10 items
    const topData = sortedData.slice(0, 10);

    const sortedLabels = topData.map(item => item.label);
    const sortedValues = topData.map(item => item.value);

    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#111827' : '#FFFFFF';

    var chartDom = document.getElementById(elementId);
    var myChart = echarts.init(chartDom);
    var option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                color: textColor
            }
        },
        legend: {
            orient: 'vertical',
            right: 'right',
            top: 'middle',
            textStyle: {
                color: textColor,
                width: 200, // Set a fixed width for legend items
                overflow: 'truncate', // Enable text wrapping
                ellipsis: '...' // Add ellipsis for overflow text
            },
            formatter: function(name) {
                return name.length > 30 ? name.slice(0, 30) + '...' : name;
            }
        },
        series: [
            {
                name: 'Time Spent',
                type: 'pie',
                radius: ['35%', '70%'],
                center: ['30%', '50%'],
                roseType: 'radius',
                itemStyle: {
                    borderRadius: 5
                },
                label: {
                    show: false,
                    position: 'center',
                    formatter: function(params) {
                        return `${params.name}\n${secondsToString(params.value)}`;
                    },
                    color: textColor,
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '20',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: sortedLabels.map((label, index) => ({
                    value: sortedValues[index],
                    name: label
                }))
            }
        ]
    };
    option && myChart.setOption(option);
}

// Function to update statistics for today's time spent and sites visited
export function updateStats(today, labels, data) {
    const totalTimeSpent = data.reduce((a, b) => a + b, 0);
    const totalSitesVisited = labels.length;

    document.getElementById('timeSpentCard').querySelector('h3').textContent = `Total time ${secondsToString(totalTimeSpent)}`;
    document.getElementById('siteVisitedCard').querySelector('h3').textContent = `Site visited ${totalSitesVisited}`;

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = getDateString(yesterday);

    const transaction = db.transaction(["userData"], "readonly");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.get(yesterdayDate);

    request.onsuccess = function(event) {
        const yesterdayData = event.target.result ? event.target.result.data : {};
        console.log("Yesterday's data:", yesterdayData);

        const yesterdayTimeSpent = Object.values(yesterdayData).reduce((total, siteData) => {
            return total + siteData.reduce((siteTotal, session) => siteTotal + session.timeSpent, 0);
        }, 0);

        const timeDifference = totalTimeSpent - yesterdayTimeSpent;
        const timePercentage = yesterdayTimeSpent ? ((timeDifference / yesterdayTimeSpent) * 100).toFixed(2) : 'N/A';

        document.getElementById('timeSpentCard').querySelector('p').textContent = yesterdayTimeSpent ? 
            `${timePercentage >= 0 ? timePercentage + '% higher' : Math.abs(timePercentage) + '% lower'} than yesterday` : 
            'No data for yesterday';

        const yesterdaySitesVisited = Object.keys(yesterdayData).length;
        const siteDifference = totalSitesVisited - yesterdaySitesVisited;

        document.getElementById('siteVisitedCard').querySelector('p').textContent = yesterdaySitesVisited ? 
            (siteDifference === 0 ? 'same as yesterday' : `${siteDifference > 0 ? siteDifference + ' more' : Math.abs(siteDifference) + ' less'} than yesterday`) : 
            'No data for yesterday';
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}


