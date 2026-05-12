// ============================================================
// app.js — Port Crane Global Insights
// ============================================================

// ★ Gemini API Key — 여기에 입력하세요
const GEMINI_API_KEY = 'AIzaSyAE81Xx2nc0rN5AauWXEt6_tdPTARoBCTU';

// ── TIME ──
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

// ── REFRESH ──
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
document.getElementById('refresh-btn').addEventListener('click', () => location.reload());
setInterval(() => {
    console.log("30 minutes passed. Renewing dashboard data.");
    location.reload();
}, REFRESH_INTERVAL_MS);

// ── NEWS ──
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
                    if (title.length > 60) title = title.substring(0, 60) + '...';
                    const link = item.querySelector("link").textContent;
                    linksHtml += `<li><a href="${link}" target="_blank">${title}</a></li>`;
                });
                linksHtml += '</ul>';
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>${summaryText}</h3>
                    ${linksHtml}`;
            } else {
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>관련 최신 뉴스를 찾을 수 없습니다.</h3>`;
            }
        } catch (error) {
            console.error(`Failed to fetch news for ${cat.query}`, error);
            const container = document.getElementById(cat.id);
            if (container) {
                container.innerHTML = `
                    <span class="news-category ${cat.tagClass}">${cat.tagText}</span>
                    <h3>뉴스를 불러오는 중 오류가 발생했습니다.</h3>`;
            }
        }
    }
    if (btn) btn.innerText = '🔄 News Refresh';
}

document.getElementById('refresh-news-btn')?.addEventListener('click', updateNews);
updateNews();

// ── CHART DEFAULTS ──
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = "'Inter', sans-serif";
const gridConfig = { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false };

// ── 1. EXCHANGE RATE ──
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
        borderWidth: 2, fill: true, tension: 0.4,
        pointBackgroundColor: '#001a66', pointBorderColor: '#00d200', pointHoverRadius: 6
    }]
};

async function fetchRealExchangeRate() {
    try {
        const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW');
        const data = await response.json();
        if (data && data.rates && data.rates.KRW) {
            updateExchangeRateUI(Math.round(data.rates.KRW));
        } else throw new Error("Invalid API Response");
    } catch (error) {
        console.warn("Exchange rate fallback.", error);
        updateExchangeRateUI(1488);
    }
}

function updateExchangeRateUI(rate) {
    const subtitleEl = document.getElementById('exchange-rate-subtitle');
    if (subtitleEl) subtitleEl.innerText = `Current Rate: ${rate.toLocaleString()} KRW (Today)`;
    if (krwChartInstance) {
        const arr = krwChartInstance.data.datasets[0].data;
        arr[arr.length - 1] = rate;
        krwChartInstance.update();
    }
}

// ── 2. OIL PRICES ──
let oilChartInstance = null;
const oilPriceData = {
    labels: ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'May 26'],
    datasets: [
        { label: 'WTI',   data: [70.5, 68.2, 70.0, 74.3, 70.8, 82.0, 98.1],  borderColor: '#ff7b72', backgroundColor: 'rgba(255,123,114,0.08)', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 3, pointHoverRadius: 6 },
        { label: 'Brent', data: [74.0, 71.5, 73.2, 77.1, 74.5, 86.0, 104.2], borderColor: '#f0883e', backgroundColor: 'rgba(240,136,62,0.08)',  borderWidth: 2, fill: false, tension: 0.4, pointRadius: 3, pointHoverRadius: 6 },
        { label: 'Dubai', data: [72.8, 70.4, 71.9, 75.8, 73.2, 84.5, 102.8], borderColor: '#c6e68d', backgroundColor: 'rgba(198,230,141,0.08)', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 3, pointHoverRadius: 6 }
    ]
};

async function fetchRealOilPrices() {
    let wti = null, brent = null;
    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/CL%3DF?interval=1d&range=1d';
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(7000) });
        const json = await res.json();
        const parsed = JSON.parse(json.contents);
        const price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && price > 20 && price < 300) wti = price;
    } catch (e) { console.warn('[Oil] WTI fetch failed:', e.message); }

    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d';
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(7000) });
        const json = await res.json();
        const parsed = JSON.parse(json.contents);
        const price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && price > 20 && price < 300) brent = price;
    } catch (e) { console.warn('[Oil] Brent fetch failed:', e.message); }

    if (wti && brent) {
        const dubai = parseFloat((brent - 1.4).toFixed(1));
        wti   = parseFloat(wti.toFixed(1));
        brent = parseFloat(brent.toFixed(1));
        if (oilChartInstance) {
            const ds = oilChartInstance.data.datasets;
            const li = ds[0].data.length - 1;
            ds[0].data[li] = wti; ds[1].data[li] = brent; ds[2].data[li] = dubai;
            oilChartInstance.update();
        }
        updateOilSubtitle(wti, brent, dubai, true);
        console.log(`[Oil] Live — WTI:$${wti} Brent:$${brent} Dubai:$${dubai}`);
    } else {
        const ds = oilPriceData.datasets;
        updateOilSubtitle(ds[0].data[ds[0].data.length-1], ds[1].data[ds[1].data.length-1], ds[2].data[ds[2].data.length-1], false);
    }
}

function updateOilSubtitle(wti, brent, dubai, isLive) {
    const el = document.getElementById('oil-price-subtitle');
    if (!el) return;
    el.innerText = `WTI $${wti} · Brent $${brent} · Dubai $${dubai}${isLive ? ' (live)' : ' (cached)'}`;
}

// ── 3. SCFI ──
const scfiData = {
    labels: ['Apr 25','Jun 25','Aug 25','Oct 25','Dec 25','Feb 26','Mar 26'],
    datasets: [{ label: 'SCFI Index Value', data: [2000,2240,1644,1400,1200,1595,1710], borderColor: '#00a01e', borderWidth: 2, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#00a01e' }]
};

// ── 4. TARIFF ──
const tariffData = {
    labels: ['China', 'Vietnam', 'Philippines', 'South Korea'],
    datasets: [{ label: 'Effective Tariff (%)', data: [35, 10, 10, 10], backgroundColor: ['#ff7b72','#f0883e','#81d179','#00d200'], borderRadius: 4 }]
};

// ── GEMINI AI ANALYSIS ──
async function runGeminiAnalysis() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('[Gemini] API Key가 설정되지 않았습니다. app.js 상단의 GEMINI_API_KEY를 입력하세요.');
        return;
    }

    const outputEl = document.getElementById('ai-output');
    const btn = document.getElementById('btn-ai-refresh');
    if (btn) { btn.disabled = true; btn.textContent = '분석 중...'; }

    if (outputEl) outputEl.innerHTML = `
        <div class="ai-loading">
          <div class="ai-spinner"></div>
          Gemini가 HTS 8426.19 관세 데이터를 분석하고 있습니다...
        </div>`;

    // 현재 유가 값 가져오기 (차트 마지막 값)
    const ds = oilChartInstance ? oilChartInstance.data.datasets : oilPriceData.datasets;
    const wtiNow   = ds[0].data[ds[0].data.length - 1];
    const brentNow = ds[1].data[ds[1].data.length - 1];

    const prompt = `당신은 항만 크레인 산업 전문 무역 분석가입니다.
아래 최신 데이터를 바탕으로 HD현대 크레인 사업팀을 위한 실시간 관세 분석을 수행해주세요.

[HTS 8426.19 — STS/갠트리 크레인 미국 수입 관세 현황 (${new Date().toLocaleDateString('ko-KR')} 기준)]
- 중국: MFN 0% + Section 301 25% + Section 122 10% = 실효 약 35%
  · STS 크레인 Section 301 특별 지정 (2024.09), 임시 면제 2026.05.14 만료
- 베트남: MFN 0% + Section 122 10% = 실효 약 10% (원산지 우회 시 Section 301 위험)
- 필리핀: MFN 0% + Section 122 10% = 실효 약 10%
- 한국(HD현대): MFN 0% + Section 122 10% = 실효 약 10%, KORUS FTA 시 0% 가능
- Section 122 만료 예정: 2026년 7월 24일
- Section 301 신규 조사 개시: 2026년 3월 (16개국 산업 과잉생산 관련)

[시장 현황]
- 현재 유가: WTI $${wtiNow}, Brent $${brentNow} (호르무즈 분쟁으로 급등)
- 미국 Port Security 법안: ZPMC 등 중국산 크레인 교체 수요 발생
- HD현대: 한국 기반 대형 STS 크레인 제조사

다음 3가지 관점에서 각각 구체적으로 2-3문장씩 분석해주세요.
반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):

{
  "competitive_advantage": {
    "title": "경쟁 우위",
    "content": "분석 내용"
  },
  "risk": {
    "title": "주요 리스크",
    "content": "분석 내용"
  },
  "opportunity": {
    "title": "사업 기회",
    "content": "분석 내용"
  },
  "verdict": "종합 판단 (2-3문장, HD현대에 대한 구체적 액션 아이템 포함)"
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('응답 형식 오류');
        const result = JSON.parse(jsonMatch[0]);

        if (outputEl) outputEl.innerHTML = `
          <div class="ai-grid">
            <div class="ai-card">
              <div class="ai-card-head"><div class="ai-dot green"></div><span class="ai-card-title">🟢 ${result.competitive_advantage.title}</span></div>
              <div class="ai-card-body">${result.competitive_advantage.content}</div>
            </div>
            <div class="ai-card">
              <div class="ai-card-head"><div class="ai-dot yellow"></div><span class="ai-card-title">🟡 ${result.risk.title}</span></div>
              <div class="ai-card-body">${result.risk.content}</div>
            </div>
            <div class="ai-card">
              <div class="ai-card-head"><div class="ai-dot blue"></div><span class="ai-card-title">🔵 ${result.opportunity.title}</span></div>
              <div class="ai-card-body">${result.opportunity.content}</div>
            </div>
          </div>
          <div class="ai-verdict"><strong>✦ 종합 판단:</strong> ${result.verdict}</div>`;

        const ts = document.getElementById('ai-timestamp');
        if (ts) ts.textContent = `업데이트: ${new Date().toLocaleTimeString('ko-KR')} · gemini-1.5-flash`;
        console.log('[Gemini] Analysis complete.');

    } catch (e) {
        console.error('[Gemini] Error:', e);
        if (outputEl) outputEl.innerHTML = `<div class="ai-error">⚠ 분석 실패: ${e.message}</div>`;
    }

    if (btn) { btn.disabled = false; btn.textContent = '▶ 재분석'; }
}

// ── INIT CHARTS ──
window.onload = function () {

    krwChartInstance = new Chart(document.getElementById('exchangeRateChart').getContext('2d'), {
        type: 'line', data: krwData,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()} KRW` } } },
            scales: { y: { grid: gridConfig, min: 1350 }, x: { grid: gridConfig } }
        }
    });

    oilChartInstance = new Chart(document.getElementById('oilPriceChart').getContext('2d'), {
        type: 'line', data: oilPriceData,
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 20 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(1)}/bbl` } }
            },
            scales: { y: { grid: gridConfig, title: { display: true, text: 'Price ($/bbl)' } }, x: { grid: gridConfig } }
        }
    });

    new Chart(document.getElementById('scfiChart').getContext('2d'), {
        type: 'line', data: scfiData,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: gridConfig, min: 1000 }, x: { grid: gridConfig } }
        }
    });

    new Chart(document.getElementById('tariffChart').getContext('2d'), {
        type: 'bar', data: tariffData,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            indexAxis: 'y',
            scales: {
                x: { grid: gridConfig, title: { display: true, text: 'Effective Tariff Rate (%) — HTS 8426.19' }, max: 45, ticks: { callback: v => v + '%' } },
                y: { grid: { display: false } }
            }
        }
    });

    fetchRealExchangeRate();
    fetchRealOilPrices();
    setInterval(fetchRealOilPrices, 30 * 60 * 1000);

    // 페이지 로드 시 Gemini 분석 자동 실행
    runGeminiAnalysis();
};
