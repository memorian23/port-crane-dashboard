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

// --- NEWS FETCHING LOGIC ---
const NEWS_CATEGORIES = [
    { id: 'news-cost',   tagClass: 'tag-cost',   tagText: '💰 원가절감 (Cost Savings)', query: '항만 크레인 원가절감 물류비 자동화 비용' },
    { id: 'news-ai',     tagClass: 'tag-ai',     tagText: '🤖 Physical AI',             query: 'Physical AI 로봇 자동화 항만 물류' },
    { id: 'news-geo',    tagClass: 'tag-geo',    tagText: '🌏 Geopolitics',             query: '미국 중국 지정학 무역분쟁 관세 항만 리스크' },
    { id: 'news-abroad', tagClass: 'tag-abroad', tagText: '🚢 Abroad (파트너·경쟁사)',  query: 'ZPMC LIEBHERR SANY KONE 크레인 항만 수주 HD현대에코비나' }
];

async function updateNews() {
    const btn = document.getElementById('refresh-news-btn');
    if (btn) btn.innerText = '🔄 Loading...';

    for (const cat of NEWS_CATEGORIES) {
        try {
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cat.query)}&hl=ko&gl=KR&ceid=KR:ko`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, "text/xml");
            const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 3);
            
            if (items.length > 0) {
                const container = document.getElementById(cat.id);
                if (!container) continue;

                // Create a 1-line pseudo summary based on the first returned article
                const firstTitle = items[0].querySelector("title").textContent.split(' - ')[0]; 
                const summaryText = `[최신 동향] ${firstTitle} 등 관련 주요 소식`;

                let linksHtml = '<ul class="news-links">';
                items.forEach(item => {
                    let title = item.querySelector("title").textContent;
                    // Clean up publisher names that usually follow a dash " - "
                    title = title.split(' - ')[0].trim();
                     // Limit title length to prevent extremely long links breaking layout
                    if(title.length > 60) title = title.substring(0, 60) + '...';
                    
                    const link = item.querySelector("link").textContent;
                    linksHtml += `<li><a href="${link}" target="_blank">${title}</a></li>`;
                });
                linksHtml += '</ul>';

                // Re-render the widget HTML
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>${summaryText}</h3>
                    ${linksHtml}
                `;
            }
        } catch (error) {
            console.error(`Failed to fetch news for ${cat.query}`, error);
        }
    }
    
    if (btn) btn.innerText = '🔄 News Refresh';
}

// Bind button and fetch initially
document.getElementById('refresh-news-btn')?.addEventListener('click', updateNews);
// Also fetch immediately on load so we get live data instead of static placeholders over time
updateNews();

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

// 2. Crude Oil Prices – WTI / Brent / Dubai (Past 6 Months)
const oilPriceData = {
    labels: ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26'],
    datasets: [
        {
            label: 'WTI ($/bbl)',
            data: [71.2, 68.8, 70.1, 73.5, 70.8, 67.4, 63.1],
            borderColor: '#ff7b72',
            backgroundColor: 'rgba(255, 123, 114, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        },
        {
            label: 'Brent ($/bbl)',
            data: [74.5, 72.1, 73.6, 76.8, 74.2, 70.9, 66.4],
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        },
        {
            label: 'Dubai ($/bbl)',
            data: [73.1, 70.8, 72.4, 75.6, 72.9, 69.5, 65.0],
            borderColor: '#c6e68d',
            backgroundColor: 'rgba(198, 230, 141, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        }
    ]
};

function updateOilSubtitle() {
    const el = document.getElementById('oil-price-subtitle');
    if (!el) return;
    const last = oilPriceData.datasets.map(ds => `${ds.label.split(' ')[0]} $${ds.data[ds.data.length - 1]}`);
    el.innerText = last.join(' · ');
}

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

// 4. US Tariff Chart Data
const tariffData = {
    labels: ['China', 'Vietnam', 'Philippines', 'South Korea'],
    datasets: [{
        label: 'Expected Tariff (%)',
        data: [100, 10, 19, 0],
        backgroundColor: [
            '#ff7b72', // Critical
            '#f0883e', // Watch
            '#81d179', // Moderate
            '#00d200'  // Favorable
        ],
        borderRadius: 4
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

    // Oil Price Chart (WTI / Brent / Dubai)
    new Chart(document.getElementById('oilPriceChart').getContext('2d'), {
        type: 'line',
        data: oilPriceData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 20 }
                }
            },
            scales: {
                y: { grid: gridConfig, title: { display: true, text: 'Price ($/bbl)' } },
                x: { grid: gridConfig }
            }
        }
    });
    updateOilSubtitle();

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

    // Tariff Chart
    new Chart(document.getElementById('tariffChart').getContext('2d'), {
        type: 'bar',
        data: tariffData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            indexAxis: 'y', // Horizontal bar chart
            scales: {
                x: { grid: gridConfig, title: { display: true, text: 'Tariff Rate (%)' }, max: 120 },
                y: { grid: { display: false } }
            }
        }
    });

    // Fetch dynamic exchange data immediately on load
    fetchRealExchangeRate();
};
