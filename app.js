// Setup Time
function updateTime() {
    const timeElement = document.getElementById('current-time');
    const now = new Date();
    timeElement.innerText = now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', 
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}
setInterval(updateTime, 1000);
updateTime();

// Refresh Control & Auto-Renewal
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

document.getElementById('refresh-btn').addEventListener('click', () => {
    // Reloads the page to fetch the latest "current time" and renew content
    location.reload();
});

// Auto-refresh the dashboard exactly every 30 minutes
setInterval(() => {
    console.log("30 minutes passed. Renewing news contents & dashboard data.");
    location.reload();
}, REFRESH_INTERVAL_MS);

// Chart Theme Configuration
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = "'Inter', sans-serif";
const gridConfig = {
    color: 'rgba(255, 255, 255, 0.05)',
    drawBorder: false
};

// --- DATA DEFINITIONS ---

// 1. Exchange Rate Data Setup
const todayChart = new Date();
const todayLabel = todayChart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' (Today)';

// Initial chart data (the last point is a placeholder that will be updated)
let krwChartInstance = null;
const krwData = {
    labels: ['Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', todayLabel],
    datasets: [{
        label: 'USD to KRW',
        data: [1379, 1420, 1475, 1470, 1450, 1465, 1488], // Default fallback
        borderColor: '#00d200', /* Green-1 */
        backgroundColor: 'rgba(0, 210, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#001a66', /* Background Color */
        pointBorderColor: '#00d200',
        pointHoverRadius: 6
    }]
};

// Function to fetch real-time USD/KRW exchange rate
async function fetchRealExchangeRate() {
    try {
        // Using Frankfurter API (Free, no key needed for basic usage, supports USD/KRW)
        // Note: Free APIs might have latency or limit pairs, fallback is 1488 (Current user context)
        const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW');
        const data = await response.json();
        
        if (data && data.rates && data.rates.KRW) {
            const currentRate = Math.round(data.rates.KRW);
            updateExchangeRateUI(currentRate);
        } else {
            throw new Error("Invalid API Response");
        }
    } catch (error) {
        console.warn("Could not fetch live exchange rate. Using fallback.", error);
        // Fallback to the latest known accurate rate (1488 KRW)
        updateExchangeRateUI(1488);
    }
}

function updateExchangeRateUI(rate) {
    // 1. Update the subtitle
    const subtitleEl = document.getElementById('exchange-rate-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = `Current Rate: ${rate.toLocaleString()} KRW (Today)`;
    }

    // 2. Update the chart's last data point
    if (krwChartInstance) {
        const dataArray = krwChartInstance.data.datasets[0].data;
        dataArray[dataArray.length - 1] = rate; // Update the last item
        krwChartInstance.update();
    }
}

// 2. Crane Price Trends (STS, RTGC, DTQC)
// Prices estimated per unit in Million USD.
const craneData = {
    labels: ['2023', '2024', '2025', '2026 (Est)'],
    datasets: [
        {
            label: 'STS (Standard, 50T)',
            data: [6.8, 7.0, 7.5, 7.8],
            backgroundColor: '#6b6f70', /* Neutral Grey */
            borderRadius: 4
        },
        {
            label: 'RTGC',
            data: [1.8, 1.9, 2.1, 2.2],
            backgroundColor: '#81d179', /* Light Green */
            borderRadius: 4
        },
        {
            label: 'DTQC (Automated)',
            data: [15.0, 15.5, 16.2, 16.8],
            backgroundColor: '#b3e6e3', /* Light Blue */
            borderRadius: 4
        }
    ]
};

// 3. SCFI Index (Past 1 Year)
const scfiData = {
    labels: ['Apr 25', 'Jun 25', 'Aug 25', 'Oct 25', 'Dec 25', 'Feb 26', 'Mar 26'],
    datasets: [{
        label: 'SCFI Index Value',
        data: [2000, 2240, 1644, 1400, 1200, 1595, 1710],
        borderColor: '#00a01e', /* Green-2 */
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#00a01e'
    }]
};

// 4. Global Steel Price Index
const steelData = {
    labels: ['Mar 25', 'May 25', 'Jul 25', 'Sep 25', 'Nov 25', 'Jan 26', 'Mar 26'],
    datasets: [{
        label: 'Steel Price Index',
        data: [110, 105, 95, 90, 88, 92, 96], // Illustrative index values
        borderColor: '#c6e68d', /* Light Yellow/Green */
        backgroundColor: 'rgba(198, 230, 141, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }]
};


// --- INITIALIZE CHARTS ---

window.onload = function() {
    
    // Exchange Rate Chart
    krwChartInstance = new Chart(document.getElementById('exchangeRateChart').getContext('2d'), {
        type: 'line',
        data: krwData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: gridConfig, min: 1350 },
                x: { grid: gridConfig }
            }
        }
    });

    // Crane Price Chart
    new Chart(document.getElementById('cranePriceChart').getContext('2d'), {
        type: 'bar',
        data: craneData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { grid: gridConfig, title: { display: true, text: 'Price ($M)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // SCFI Chart
    new Chart(document.getElementById('scfiChart').getContext('2d'), {
        type: 'line',
        data: scfiData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: gridConfig, min: 1000 },
                x: { grid: gridConfig }
            }
        }
    });

    // Steel Price Chart
    new Chart(document.getElementById('steelPriceChart').getContext('2d'), {
        type: 'line',
        data: steelData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: gridConfig },
                x: { grid: gridConfig }
            }
        }
    });

    // Fetch dynamic exchange data immediately on load
    fetchRealExchangeRate();
};
