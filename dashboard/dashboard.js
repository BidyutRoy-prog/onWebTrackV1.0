import { updateDashboard } from '../charts/dailyDash.js';
import { initWeeklyDashboard } from '../charts/weeklyDash.js';
import { initMonthlyDashboard } from '../charts/monthlyDash.js';

document.addEventListener('DOMContentLoaded', () => {
    // Current date tracking
    let currentDate = new Date();
    
    // Update display and data
    function updateDisplay() {
        // Update date display
        document.getElementById('current-date').textContent = 
            currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        
        // Update dashboard data
        updateDashboard(currentDate);
    }
    
    // Date navigation
    document.getElementById('prev-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDisplay();
    });
    
    document.getElementById('next-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDisplay();
    });
    
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            
            // Update active states
            document.querySelectorAll('.nav-btn').forEach(btn => 
                btn.classList.remove('active'));
            document.querySelectorAll('.section').forEach(sec => 
                sec.classList.add('hidden'));
            
            // Activate selected section
            button.classList.add('active');
            const sectionElement = document.getElementById(`${section}-section`);
            sectionElement.classList.remove('hidden');
            
            // Initialize section if needed
            if (section === 'weekly') {
                initWeeklyDashboard();
            } else if (section === 'monthly') {
                initMonthlyDashboard();
            }
        });
    });
    
    // Initial update
    updateDisplay();
});

// Export Data
document.getElementById('export-data').addEventListener('click', async () => {
    const { exportData } = await import('../settings/data.js');
    exportData();
});

// Import Data
document.getElementById('import-data').addEventListener('click', async () => {
    const { importData } = await import('../settings/data.js');
    importData();
});

// Clear Data
document.getElementById('clear-data').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        const { clearData } = await import('../settings/data.js');
        clearData();
    }
});