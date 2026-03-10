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
        // We will click both the tuning mode buttons and extract again
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            if (els.length > 0) {
                for (let el of els) {
                    try { el.click(); } catch (e) { }
                }
            }
        }, mode);

        await new Promise(r => setTimeout(r, 4000));

        const seriesData = await page.evaluate(() => {
            let extracted = [];
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
            if (window.Highcharts && window.Highcharts.charts) {
                for (const chart of window.Highcharts.charts) {
                    if (chart && chart.series) {
                        extracted.push(...chart.series.map(s => ({
                            name: s.name,
                            data: Array.isArray(s.data) ? s.data.map(p => [p.x, p.y]) : []
                        })));
                    }
                }
            }
            return extracted;
        });

        if (seriesData && seriesData.length > 0) {
            console.log(`Extracted ${seriesData.length} series in ${mode} mode.`);
            for (const s of seriesData) {
                if (s.data && s.data.length > 20 && s.name && typeof s.name === 'string') {
                    // Normalize the name to handle the colon splitting for the file 
                    let safeName = s.name.replace(/[:\\/*?|<>]/g, '_');
                    if (s.name.includes("SPL(dB)")) {
                        // Keep explicit track if it matches our targets
                        safeName = s.name.replace(":", " ").replace(/[:\\/*?|<>]/g, '_');
                    }

                    const filePath = path.join(outDir, `${safeName}.csv`);
                    let csv = 'frequency,raw\n';
                    let validPoints = 0;

                    for (const pt of s.data) {
                        if (Array.isArray(pt) && pt.length >= 2) {
                            csv += `${pt[0]},${pt[1]}\n`; validPoints++;
                        } else if (pt && pt.value && Array.isArray(pt.value) && pt.value.length >= 2) {
                            csv += `${pt.value[0]},${pt.value[1]}\n`; validPoints++;
                        } else if (pt && pt.x !== undefined && pt.y !== undefined) {
                            csv += `${pt.x},${pt.y}\n`; validPoints++;
                        }
                    }
                    if (validPoints > 20) {
                        fs.writeFileSync(filePath, csv);
                        console.log(`Saved ${filePath} with ${validPoints} points`);
                    }
                }
            }
        }
    }
    await browser.close();
    console.log('Finished DOM scraping.');
})();
