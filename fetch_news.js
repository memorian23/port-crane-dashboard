const https = require('https');

const queries = [
    { title: 'Geopolitics', q: encodeURIComponent('항만 해운 지정학 리스크') },
    { title: 'Physical AI', q: encodeURIComponent('부산항만공사 스마트 항만 AI') },
    { title: 'Abroad', q: encodeURIComponent('한국 항만 크레인 미국 수주') }
];

async function fetchNews() {
    for (const query of queries) {
        const url = `https://news.google.com/rss/search?q=${query.q}&hl=ko&gl=KR&ceid=KR:ko`;
        
        await new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`\n--- ${query.title} ---`);
                    const items = data.split('<item>').slice(1, 4); // get first 3 items
                    items.forEach(item => {
                        const titleMatch = item.match(/<title>(.*?)<\/title>/);
                        const linkMatch = item.match(/<link>(.*?)<\/link>/);
                        if (titleMatch && linkMatch) {
                            console.log(`TITLE: ${titleMatch[1]}`);
                            console.log(`LINK: ${linkMatch[1]}`);
                        }
                    });
                    resolve();
                });
            });
        });
    }
}

fetchNews();
