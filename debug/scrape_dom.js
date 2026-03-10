const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting for charts...');
    await new Promise(r => setTimeout(r, 6000));

    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];

    for (const mode of modes) {
        console.log(`Clicking ${mode}...`);
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            if (els.length > 0) {
                try { els[els.length - 1].click(); } catch (e) { }
            }
        }, mode);

        await new Promise(r => setTimeout(r, 3000));

        // Try to get chart data from ECharts instance or any window object
        const seriesData = await page.evaluate(() => {
            let extracted = [];
            // Try echarts
            if (window.echarts) {
                const doms = document.querySelectorAll('div[_echarts_instance_]');
                for (const dom of doms) {
                    try {
                        const inst = window.echarts.getInstanceByDom(dom);
                        if (inst) {
                            const opt = inst.getOption();
                            if (opt && opt.series) {
                                extracted.push(...opt.series.map(s => ({
                                    name: s.name,
                                    data: s.data || s.dataset || []
                                })));
                            }
                        }
                    } catch (e) { }
                }
            }
            // Try Highcharts
            if (window.Highcharts) {
                for (const chart of window.Highcharts.charts) {
                    if (chart && chart.series) {
                        extracted.push(...chart.series.map(s => ({
                            name: s.name,
                            data: s.data.map(p => [p.x, p.y])
                        })));
                    }
                }
            }
            // Search other common places
            // If they use Umi/React, data might be in __NEXT_DATA__ or __INITIAL_STATE__
            // but since the chart is rendering the dots, we just read the chart library.
            return extracted;
        });

        if (seriesData && seriesData.length > 0) {
            console.log(`Extracted ${seriesData.length} series in ${mode} mode.`);
            for (const s of seriesData) {
                if (s.data && s.data.length > 20 && s.name && typeof s.name === 'string') {
                    // Check if it's one of our targets or if it contains the SPL string
                    // Just save them all to see what we get!
                    const fileName = `${s.name.replace(/[:\\/*?|<>]/g, '_')}.csv`;
                    const filePath = `${__dirname}/output/${fileName}`;

                    let csv = 'frequency,raw\n';
                    let validPoints = 0;
                    for (const pt of s.data) {
                        if (Array.isArray(pt) && pt.length >= 2) {
                            csv += `${pt[0]},${pt[1]}\n`;
                            validPoints++;
                        } else if (pt && pt.value && Array.isArray(pt.value) && pt.value.length >= 2) { // echarts object format
                            csv += `${pt.value[0]},${pt.value[1]}\n`;
                            validPoints++;
                        } else if (pt && pt.x !== undefined && pt.y !== undefined) {
                            csv += `${pt.x},${pt.y}\n`;
                            validPoints++;
                        }
                    }
                    if (validPoints > 20) {
                        // Node fs runs inside Puppeteer Node environment, wait context is page context so fs doesn't work there. I return it back to Node layer.
                    }
                }
            }
        }
    }
    await browser.close();
})();
