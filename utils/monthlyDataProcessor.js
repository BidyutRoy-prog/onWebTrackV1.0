import { formatTimeSpent } from './timeFormat.js';

export function processMonthlyData(monthlyData) {
    let totalMonthlyTime = 0;
    const monthlyActivity = {};

    for (const date in monthlyData) {
        if (monthlyData.hasOwnProperty(date)) {
            let dailyTotal = 0;
            for (const domain in monthlyData[date]) {
                if (monthlyData[date].hasOwnProperty(domain)) {
                    monthlyData[date][domain].forEach(session => {
                        dailyTotal += session.timeSpent;
                    });
                }
            }
            totalMonthlyTime += dailyTotal;
            monthlyActivity[date] = dailyTotal;
        }
    }

    return {
        totalMonthlyTime: totalMonthlyTime,
        monthlyActivity: monthlyActivity
    };
}
