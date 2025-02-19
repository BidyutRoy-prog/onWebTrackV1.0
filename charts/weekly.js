import { secondsToString, getDateString } from './daily.js';

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

function getDateTotalTime(storedObject, date) {
    let websiteLinks = Object.keys(storedObject[date]);
    let totalTime = 0;
    for (let i = 0; i < websiteLinks.length; i++) {
        totalTime += storedObject[date][websiteLinks[i]].reduce((total, session) => total + session.timeSpent, 0);
    }
    return totalTime;
}

function getWeeklyData(storedItems, startDateObj, endDate) {
    let timeEachDay = [];
    let dateLabels = [];
    let weeksTotalTime = 0;

    for (let d = new Date(startDateObj); d <= endDate; d.setDate(d.getDate() + 1)) {
        let dateString = getDateString(d);
        let label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
        dateLabels.push(label);
        if (Object.keys(storedItems).includes(dateString)) {
            let dayTime = getDateTotalTime(storedItems, dateString);
            timeEachDay.push(dayTime);
            weeksTotalTime += dayTime;
        } else {
            timeEachDay.push(0);
        }
    }

    return { timeEachDay, dateLabels, weeksTotalTime };
}

function updateWeeklyStats(weeksTotalTime, timeEachDay) {
    const weeklyAverage = Math.floor(weeksTotalTime / timeEachDay.length);
    const weeklyMax = Math.max(...timeEachDay);
    const weeklyMin = Math.min(...timeEachDay);

    document.getElementById("weekAvg").innerText = secondsToString(weeklyAverage);
    document.getElementById("weekMax").innerText = secondsToString(weeklyMax);
    document.getElementById("weekMin").innerText = secondsToString(weeklyMin);
}

function createWeeklyChart(elementId, title, dateLabels, timeEachDay) {
    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#111827' : '#FFFFFF';

    const chartDom = document.getElementById(elementId);
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                color: textColor
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                let result = params[0].name + '<br/>';
                params.forEach(function(item) {
                    result += item.marker + ' Total Time: ' + secondsToString(item.value) + '<br/>';
                });
                return result;
            }
        },
        legend: {
            show: false
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dateLabels,
            axisLabel: {
                color: textColor
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function(value) {
                    return secondsToString(value);
                },
                color: textColor
            }
        },
        series: [{
            name: 'Total Time',
            type: 'bar',
            data: timeEachDay,
            itemStyle: {
                color: '#5470C6'
            }
        }]
    };

    myChart.setOption(option);
}

function displayWeeklySummary(startDate = null) {
    const transaction = db.transaction(["userData"], "readonly");
    const objectStore = transaction.objectStore("userData");
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const storedItems = event.target.result.reduce((acc, item) => {
            acc[item.date] = item.data;
            return acc;
        }, {});

        let endDate = new Date();
        if (startDate) {
            endDate = new Date(startDate);
        }
        let startDateObj = new Date(endDate);
        startDateObj.setDate(endDate.getDate() - 6);

        const { timeEachDay, dateLabels, weeksTotalTime } = getWeeklyData(storedItems, startDateObj, endDate);

        updateWeeklyStats(weeksTotalTime, timeEachDay);
        createWeeklyChart('weeklyChart', 'Weekly Summary', dateLabels, timeEachDay);
    };

    request.onerror = function(event) {
        console.error("IndexedDB error: ", event.target.errorCode);
    };
}

export { displayWeeklySummary };
