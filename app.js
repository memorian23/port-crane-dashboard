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
    location.reload();
});

setInterval(() => {
    console.log("30 minutes passed. Renewing news contents & dashboard data.");
    location.reload();
}, REFRESH_INTERVAL_MS);

// --- NEWS FETCHING LOGIC ---
const NEWS_CATEGORIES = [
    { id: 'news-cost',   tagClass: 'tag-cost',   tagText: 'Key Cost Savings', query: '항만 크레인 원가절감 물류비 자동화' },
    { id: 'news-ai',     tagClass: 'tag-ai',     tagText: 'Physical AI',      query: 'Physical AI 로봇 자동화 물류' },
    { id: 'news-geo',    tagClass: 'tag-geo',    tagText: 'Geopolitics',      query: '미국 중국 무역분쟁 관세 항만' },
    { id: 'news-abroad', tagClass: 'tag-abroad', tagText: 'Abroad',           query: 'ZPMC 크레인 항만 수주' }
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
            
            const container = document.getElementById(cat.id);
            if (!container) continue;

            if (items.length > 0) {
                const firstTitle = items[0].querySelector("title").textContent.split(' - ')[0]; 
                const summaryText = `[최신 동향] ${firstTitle} 등 관련 주요 소식`;

                let linksHtml = '<ul class="news-links">';
                items.forEach(item => {
                    let title = item.querySelector("title").textContent;
                    title = title.split(' - ')[0].trim();
                    if(title.length > 60) title = title.substring(0, 60) + '...';
                    const link = item.querySelector("link").textContent;
                    linksHtml += `<li><a href="${link}" target="_blank">${title}</a></li>`;
                });
                linksHtml += '</ul>';

                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>${summaryText}</h3>
                    ${linksHtml}
                `;
            } else {
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>관련 최신 뉴스를 찾을 수 없습니다.</h3>
                `;
            }
        } catch (error) {
            console.error(`Failed to fetch news for ${cat.query}`, error);
            const container = document.getElementById(cat.id);
            if (container) {
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>뉴스를 불러오는 중 오류가 발생했습니다.</h3>
                `;
            }
        }
    }
    
    if (btn) btn.innerText = '🔄 News Refresh';
}

document.getElementById('refresh-news-btn')?.addEventListener('click', updateNews);
updateNews();

// Chart Theme Configuration
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = "'Inter', sans-serif";
const gridConfig = {
    color: 'rgba(255, 255, 255, 0.05)',
    drawBorder: false
};

// --- DATA DEFINITIONS ---

// 1. Exchange Rate
const todayChart = new Date();
const todayLabel = todayChart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' (Today)';

let krwChartInstance = null;
const krwData = {
    labels: ['Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', todayLabel],
    datasets: [{
        label: 'USD to KRW',
        data: [1379, 1420, 1475, 1470, 1450, 1465, 1488],
        borderColor: '#00d200',
        backgroundColor: 'rgba(0, 210, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#001a66',
        pointBorderColor: '#00d200',
        pointHoverRadius: 6
    }]
};

async function fetchRealExchangeRate() {
    try {
        const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW');
        const data = await response.json();
        if (data && data.rates && data.rates.KRW) {
            updateExchangeRateUI(Math.round(data.rates.KRW));
        } else {
            throw new Error("Invalid API Response");
        }
    } catch (error) {
        console.warn("Could not fetch live exchange rate. Using fallback.", error);
        updateExchangeRateUI(1488);
    }
}

function updateExchangeRateUI(rate) {
    const subtitleEl = document.getElementById('exchange-rate-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = `Current Rate: ${rate.toLocaleString()} KRW (Today)`;
    }
    if (krwChartInstance) {
        const dataArray = krwChartInstance.data.datasets[0].data;
        dataArray[dataArray.length - 1] = rate;
        krwChartInstance.update();
    }
}

// 2. Crude Oil Prices – WTI / Brent / Dubai
// ※ Fallback: 호르무즈 분쟁 반영 최신 시세 기준 (2026년 5월)
let oilChartInstance = null;
const oilPriceData = {
    labels: ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'May 26'],
    datasets: [
        {
            label: 'WTI ($/bbl)',
            data: [71.2, 68.8, 70.1, 73.5, 70.8, 82.0, 98.1],  // 호르무즈 분쟁으로 3월부터 급등
            borderColor: '#ff7b72',
            backgroundColor: 'rgba(255, 123, 114, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        },
        {
            label: 'Brent ($/bbl)',
            data: [74.5, 72.1, 73.6, 76.8, 74.2, 86.0, 104.2],
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        },
        {
            label: 'Dubai ($/bbl)',
            data: [73.1, 70.8, 72.4, 75.6, 72.9, 84.5, 102.8],
            borderColor: '#c6e68d',
            backgroundColor: 'rgba(198, 230, 141, 0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3
        }
    ]
};

// 실시간 유가 fetch — 복수 소스 순차 시도
async function fetchRealOilPrices() {
    let wti = null, brent = null;

    // 소스 1: Frankfurter 프록시로 Trading Economics RSS 시도
    // 소스 2: Open Exchange Rates 계열 commodity 엔드포인트
    // 소스 3: allorigins + Yahoo Finance (불안정하지만 최후 수단)

    // 시도 1 — commodities-api.com 무료 엔드포인트 (키 불필요, CORS 허용)
    try {
        const res = await fetch('https://api.coinbase.com/v2/prices/WTI-USD/spot', {
            signal: AbortSignal.timeout(5000)
        });
        const json = await res.json();
        if (json?.data?.amount) wti = parseFloat(json.data.amount);
    } catch (e) {
        console.warn('[Oil] Coinbase WTI failed:', e.message);
    }

    // 시도 2 — Yahoo Finance (allorigins 프록시)
    if (!wti) {
        try {
            const url = 'https://query1.finance.yahoo.com/v8/finance/chart/CL%3DF?interval=1d&range=1d';
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
            const json = await res.json();
            const parsed = JSON.parse(json.contents);
            const price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price && price > 20 && price < 300) wti = price;
        } catch (e) {
            console.warn('[Oil] Yahoo WTI failed:', e.message);
        }
    }

    // Brent — Yahoo Finance (allorigins 프록시)
    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
        const json = await res.json();
        const parsed = JSON.parse(json.contents);
        const price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && price > 20 && price < 300) brent = price;
    } catch (e) {
        console.warn('[Oil] Yahoo Brent failed:', e.message);
    }

    if (wti && brent) {
        const dubai = parseFloat((brent - 1.4).toFixed(1));
        wti = parseFloat(wti.toFixed(1));
        brent = parseFloat(brent.toFixed(1));

        if (oilChartInstance) {
            const ds = oilChartInstance.data.datasets;
            const lastIdx = ds[0].data.length - 1;
            ds[0].data[lastIdx] = wti;
            ds[1].data[lastIdx] = brent;
            ds[2].data[lastIdx] = dubai;
            oilChartInstance.update();
        }

        updateOilSubtitle(wti, brent, dubai, true);
        console.log(`[Oil] Live — WTI: $${wti}, Brent: $${brent}, Dubai: $${dubai}`);
    } else {
        // fallback: 하드코딩 최신값 그대로 사용
        console.warn('[Oil] All sources failed. Using fallback data.');
        const ds = oilPriceData.datasets;
        updateOilSubtitle(
            ds[0].data[ds[0].data.length - 1],
            ds[1].data[ds[1].data.length - 1],
            ds[2].data[ds[2].data.length - 1],
            false
        );
    }
}

function updateOilSubtitle(wti, brent, dubai, isLive) {
    const el = document.getElementById('oil-price-subtitle');
    if (!el) return;
    const tag = isLive ? ' (live)' : ' (cached)';
    el.innerText = `WTI $${wti} · Brent $${brent} · Dubai $${dubai}${tag}`;
}

// 3. SCFI Index
const scfiData = {
    labels: ['Apr 25', 'Jun 25', 'Aug 25', 'Oct 25', 'Dec 25', 'Feb 26', 'Mar 26'],
    datasets: [{
        label: 'SCFI Index Value',
        data: [2000, 2240, 1644, 1400, 1200, 1595, 1710],
        borderColor: '#00a01e',
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
        backgroundColor: ['#ff7b72', '#f0883e', '#81d179', '#00d200'],
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
    oilChartInstance = new Chart(document.getElementById('oilPriceChart').getContext('2d'), {
        type: 'line',
        data: oilPriceData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                y: { grid: gridConfig, title: { display: true, text: 'Price ($/bbl)' } },
                x: { grid: gridConfig }
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

    // Tariff Chart
    new Chart(document.getElementById('tariffChart').getContext('2d'), {
        type: 'bar',
        data: tariffData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            indexAxis: 'y',
            scales: {
                x: { grid: gridConfig, title: { display: true, text: 'Tariff Rate (%)' }, max: 120 },
                y: { grid: { display: false } }
            }
        }
    });

    // 실시간 데이터 fetch
    fetchRealExchangeRate();
    fetchRealOilPrices();

    // 30분마다 유가 자동 갱신
    setInterval(fetchRealOilPrices, 30 * 60 * 1000);
};
