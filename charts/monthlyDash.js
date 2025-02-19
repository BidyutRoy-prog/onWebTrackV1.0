import { formatTimeSpent } from '../utils/timeFormat.js';
import { getMonthData, calculateMonthlyStats } from '../utils/dataProcessor.js';

let currentMonth = new Date();
let monthlyChart = null;

export function initMonthlyDashboard() {
    if (typeof echarts === 'undefined') {
        console.error('ECharts is not loaded');
        return;
    }
    setupMonthlyNavigation();
    updateMonthlyView();
}

function setupMonthlyNavigation() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        updateMonthlyView();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        updateMonthlyView();
    });
}

async function updateMonthlyView() {
    try {
        console.log('Fetching data for:', currentMonth.getFullYear(), currentMonth.getMonth() + 1);

        const monthData = await getMonthData(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1
        );

        console.log('Month data:', monthData);

        if (!monthData || Object.keys(monthData).length === 0) {
            resetMonthlyDisplay();
            return;
        }

        const stats = calculateMonthlyStats(monthData);
        console.log('Calculated stats:', stats);

        updateMonthlyDisplay();
        updateMonthlyStats(stats);
        updateActivityHeatmap(stats.dailyActivity);
        updateMonthlyTrendsChart(stats.domainStats);

    } catch (error) {
        console.error('Failed to update monthly view:', error);
        resetMonthlyDisplay();
    }
}

function updateMonthlyDisplay() {
    document.getElementById('current-month').textContent =
        currentMonth.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
}

function updateMonthlyStats(stats) {
    // Update total monthly time
    document.getElementById('total-monthly-time').textContent =
        formatTimeSpent(stats.totalTime);

    // For now, use a placeholder trend
    document.getElementById('monthly-time-trend').textContent =
        `Tracked ${Object.keys(stats.dailyActivity).length} days this month`;
}

function updateActivityHeatmap(dailyActivity) {
    const container = document.getElementById('activity-heatmap');
    if (!container) return;

    container.innerHTML = '';
    container.style.height = '300px';

    const chart = echarts.init(container);

    // Get current month's dates
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Process data - calculate total time for each day
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dailyActivity[dateStr]) {
            // Sum up all website times for this day
            const totalSeconds = Object.values(dailyActivity[dateStr]).reduce((total, siteData) => {
                const siteTotalTime = siteData.reduce((siteTotal, session) => {
                    return siteTotal + (session.timeSpent || 0);
                }, 0);
                return total + siteTotalTime;
            }, 0);
            
            // Convert to hours
            data.push([dateStr, Math.round((totalSeconds / 3600) * 100) / 100]);
        } else {
            data.push([dateStr, 0]);
        }
    }

    const maxHours = Math.max(...data.map(item => item[1]));

    const option = {
        title: {
            text: 'Daily Activity',
            left: 'center',
            top: 0
        },
        tooltip: {
            position: 'top',
            formatter: function(params) {
                const date = new Date(params.data[0]).toLocaleDateString();
                const hours = params.data[1];
                if (hours === 0) {
                    return `${date}<br/>No activity`;
                }
                return `${date}<br/>Total time: ${formatTimeSpent(hours * 3600)}`;
            }
        },
        visualMap: {
            min: 0,
            max: Math.max(maxHours, 1),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            top: 35,
            inRange: {
                color: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
            }
        },
        calendar: {
            top: 80,
            left: 30,
            right: 30,
            cellSize: ['auto', 25],
            range: `${year}-${String(month + 1).padStart(2, '0')}`,
            itemStyle: {
                borderWidth: 0.5,
                borderColor: '#fff'
            },
            yearLabel: { show: false },
            monthLabel: { show: false },
            dayLabel: {
                firstDay: 1,
                nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#eee',
                    width: 1
                }
            }
        },
        series: {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: data,
            label: {
                show: true,
                formatter: function(params) {
                    return params.data[1] > 0 ? params.data[1] + 'h' : '';
                },
                fontSize: 8
            }
        }
    };

    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
}

function updateMonthlyTrendsChart(domainStats) {
    const chartDom = document.getElementById('monthly-trends-chart');

    // Initialize chart if not exists
    if (!monthlyChart) {
        monthlyChart = echarts.init(chartDom);
    }

    // Process domain stats into chart data
    const data = Object.entries(domainStats)
        .map(([domain, stats]) => ({
            name: domain,
            value: stats.totalTime
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 domains

    const option = {
        title: {
            text: 'Top Visited Domains',
            left: 'center',
            top: 0,
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function (params) {
                return `${params[0].name}<br/>Time: ${formatTimeSpent(params[0].value)}`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(item => item.name),
            axisLabel: {
                rotate: 45,
                overflow: 'truncate',
                width: 100,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return formatTimeSpent(value);
                }
            }
        },
        series: [{
            name: 'Time Spent',
            type: 'bar',
            data: data.map(item => item.value),
            barMaxWidth: 50,
            itemStyle: {
                color: '#3182CE',
                borderRadius: [4, 4, 0, 0]
            },
            emphasis: {
                itemStyle: {
                    color: '#2C5282'
                }
            },
            label: {
                show: true,
                position: 'top',
                formatter: function (params) {
                    return formatTimeSpent(params.value);
                }
            }
        }]
    };

    // Handle window resize
    window.addEventListener('resize', () => monthlyChart.resize());

    // Set chart options
    monthlyChart.setOption(option);
}

function resetMonthlyDisplay() {
    document.getElementById('total-monthly-time').textContent = '0s';
    document.getElementById('monthly-time-trend').textContent = '0% vs last month';

    if (monthlyChart) {
        monthlyChart.dispose();
        monthlyChart = null;
    }

    document.getElementById('activity-heatmap').innerHTML =
        '<div class="no-data">No data available for this month</div>';
}
