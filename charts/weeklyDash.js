import { formatTimeSpent } from '../utils/timeFormat.js';
import { processWeekData } from '../utils/dataProcessor.js';

let weeklyChart = null;
let currentWeekStart = null;

export function initWeeklyDashboard() {
    currentWeekStart = getCurrentWeekStart();
    setupWeeklyNav();
    updateWeeklyView(currentWeekStart);
}

function getCurrentWeekStart() {
    // Start with UTC date to avoid timezone issues
    const now = new Date();
    
    // Convert to local date at midnight
    const localDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
    ));

    // Get ISO week start (Monday)
    const day = localDate.getDay() || 7; // Convert Sunday (0) to 7
    const monday = new Date(localDate);
    monday.setDate(localDate.getDate() - day + 1);

    console.log('Week calculation:', {
        originalDate: now.toISOString(),
        localDate: localDate.toISOString(),
        calculatedDay: day,
        mondayDate: monday.toISOString(),
        mondayLocal: monday.toLocaleString()
    });

    return monday;
}

function setupWeeklyNav() {
    document.getElementById('prev-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateWeeklyView(currentWeekStart);
        updateNavigationState();
    });
    
    document.getElementById('next-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateWeeklyView(currentWeekStart);
        updateNavigationState();
    });
}

function getDateTotalTime(dayData) {
    if (!dayData) return 0;
    return Object.values(dayData).reduce((total, sessions) => {
        return total + sessions.reduce((sum, session) => sum + (session.timeSpent || 0), 0);
    }, 0);
}

async function updateWeeklyView(startDate) {
    try {
        // Create week dates in local time
        const weekStart = new Date(startDate);
        const weekDates = [];
        
        // Generate dates for the week (Monday to Sunday)
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + i);
            // Format date in YYYY-MM-DD format using local time
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            weekDates.push(`${year}-${month}-${day}`);
        }

        console.log('Processing week:', {
            startDate: weekStart.toLocaleString(),
            weekDates
        });

        // Fetch and process data
        const weekData = {};
        for (const date of weekDates) {
            const data = await getDataFromIndexedDB(date);
            if (Object.keys(data).length > 0) {
                weekData[date] = data;
            }
        }

        const stats = processWeekData(weekData, weekStart);
        updateDateDisplay(weekStart);
        updateWeeklyStats(stats);
        updateWeeklyChart(stats.dailyTotals, weekDates);
        updateMostVisitedSites(stats.topSites);
        
    } catch (error) {
        console.error('Weekly view update failed:', error);
        resetWeeklyDisplay();
    }
}

function calculateDayTotal(dayData) {
    if (!dayData) return 0;
    return Object.values(dayData).reduce((total, sessions) => {
        return total + sessions.reduce((sum, session) => sum + (session.timeSpent || 0), 0);
    }, 0);
}

// Function to get data from IndexedDB
function getDataFromIndexedDB(date) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("UserDataDB", 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(["userData"], "readonly");
            const objectStore = transaction.objectStore("userData");
            const getRequest = objectStore.get(date);

            getRequest.onsuccess = function(event) {
                const result = event.target.result;
                resolve(result ? result.data : {});
            };

            getRequest.onerror = function(event) {
                console.error("IndexedDB error: ", event.target.errorCode);
                reject(event);
            };
        };

        request.onerror = function(event) {
            console.error("IndexedDB error: ", event.target.errorCode);
            reject(event);
        };
    });
}

// Add this new function to get ISO week number
function getWeekNumber(date) {
    const target = new Date(date);
    const dayNumber = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function updateDateDisplay(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const weekNum = getWeekNumber(startDate);
    const format = { month: 'short', day: 'numeric' };
    const endFormat = { ...format, year: 'numeric' };
    
    const dateRange = `Week ${weekNum}: ${startDate.toLocaleDateString('en-US', format)} - ${endDate.toLocaleDateString('en-US', endFormat)}`;
    document.getElementById('current-week').textContent = dateRange;
}

function updateWeeklyStats(stats) {
    // Update most active day
    document.getElementById('most-active-day').textContent = stats.mostActiveDay.name;
    document.querySelector('#most-active-day + .description').textContent = 
        `${formatTimeSpent(stats.mostActiveDay.time)} of focused work`;
    
    // Update total time
    document.getElementById('total-weekly-time').textContent = formatTimeSpent(stats.totalWeekTime);
}

function updateWeeklyChart(timeEachDay, dateLabels) {
    const container = document.getElementById('weekly-chart');
    if (!weeklyChart) {
        weeklyChart = echarts.init(container);
    }

    // Get only weekday names for labels
    const weekdayLabels = dateLabels.map(date => {
        return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const date = new Date(dateLabels[params[0].dataIndex]);
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                return `${formattedDate}<br/>Time: ${formatTimeSpent(params[0].value)}`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',  // Reduced bottom margin since we don't have two-line labels
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: weekdayLabels,
            axisLabel: {
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: value => formatTimeSpent(value)
            }
        },
        series: [{
            name: 'Time Spent',
            type: 'bar',
            data: timeEachDay,
            itemStyle: {
                color: '#3182CE',
                borderRadius: [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                formatter: params => formatTimeSpent(params.value)
            }
        }]
    };

    weeklyChart.setOption(option);
}

function updateMostVisitedSites(sites) {
    const container = document.getElementById('weekly-most-Visit');
    
    if (sites.length === 0) {
        container.innerHTML = '<div class="no-data">No activity recorded this week</div>';
        return;
    }

    container.innerHTML = sites.map((site, index) => `
        <div class="site-item">
            <div class="site-info">
                <span class="rank">${index + 1}.</span>
                <span class="domain">${site.domain}</span>
            </div>
            <div class="site-stats">
                <span class="time">${formatTimeSpent(site.totalTime)}</span>
                <span class="visits">${site.visits} visits</span>
            </div>
        </div>
    `).join('');
}

function resetWeeklyDisplay() {
    document.getElementById('most-active-day').textContent = 'No activity';
    document.querySelector('#most-active-day + .description').textContent = '0s of focused work';
    document.getElementById('total-weekly-time').textContent = '0s';
    document.getElementById('weekly-most-Visit').innerHTML = '<div class="no-data">No data available</div>';
    
    if (weeklyChart) {
        weeklyChart.setOption({
            series: [{ data: new Array(7).fill(0) }]
        });
    }
}

function getWeekDates(startDate) {
    const dates = [];
    const current = new Date(startDate);
    
    // Generate exactly 7 dates starting from Monday
    for (let i = 0; i < 7; i++) {
        const date = current.toISOString().split('T')[0];
        dates.push(date);
        current.setDate(current.getDate() + 1);
    }
    
    console.log('Generated week dates:', dates);
    return dates;
}

function updateNavigationState() {
    const firstDayOfYear = new Date(currentWeekStart.getFullYear(), 0, 1);
    const today = new Date();
    
    document.getElementById('prev-week').disabled = currentWeekStart <= firstDayOfYear;
    document.getElementById('next-week').disabled = currentWeekStart >= today;
}
