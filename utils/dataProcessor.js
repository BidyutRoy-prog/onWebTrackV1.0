import { formatTimeSpent } from './timeFormat.js';

export async function getDataFromIndexedDB(date) {
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
            
            getRequest.onerror = reject;
        };
        
        request.onerror = reject;
    });
}

export async function getAllMonthData(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const monthData = {};

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        monthData[dateStr] = await getDataFromIndexedDB(dateStr);
    }

    return monthData;
}

export async function getMonthData(year, month) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("UserDataDB", 1);
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(["userData"], "readonly");
            const objectStore = transaction.objectStore("userData");
            const monthData = {};
            
            // Get all records
            const getAllRequest = objectStore.getAll();
            
            getAllRequest.onsuccess = function(event) {
                const allData = event.target.result;
                
                // Filter for the specific month
                allData.forEach(item => {
                    const date = new Date(item.date);
                    if (date.getFullYear() === year && date.getMonth() === month - 1) {
                        monthData[item.date] = item.data;
                    }
                });
                
                resolve(monthData);
            };
            
            getAllRequest.onerror = reject;
        };
        
        request.onerror = reject;
    });
}

export function calculateTotalTime(data) {
    let total = 0;
    Object.values(data).forEach(domains => {
        Object.values(domains).forEach(sessions => {
            sessions.forEach(session => {
                total += session.timeSpent || 0;
            });
        });
    });
    return total;
}

export function calculateWeeklyTotal(weekData) {
    let totalTime = 0;
    
    // Iterate through each day in the week data
    Object.values(weekData).forEach(dayData => {
        // For each domain in the day
        Object.values(dayData).forEach(sessions => {
            // Sum up timeSpent from all sessions
            sessions.forEach(session => {
                totalTime += session.timeSpent || 0;
            });
        });
    });
    
    return totalTime;
}

export function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
}

export function processWeekData(weekData, startDate) {
    // Ensure we're working with local dates
    const weekStart = new Date(startDate);
    
    console.log('Processing week data:', {
        startDate: weekStart.toLocaleString(),
        weekStartDay: weekStart.getDay()
    });
    
    const dailyTotals = new Array(7).fill(0);
    const siteStats = {};
    let maxDayTime = 0;
    let maxDayName = '';
    let totalWeekTime = 0;

    // Generate week dates using local time
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    console.log('Processing dates:', weekDates);

    // Process each date
    weekDates.forEach((date, index) => {
        const dayData = weekData[date];
        if (!dayData) return;

        let dayTotal = 0;
        Object.entries(dayData).forEach(([domain, sessions]) => {
            if (!siteStats[domain]) {
                siteStats[domain] = { totalTime: 0, visits: 0 };
            }

            sessions.forEach(session => {
                const timeSpent = session.timeSpent || 0;
                dayTotal += timeSpent;
                siteStats[domain].totalTime += timeSpent;
                siteStats[domain].visits += 1;
            });
        });

        dailyTotals[index] = dayTotal;
        totalWeekTime += dayTotal;

        if (dayTotal > maxDayTime) {
            maxDayTime = dayTotal;
            maxDayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        }

        console.log(`Processed ${date} (Day ${index + 1}): ${dayTotal} seconds`);
    });

    console.log('Daily totals array:', dailyTotals);

    // Prepare site statistics
    const topSites = Object.entries(siteStats)
        .map(([domain, stats]) => ({
            domain,
            totalTime: stats.totalTime,
            visits: stats.visits
        }))
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 10);

    console.log('Processed data:', {
        dailyTotals,
        totalWeekTime,
        mostActiveDay: {
            name: maxDayName || 'No activity',
            time: maxDayTime
        },
        topSites
    });

    return {
        dailyTotals,
        totalWeekTime,
        mostActiveDay: {
            name: maxDayName || 'No activity',
            time: maxDayTime
        },
        topSites
    };
}

export function calculateMonthlyStats(monthData) {
    let totalTime = 0;
    let dailyActivity = {};
    let domainStats = {};

    Object.entries(monthData).forEach(([date, dayData]) => {
        let dailyTotal = 0;
        
        // Process each domain's data
        Object.entries(dayData).forEach(([domain, sessions]) => {
            // Sum up session times for this domain
            const domainTime = sessions.reduce((sum, session) => sum + (session.timeSpent || 0), 0);
            dailyTotal += domainTime;

            // Update domain statistics
            if (!domainStats[domain]) {
                domainStats[domain] = { totalTime: 0, sessions: 0 };
            }
            domainStats[domain].totalTime += domainTime;
            domainStats[domain].sessions += sessions.length;
        });

        dailyActivity[date] = dailyTotal;
        totalTime += dailyTotal;
    });

    return {
        totalTime,
        dailyActivity,
        domainStats
    };
}
