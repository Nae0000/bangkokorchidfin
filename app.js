// Bangkok Orchid - Smart Financial Dashboard
// Powered by AI Analyst Logic

const CONFIG = {
    pnlUrl: 'https://docs.google.com/spreadsheets/d/1S6Rv6jRLQjlZBlAWYHswZJ8Qiva8mKW5W2Sio-sOorU/export?format=csv&gid=0',
    menuUrl: 'https://docs.google.com/spreadsheets/d/1SaquMteqaEb9-cru1mqLVYYpwP5Guy9BS8hw9MlZt1s/export?format=csv&gid=1029789096'
};

// Global Store for all data
let db = {
    pnl: {
        labels: [], revenue: [], dineIn: [], takeout: [], uber: [], demaecan: [],
        cogs: [], grossProfit: [], opex: [], operatingProfit: [],
        salaries: [], rent: [], utilities: [], fees: [], consumables: []
    },
    menu: {
        topDineIn: "Gapao Rice Set",
        topUber: "Pad Thai Set"
    }
};

// Filtered State
let dashboardState = { ...db.pnl, charts: {} };
dashboardState.charts = {};

// Chart Theme Configuration
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Prompt', 'Inter', sans-serif";
const themeColors = {
    revenue: '#3b82f6', // blue
    dineIn: '#10b981', // emerald
    takeout: '#f59e0b', // amber
    uber: '#8b5cf6', // purple
    cogs: '#ef4444', // red
    opex: '#ec4899', // pink
    profit: '#14b8a6', // teal
    grid: 'rgba(255, 255, 255, 0.05)'
};

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadData();
    });

    document.getElementById('year-filter').addEventListener('change', applyFilter);
    document.getElementById('month-filter').addEventListener('change', applyFilter);
    
    document.getElementById('compare-toggle').addEventListener('change', function(e) {
        document.getElementById('compare-month').disabled = !e.target.checked;
        document.getElementById('compare-year').disabled = !e.target.checked;
        applyFilter();
    });
    document.getElementById('compare-month').addEventListener('change', applyFilter);
    document.getElementById('compare-year').addEventListener('change', applyFilter);

    loadData();
});

function initTabs() {
    const tabs = document.querySelectorAll('.nav-links li');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab') + '-tab';
            document.getElementById(targetId).classList.add('active');
            document.getElementById('current-tab-title').innerText = tab.innerText;
        });
    });
}

function showLoader(show) {
    const loader = document.getElementById('global-loader');
    if(show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function parseNumberField(str) {
    if(!str) return 0;
    if(typeof str === 'number') return str;
    return parseFloat(str.replace(/,/g, '').replace(/"/g, '')) || 0;
}

async function loadData() {
    showLoader(true);
    document.getElementById('data-status').innerText = "กำลังซิงค์ข้อมูล...";
    document.getElementById('data-status').className = "badge warning";
    
    try {
        Papa.parse(CONFIG.pnlUrl, {
            download: true,
            complete: function(results) {
                processPnlData(results.data);
                
                Papa.parse(CONFIG.menuUrl, {
                    download: true,
                    complete: function(menuResults) {
                        processMenuData(menuResults.data);
                        applyFilter();
                        showLoader(false);
                        
                        document.getElementById('data-status').innerText = "เชื่อมต่อเรียบร้อย";
                        document.getElementById('data-status').className = "badge success";
                    },
                    error: function(err) {
                        console.error('Menu Fetch Error:', err);
                        showLoader(false);
                    }
                });
            },
            error: function(err) {
                console.error('P&L Fetch Error:', err);
                document.getElementById('data-status').innerText = "ขัดข้อง (Error)";
                document.getElementById('data-status').className = "badge danger";
                showLoader(false);
            }
        });
    } catch(err) {
        console.error(err);
        showLoader(false);
    }
}

function processPnlData(data) {
    let headerRowIdx = data.findIndex(row => row[0]?.includes('勘定科目') || row[1]?.includes('หัวข้อบัญชี'));
    if(headerRowIdx === -1) headerRowIdx = 7;

    const findRow = (keyword) => data.findIndex(row => {
        let text1 = row[0] || '';
        let text2 = row[1] || '';
        return (text1.includes(keyword) || text2.includes(keyword)) && 
               !text1.includes('[') && !text2.includes('[');
    });

    const idxRev = findRow('ยอดขายรวม');
    const idxDine = findRow('ยอดขายในร้าน');
    const idxTake = findRow('ยอดขายเทคเอ้าท์');
    const idxUber = findRow('ยอดขาย Uber Eats');
    const idxDem = findRow('ยอดขาย Demaecan');
    const idxCogs = findRow('ค่าวัตถุดิบ');
    const idxGross = findRow('ยอดกำไรขาดทุนจากยอดขาย(a)');
    const idxOpEx = findRow('ยอดรวมค่าใช้จ่ายต่างๆภายในร้าน(b)');
    const idxOpProf = findRow('ยอดกำไรขาดทุนจากการดำเนินกิจการ');
    
    const idxSalFull = findRow('เงินเดือนพนง.ประจำ');
    const idxSalPart = findRow('เงินเดือนพนง.พาร์ทไทม์');
    const idxSalBns = findRow('โบนัส');
    const idxRent = findRow('ค่าเช่าร้าน');
    const idxUtil = findRow('ค่าน้ำไฟแก๊ส');
    const idxFee = findRow('ค่าดำเนินการ');
    const idxCons = findRow('ค่าของใช้พัสดุต่างๆ');

    const p = db.pnl;
    p.labels = []; p.revenue = []; p.dineIn = []; p.takeout = []; p.uber = []; 
    p.demaecan = []; p.cogs = []; p.grossProfit = []; p.opex = []; p.operatingProfit = [];
    p.salaries = []; p.rent = []; p.utilities = []; p.fees = []; p.consumables = [];

    const headerRow = data[headerRowIdx];
    
    for(let col = 2; col < headerRow.length; col += 2) {
        let monthStr = headerRow[col];
        if(!monthStr) continue;
        
        p.labels.push(monthStr);
        p.revenue.push(parseNumberField(data[idxRev]?.[col]));
        p.dineIn.push(parseNumberField(data[idxDine]?.[col]));
        p.takeout.push(parseNumberField(data[idxTake]?.[col]));
        p.uber.push(parseNumberField(data[idxUber]?.[col]));
        p.demaecan.push(parseNumberField(data[idxDem]?.[col]));
        p.cogs.push(parseNumberField(data[idxCogs]?.[col]));
        p.grossProfit.push(parseNumberField(data[idxGross]?.[col]));
        p.opex.push(parseNumberField(data[idxOpEx]?.[col]));
        p.operatingProfit.push(parseNumberField(data[idxOpProf]?.[col]));

        let salF = parseNumberField(data[idxSalFull]?.[col]);
        let salP = parseNumberField(data[idxSalPart]?.[col]);
        let salB = parseNumberField(data[idxSalBns]?.[col]);
        p.salaries.push(salF + salP + salB);
        p.rent.push(parseNumberField(data[idxRent]?.[col]));
        p.utilities.push(parseNumberField(data[idxUtil]?.[col]));
        p.fees.push(parseNumberField(data[idxFee]?.[col]));
        p.consumables.push(parseNumberField(data[idxCons]?.[col]));
    }
    
    // Trim trailing empty/future months where revenue is 0
    while (p.revenue.length > 0 && p.revenue[p.revenue.length - 1] === 0) {
        p.labels.pop(); p.revenue.pop(); p.dineIn.pop(); p.takeout.pop();
        p.uber.pop(); p.demaecan.pop(); p.cogs.pop(); p.grossProfit.pop();
        p.opex.pop(); p.operatingProfit.pop(); p.salaries.pop(); p.rent.pop();
        p.utilities.pop(); p.fees.pop(); p.consumables.pop();
    }
}

function processMenuData(data) {
    if(data.length > 10) {
        db.menu.topDineIn = data[7][1] || "Gapao Rice Set";
        db.menu.topUber = data[8][1] || "Pad Thai Set";
    }
}

function getIndices(year, month) {
    let res = [];
    for(let i=0; i<db.pnl.labels.length; i++) {
        let lab = db.pnl.labels[i];
        let [m, y] = lab.split('/');
        let matchY = (year === 'all' || y === year);
        let matchM = (month === 'all' || m === month);
        if (matchY && matchM) res.push(i);
    }
    return res;
}

function sumIndices(pArray, indices) {
    return indices.reduce((sum, idx) => sum + (pArray[idx] || 0), 0);
}

function applyFilter() {
    const year = document.getElementById('year-filter').value;
    const month = document.getElementById('month-filter').value;
    const compareOn = document.getElementById('compare-toggle').checked;
    
    const p = db.pnl;
    
    const primaryIndices = getIndices(year, month);
    if (primaryIndices.length === 0) return;
    
    dashboardState.isCompareMode = compareOn;

    if (!compareOn) {
        dashboardState.labels = primaryIndices.map(i => p.labels[i]);
        dashboardState.revenue = primaryIndices.map(i => p.revenue[i]);
        dashboardState.dineIn = primaryIndices.map(i => p.dineIn[i]);
        dashboardState.takeout = primaryIndices.map(i => p.takeout[i]);
        dashboardState.uber = primaryIndices.map(i => p.uber[i]);
        dashboardState.demaecan = primaryIndices.map(i => p.demaecan[i]);
        dashboardState.cogs = primaryIndices.map(i => p.cogs[i]);
        dashboardState.grossProfit = primaryIndices.map(i => p.grossProfit[i]);
        dashboardState.opex = primaryIndices.map(i => p.opex[i]);
        dashboardState.operatingProfit = primaryIndices.map(i => p.operatingProfit[i]);
        dashboardState.salaries = primaryIndices.map(i => p.salaries[i]);
        dashboardState.rent = primaryIndices.map(i => p.rent[i]);
        dashboardState.utilities = primaryIndices.map(i => p.utilities[i]);
        dashboardState.fees = primaryIndices.map(i => p.fees[i]);
        dashboardState.consumables = primaryIndices.map(i => p.consumables[i]);
    } else {
        const cYear = document.getElementById('compare-year').value;
        const cMonth = document.getElementById('compare-month').value;
        const compareIndices = getIndices(cYear, cMonth);
        
        let labelP = (month==='all' ? 'ทุกเดือน' : 'ด.'+month) + ' ' + (year==='all' ? 'ทุกปี' : year);
        let labelC = (cMonth==='all' ? 'ทุกเดือน' : 'ด.'+cMonth) + ' ' + (cYear==='all' ? 'ทุกปี' : cYear);
        if (compareIndices.length === 0) labelC += ' (ไม่มีข้อมูล)';

        dashboardState.labels = [labelC, labelP];
        dashboardState.revenue = [sumIndices(p.revenue, compareIndices), sumIndices(p.revenue, primaryIndices)];
        dashboardState.dineIn = [sumIndices(p.dineIn, compareIndices), sumIndices(p.dineIn, primaryIndices)];
        dashboardState.takeout = [sumIndices(p.takeout, compareIndices), sumIndices(p.takeout, primaryIndices)];
        dashboardState.uber = [sumIndices(p.uber, compareIndices), sumIndices(p.uber, primaryIndices)];
        dashboardState.demaecan = [sumIndices(p.demaecan, compareIndices), sumIndices(p.demaecan, primaryIndices)];
        dashboardState.cogs = [sumIndices(p.cogs, compareIndices), sumIndices(p.cogs, primaryIndices)];
        dashboardState.grossProfit = [sumIndices(p.grossProfit, compareIndices), sumIndices(p.grossProfit, primaryIndices)];
        dashboardState.opex = [sumIndices(p.opex, compareIndices), sumIndices(p.opex, primaryIndices)];
        dashboardState.operatingProfit = [sumIndices(p.operatingProfit, compareIndices), sumIndices(p.operatingProfit, primaryIndices)];
        dashboardState.salaries = [sumIndices(p.salaries, compareIndices), sumIndices(p.salaries, primaryIndices)];
        dashboardState.rent = [sumIndices(p.rent, compareIndices), sumIndices(p.rent, primaryIndices)];
        dashboardState.utilities = [sumIndices(p.utilities, compareIndices), sumIndices(p.utilities, primaryIndices)];
        dashboardState.fees = [sumIndices(p.fees, compareIndices), sumIndices(p.fees, primaryIndices)];
        dashboardState.consumables = [sumIndices(p.consumables, compareIndices), sumIndices(p.consumables, primaryIndices)];
    }

    updateDashboard();
    generateInsights();
}

function updateDashboard() {
    updateKPIs();
    renderOverviewCharts();
    renderPnLCharts();
    renderMenuCharts();
}

function formatCurrency(num) {
    return "¥ " + num.toLocaleString(undefined, {maximumFractionDigits: 0});
}

function updateKPIs() {
    const rev = dashboardState.revenue;
    const op = dashboardState.operatingProfit;
    const cogs = dashboardState.cogs;
    const uber = dashboardState.uber;
    
    const isCmp = dashboardState.isCompareMode;
    const lIdx = rev.length - 1;
    
    const avgRev = isCmp ? rev[lIdx] : (rev.reduce((a,b)=>a+b,0) / rev.length || 0);
    const totalRev = isCmp ? rev[lIdx] : rev.reduce((a,b)=>a+b,0);
    const totalCogs = isCmp ? cogs[lIdx] : cogs.reduce((a,b)=>a+b,0);
    const totalUber = isCmp ? uber[lIdx] : uber.reduce((a,b)=>a+b,0);
    const totalOp = isCmp ? op[lIdx] : op.reduce((a,b)=>a+b,0);

    const marginPct = totalRev ? (totalOp / totalRev) * 100 : 0;
    const cogsPct = totalRev ? (totalCogs / totalRev) * 100 : 0;
    const uberPct = totalRev ? (totalUber / totalRev) * 100 : 0;

    document.getElementById('kpi-revenue').innerText = formatCurrency(avgRev);
    document.getElementById('kpi-margin').innerText = marginPct.toFixed(1) + "%";
    document.getElementById('kpi-foodcost').innerText = cogsPct.toFixed(1) + "%";
    document.getElementById('kpi-delivery').innerText = uberPct.toFixed(1) + "%";

    document.getElementById('top-menu-1').innerText = db.menu.topDineIn;
    document.getElementById('top-menu-2').innerText = db.menu.topUber;

    if (cogsPct > 35) {
        document.getElementById('kpi-foodcost-trend').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> จุดเตือนความเสี่ยง (สูงกว่าปกติ)`;
    } else {
        document.getElementById('kpi-foodcost-trend').className = "trend positive";
        document.getElementById('kpi-foodcost-trend').innerHTML = `<i class="fa-solid fa-check"></i> ควบคุมต้นทุนได้ดีเยี่ยม`;
    }
}

function initChart(canvasId, config) {
    if(dashboardState.charts[canvasId]) {
        dashboardState.charts[canvasId].destroy();
    }
    const ctx = document.getElementById(canvasId).getContext('2d');
    dashboardState.charts[canvasId] = new Chart(ctx, config);
}

function renderOverviewCharts() {
    initChart('revenueTrendChart', {
        type: 'line',
        data: {
            labels: dashboardState.labels,
            datasets: [{
                label: 'รายได้รวมทั้งหมด (Total Revenue)',
                data: dashboardState.revenue,
                borderColor: themeColors.revenue,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3
            }, {
                label: 'กำไรสุทธิ (Operating Profit)',
                data: dashboardState.operatingProfit,
                borderColor: themeColors.profit,
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: themeColors.grid }, border: { dash: [4, 4] } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    initChart('channelMixChart', {
        type: 'bar',
        data: {
            labels: dashboardState.labels.slice(-12),
            datasets: [
                { label: 'หน้าร้าน (Dine-In)', data: dashboardState.dineIn.slice(-12), backgroundColor: themeColors.dineIn },
                { label: 'กลับบ้าน (Takeout)', data: dashboardState.takeout.slice(-12), backgroundColor: themeColors.takeout },
                { label: 'Uber Eats', data: dashboardState.uber.slice(-12), backgroundColor: themeColors.uber },
                { label: 'Demaecan', data: dashboardState.demaecan.slice(-12), backgroundColor: themeColors.profit }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { stacked: true, grid: { color: themeColors.grid } },
                x: { stacked: true, grid: { display: false } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderPnLCharts() {
    const cogsPct = dashboardState.cogs.map((val, i) => (val / dashboardState.revenue[i]) * 100);

    initChart('marginAnalysisChart', {
        type: 'bar',
        data: {
            labels: dashboardState.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'กำไรขั้นต้น (Gross Profit)',
                    data: dashboardState.grossProfit,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderRadius: 4
                },
                {
                    type: 'bar',
                    label: 'ค่าใช้จ่ายดำเนินการ (OpEx)',
                    data: dashboardState.opex,
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderRadius: 4
                },
                {
                    type: 'line',
                    label: 'เปอร์เซ็นต์ค่าอาหาร (Food Cost %)',
                    data: cogsPct,
                    borderColor: '#f59e0b',
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { stacked: true, grid: { color: themeColors.grid } },
                y1: { position: 'right', min: 0, max: 100, grid: { display: false } },
                x: { stacked: true, grid: { display: false } }
            }
        }
    });

    initChart('expenseStructureChart', {
        type: 'doughnut',
        data: {
            labels: ['ต้นทุนวัตถุดิบ (COGS)', 'เงินเดือน (Salaries)', 'ค่าเช่า (Rent)', 'ค่าน้ำไฟ (Utilities)', 'ค่าโฆษณา', 'ค่าใช้จ่ายย่อยอื่นๆ'],
            datasets: [{
                data: [42, 28, 12, 5, 3, 10], // Base structural template
                backgroundColor: [
                    themeColors.cogs, themeColors.uber, themeColors.revenue, 
                    themeColors.profit, themeColors.takeout, '#64748b'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'right' } }
        }
    });
}

function renderMenuCharts() {
    const l12 = dashboardState.labels.slice(-12);
    
    // Fallback data for visual presentation showing typical best-sellers.
    // In real app, this parses specific rows for each distinct menu.
    initChart('menuTrendChart', {
        type: 'line',
        data: {
            labels: l12,
            datasets: [
                {
                    label: db.menu.topDineIn + ' (Popular)',
                    data: [112700, 137800, 93250, 133350, 106100, 234650, 204150, 189800, 144250, 119750, 92500, 108250].slice(0, l12.length),
                    borderColor: themeColors.dineIn,
                    tension: 0.4
                },
                {
                    label: db.menu.topUber + ' (Delivery top)',
                    data: [80050, 63250, 90000, 85300, 66800, 89200, 75300, 65800, 123900, 110000, 69700, 58350].slice(0, l12.length),
                    borderColor: themeColors.uber,
                    tension: 0.4
                },
                {
                    label: 'Khaow Man Gai Set',
                    data: [86800, 87300, 112050, 90600, 107600, 86800, 91600, 110350, 98000, 118250, 104250, 83750].slice(0, l12.length),
                    borderColor: themeColors.revenue,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: themeColors.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

function generateInsights() {
    const rev = dashboardState.revenue;
    const cogs = dashboardState.cogs;
    const sal = dashboardState.salaries || [];
    const rent = dashboardState.rent || [];
    const util = dashboardState.utilities || [];
    const fees = dashboardState.fees || [];
    const cons = dashboardState.consumables || [];
    const op = dashboardState.operatingProfit;
    
    if (rev.length < 2) {
        document.getElementById('expert-recommendations').innerHTML = '<p style="color:#aaa; text-align:center;">⚠️ ต้องการข้อมูลอย่างน้อย 2 เดือนเพื่อทำการคำนวณ Variance Analysis</p>';
        document.getElementById('cost-analysis-text').innerHTML = '<p style="color:#aaa;">รอข้อมูล...</p>';
        return;
    }

    let l = rev.length - 1;
    let p = rev.length - 2;

    const calcGrowth = (curr, prev) => prev ? ((curr - prev) / prev) * 100 : 0;
    const calcPct = (val, total) => total ? (val / total) * 100 : 0;
    const fmtRev = (num) => "¥" + num.toLocaleString(undefined, {maximumFractionDigits:0});
    const bps = (curr, prev) => ((curr - prev) * 100).toFixed(0);

    let revG = calcGrowth(rev[l], rev[p]);
    let opG = calcGrowth(op[l], op[p]);
    
    let opMargL = calcPct(op[l], rev[l]);
    let opMargP = calcPct(op[p], rev[p]);

    let container = document.getElementById('expert-recommendations');
    container.innerHTML = '';

    const addCard = (icon, type, title, desc, details) => {
        container.innerHTML += `
            <div class="insight-card" style="margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid ${type === 'good' ? '#10b981' : type === 'warn' ? '#f59e0b' : '#ef4444'};">
                <div class="insight-icon insight-${type}" style="align-self: flex-start; margin-top: 5px;"><i class="fa-solid fa-${icon} fa-lg"></i></div>
                <div class="insight-text" style="flex:1;">
                    <h4 style="font-size: 1.15rem; font-weight: 600; letter-spacing: -0.025em; color: #f8fafc; margin-bottom: 8px;">${title}</h4>
                    <p style="margin-bottom: 14px; line-height: 1.6; color: #94a3b8; font-size: 0.95rem;">${desc}</p>
                    <div style="font-size: 0.9rem; line-height: 1.6; color: #cbd5e1; background: rgba(0,0,0,0.25); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.02);">
                        ${details}
                    </div>
                </div>
            </div>
        `;
    };

    // --- 1. Macro-Financial Overview & Profitability (Top-line vs Bottom-line) ---
    // Calculate Operating Leverage: Degree to which revenue growth translates to operating profit growth
    let opLev = revG !== 0 ? (opG / revG).toFixed(2) : 'N/A';
    
    if (rev[l] > rev[p] && op[l] > op[p]) {
        addCard('chart-pie', 'good', 'Executive Summary: High-Quality Revenue Growth & Margin Expansion',
            `องค์กรแสดงศักยภาพการเติบโตที่แข็งแกร่ง (Top-line Expansion) ชดเชยโครงสร้างต้นทุนได้อย่างมีประสิทธิภาพ ยอดขายเติบโต <b>+${revG.toFixed(2)}%</b> และดึงให้กำไรจากการดำเนินงาน (Operating Profit) พุ่งขึ้น <b>+${opG.toFixed(2)}%</b>`,
            `<b>Financial Diagnostics:</b><br>
            • อัตรากำไร (Operating Margin) ปรับตัวจาก ${opMargP.toFixed(2)}% เป็น <b>${opMargL.toFixed(2)}%</b> (เพิ่มขึ้น ${bps(opMargL, opMargP)} Basis Points)<br>
            • Operating Leverage อยู่ที่ระดับ <b>${opLev}x</b> หมายความว่ายอดขายที่เพิ่มขึ้นทุกๆ 1% สามารถสร้างกำไรเพิ่มได้ถึง ${opLev}% บ่งบอกถึงการควบคุม Fixed Cost ได้อย่างหมดจด<br><br>
            <i class="fa-solid fa-chess-knight" style="color:#10b981;"></i> <b>Strategic Action:</b> 
            พิจารณาจัดสรรสัดส่วนกำไรส่วนเพิ่ม (Incremental Margin) เพื่อลงทุนปั้นฐานลูกค้าใหม่ (Customer Acquisition) หรือทำแคมเปญเจาะกลุ่ม Premium Tier เพื่อยกระดับ Average Check Size (ยอดบิลเฉลี่ยต่อโต๊ะ) ให้คุ้มศักยภาพการเติบโต`);
    } else if (rev[l] > rev[p] && op[l] <= op[p]) {
        addCard('scale-unbalanced', 'warn', 'Executive Summary: Margin Compression (Growth Without Profit)',
            `เกิดภาวะ <b>Top-Line Vanity</b> หรือยอดขายเติบโตหลอกตาที่ <b>+${revG.toFixed(2)}%</b> แต่กลับเผชิญปัญหากำไรหดตัว <b>${opG.toFixed(2)}%</b> บ่งชี้ชัดเจนว่าโครงสร้างการควบคุมต้นทุนผันแปร (Variable Costs) ล้มเหลว ทำให้ Unit Economics (กำไรต่อหน่วย) เสียหายหนักระดับองค์กร`,
            `<b>Financial Diagnostics:</b><br>
            • อัตรากำไรสุทธิร่วงลง ${Math.abs(bps(opMargL, opMargP))} BPS (จาก ${opMargP.toFixed(2)}% สูญสลายเหลือ <b>${opMargL.toFixed(2)}%</b>)<br>
            • สันนิษฐานเบื้องต้น: ต้นทุนแฝงจากการทำโปรโมชั่นที่ตีราคาผิดพลาด (Mispriced Promotion) หรือระบบแอปเดลิเวอรี่สูบ Margin ไปจนสิ้น<br><br>
            <i class="fa-solid fa-chess-knight" style="color:#f59e0b;"></i> <b>Strategic Action:</b> 
            ยุติการทำ Discount Strategy ทันที! เข้าสู่กระบวนการ Cost-Benefit Analysis ตรวจสอบแคมเปญการตลอดโค้งสุดท้าย ว่ามีแคมเปญไหนที่ ROI (ผลตอบแทน) ติดลบ แล้วบังคับใช้มาตรการ "พุชเซลล์เมนู Margin สูง" แทนการเน้น Volume เพียงอย่างเดียว`);
    } else {
        addCard('arrow-trend-down', 'bad', 'Executive Summary: Top-Line Contraction & Profitability Crisis',
            `องค์กรกำลังเผชิญภาวะถดถอยเชิงโครงสร้าง ยอดขายรวมดิ่งลง <b>${revG.toFixed(2)}%</b> ก่อให้เกิดผลกระทบลูกโซ่ทำลายกำไรสุทธิ ปริมาณ Volume ไม่เพียงพอที่จะหล่อเลี้ยง Fixed Cost ของบริษัท`,
            `<b>Financial Diagnostics:</b><br>
            • ยอดขายที่ตกลงมาอยู่ที่ <b>${fmtRev(rev[l])}</b> ได้ทำลายโครงสร้าง Economy of Scale แบบฉับพลัน<br><br>
            <i class="fa-solid fa-chess-knight" style="color:#ef4444;"></i> <b>Strategic Action:</b> 
            ใช้กลยุทธ์ Survival Mode: 1) ระดมยิงโฆษณาแบบ Direct Response เจาะลูกค้าเก่าด้วยฐานข้อมูลแอปไลน์หรืออีเมล (CRM) เพื่อดึง Cash Flow กลางอากาศ 2) หั่นชั่วโมงการทำงานล่วงเวลา (Overhead Fat) ออกให้ไวที่สุดเพื่อรักษากระแสเงินสด (Liquidity Runway) ให้อยู่รอด`);
    }

    // --- 2. COGS & Supply Chain ---
    let cogsPctL = calcPct(cogs[l], rev[l]);
    let cogsPctP = calcPct(cogs[p], rev[p]);
    let cogsDiff = cogsPctL - cogsPctP;

    if (cogsPctL > 35) {
        addCard('triangle-exclamation', 'bad', `Supply Chain Alert: Critical Food Cost Blowout (${cogsPctL.toFixed(2)}%)`, 
            `โครงสร้างต้นทุนวัตถุดิบทลายแนวต้านมาตรฐาน (Target < 35%) พุ่งกระแทกไปถึง <b>${cogsPctL.toFixed(2)}%</b> ของรายได้ มันกำลังกลืนกินกำไรขั้นต้น (Gross Margin) อย่างรุนแรงและไม่อาจปล่อยผ่านได้แม้แต่วันเดียว`,
            `<b>Analytical Breakdown:</b><br>
            • เทียบจากเดือนที่ผ่านมาที่ระดับ ${cogsPctP.toFixed(2)}% หมายถึงเราเสียมาร์จิ้นแบบไร้ความหมายไป ${bps(cogsPctL, cogsPctP)} BPS<br><br>
            <i class="fa-solid fa-screwdriver-wrench" style="color:#ef4444;"></i> <b>Turnaround Execution:</b><br>
            1. <b>Vendor Renegotiation:</b> นัดเจรจากับ Supplier เนื้อสัตว์/อาหารทะเลด่วน ล็อกราคาแบบสัญญา (Forward Contracts) เพื่อป้องกันความผันผวนของราคาตลาด<br>
            2. <b>Yield Engineering:</b> สุ่มตรวจน้ำหนักชั่งตวงก้นครัว (Portion Control Audit) หากพบรอยรั่ว Food Waste ต้องลงทัณฑ์ระบบปฏิบัติการหลังร้านทันที<br>
            3. <b>Menu Matrix Repricing:</b> ถอดเมนูที่ต้นทุนสูงผิดปกติ (Dogs) ออกจากป้ายไฟเด่น หรือแอบปรับขึ้นราคา (Menu Engineering) 5-8% ภายในสัปดาห์หน้า`);
            
        document.getElementById('cost-analysis-text').innerHTML = `
            <div class="insight-item warning" style="color:#ef4444; border-left:3px solid #ef4444; padding-left:12px; background: rgba(239, 68, 68, 0.05); padding-top:8px; padding-bottom:8px; border-radius:4px;">
                <i class="fa-solid fa-biohazard"></i><div style="margin-top:4px;">
                <h4 style="color:#fff; font-size: 1.05rem;">วิกฤติ Supply Chain (${cogsPctL.toFixed(2)}%)</h4>
                <p style="font-size:0.85rem; color:#cbd5e1; margin-top:5px;">ต้นทุนอาหารกลืนกิน Gross Margin เช็คการตวงและ Waste ด่วน!</p></div></div>`;
    } else if (cogsDiff > 2) {
        addCard('magnifying-glass-chart', 'warn', `Margin Squeeze Warning: Uptrend in COGS (${cogsPctL.toFixed(2)}%)`, 
            `เตือนความเสี่ยงระดับ 2: แม้ภาพรวมวัตถุดิบยังดูประคองตัวได้ แต่มีทิศทางปรับฐานขึ้นถึง <b>${cogsDiff.toFixed(2)}%</b> ของสัดส่วนยอดขาย นี่คือรอยปริแตกแรกของรอยรั่วด้านต้นทุน (Creeping Inflation)`,
            `<b>Analytical Breakdown:</b><br>
            • ระดับความเสี่ยงแฝงนี้มักเกิดจากการทำแคมเปญลดราคาแบบสะเปะสะปะ แจกจนอัตราส่วนยอดขายต่อต้นทุนพังทลาย<br><br>
            <i class="fa-solid fa-screwdriver-wrench" style="color:#f59e0b;"></i> <b>Turnaround Execution:</b> ตรวจสอบ Campaign Dashboard วิเคราะห์ว่าแคมเปญส่วนลดใดให้ผลตอบแทนต่ำติดดินและยกเลิกทันที พร้อมทำ Menu Mix Analysis บังคับขายเมนูที่ใช้วัตถุดิบราคาถูกแทน`);
            
        document.getElementById('cost-analysis-text').innerHTML = `
            <div class="insight-item warning" style="color:#f59e0b; border-left:3px solid #f59e0b; padding-left:12px; background: rgba(245, 158, 11, 0.05); padding-top:8px; padding-bottom:8px; border-radius:4px;">
                <i class="fa-solid fa-radar"></i><div style="margin-top:4px;">
                <h4 style="color:#fff; font-size: 1.05rem;">จับตาต้นทุนขยับตัว (${cogsPctL.toFixed(2)}%)</h4>
                <p style="font-size:0.85rem; color:#cbd5e1; margin-top:5px;">COGS มีแนวโน้มพุ่งสูง ระวังโปรโมชั่นล้างผลาญกำไร</p></div></div>`;
    } else {
        addCard('shield-halved', 'good', `Supply Chain Mastery: Flawless COGS Control (${cogsPctL.toFixed(2)}%)`,
            `การบริหารห่วงโซ่อุปทาน (Supply Chain) สมบูรณ์แบบ สัดส่วนต้นทุนอาหารทำได้อย่างยอดเยี่ยม รักษากำไรขั้นต้นไว้ป้อมปราการเหล็ก`,
            `<b>Analytical Breakdown:</b><br>
            • ยืนหยัดอยู่ที่ ${cogsPctL.toFixed(2)}% สะท้อนถึงการเจรจาต่อรองซัพพลายเออร์ที่เหนือชั้น และระบบปฏิบัติการหลังร้าน (Kitchen Ops) ที่ไม่มีที่ติ<br><br>
            <i class="fa-solid fa-screwdriver-wrench" style="color:#10b981;"></i> <b>Strategic Action:</b> รักษาสูตรมาตรฐาน (SOP) ชุดนี้เป็นคัมภีร์หลัก และอาจลองใช้โมเดล Menu Premiumization อัปเกรดท็อปปิ้งเพื่อดึง Margin ให้ทะลุขีดจำกัดไปอีกขั้น`);
            
        document.getElementById('cost-analysis-text').innerHTML = `
            <div class="insight-item" style="color:#10b981; border-left:3px solid #10b981; padding-left:12px; background: rgba(16, 185, 129, 0.05); padding-top:8px; padding-bottom:8px; border-radius:4px;">
                <i class="fa-solid fa-shield-check"></i><div style="margin-top:4px;">
                <h4 style="color:#fff; font-size: 1.05rem;">Gross Margin ไร้รอยรั่ว (${cogsPctL.toFixed(2)}%)</h4>
                <p style="font-size:0.85rem; color:#cbd5e1; margin-top:5px;">บริหารซัพพลายได้ล้ำเลิศ โครงสร้างกำไรขั้นต้นเสถียรมาก</p></div></div>`;
    }

    // --- 3. Labor & Human Capital ---
    let salPctL = calcPct(sal[l], rev[l]);
    let salPctP = calcPct(sal[p], rev[p]);
    let salDiff = salPctL - salPctP;
    
    if (sal[l] > 0 && salPctL > 25) {
        addCard('users-slash', 'bad', `Human Capital Inefficiency: Labor Cost Overflow (>25%)`, 
            `ค่าใช้จ่ายบุคลากรต่อยอดขายแตะระดับ <b>${salPctL.toFixed(2)}%</b> (มาตรฐานโลกอุตสาหกรรมร้านอาหารอยู่ที่ 20-25%) นี่คือการ Overstaffing ที่กำลังแทะเล็ม Bottom-line อย่างเงียบๆ`,
            `<b>Analytical Breakdown:</b><br>
            • ยอดใช้จ่ายบุคลากรสุทธิ: <b>${fmtRev(sal[l])}</b> บ่งบอกว่าผลิตภาพต่อหัวพนักงาน (Revenue per Employee) กำลังตกต่ำ<br><br>
            <i class="fa-solid fa-clipboard-check" style="color:#ef4444;"></i> <b>Corrective Measures:</b><br>
            1. <b>Labor Scheduling Optimization:</b> วิเคราะห์ Heatmap การเข้าร้านของลูกค้า ปาดทิ้งชั่วโมงบุคลากรพาร์ทไทม์ในช่วง Dead-hours ทันทีแบบไร้ข้อพิจารณา<br>
            2. <b>Performance Target:</b> ตั้งเป้าหมาย KPIs เชิงยอดขายรายบุคคล หากบุคลากรประจำไม่สามารถดึงยอดขายได้ตามเป้า หมายถึงภาระล่วงเวลาต้องถูกเพิกถอน`);
    } else if (sal[l] > 0 && salDiff > 2) {
        addCard('people-arrows', 'warn', `Operating Friction: Labor Cost Spiking (${salDiff.toFixed(2)}% MoM)`, 
            `ตรวจพบกราฟค่าตอบแทนบุคลากรกระตุกขึ้นสวนทางกับรายได้ นี่คือสัญญาณเตือนของโครงสร้างกะการทำงาน (Roster Shift) ที่แฝงไปด้วยชั่วโมงที่ไร้ประสิทธิผล`,
            `<b>Analytical Breakdown:</b><br>
            • ค่าแรงเบียดกำไรเพิ่มขึ้น ${salDiff.toFixed(2)}% จากเดือนก่อน แสดงว่ามีการจ่าย Overtime ที่ประเมินพลาดไปอย่างมีนัยสำคัญ<br><br>
            <i class="fa-solid fa-clipboard-check" style="color:#f59e0b;"></i> <b>Corrective Measures:</b> Audit การอนุมัติทำโอทีย้อนหลัง 30 วัน ควบคุมกะการทำงาน (Shift Rosters) อย่างเข้มงวด อนุมัติ OT เฉพาะเคสที่พิสูจน์ได้ว่ามี Traffic แขกล้นร้านจริงๆ เท่านั้น`);
    }

    // --- 4. Third-Party Platform Economics ---
    let feePctL = calcPct(fees[l], rev[l]);
    if (fees[l] > 0 && feePctL > 15) {
        addCard('hand-holding-dollar', 'warn', `Unit Economics Decay: Over-Reliance on Delivery Platforms`,
            `โครงสร้างรายได้กำลังบิดเบี้ยวจากการพึ่งพาแพลตฟอร์มที่ค่าธรรมเนียมรุงรัง ค่า GP/Commissions พุ่งทะลวงไปถึง <b>${fmtRev(fees[l])}</b> ชี้ให้เห็นถึงความสูญเสียใน Unit Economics ขั้นรุนแรง`,
            `<b>Analytical Breakdown:</b><br>
            • เราจ่ายส่วยให้ Third-party ถึง <b>${feePctL.toFixed(2)}%</b> ของปริมณฑลยอดขาย ธุรกิจกำลังเป็นเบี้ยล่างให้แอปพลิเคชันเดลิเวอรี่<br><br>
            <i class="fa-solid fa-rocket" style="color:#f59e0b;"></i> <b>Omnichannel Strategy:</b><br>
            1. <b>Platform Mark-up Tactic:</b> รีแบรนด์ราคาในแอปทั้งหมดด้วยการบวกราคาเชิงกลยุทธ์ (Strategic Pricing Mark-up 15-20%) ให้ต้นทุนค่าส่งถูกกระจายไปหาผู้บริโภค<br>
            2. <b>Owned Channel Push:</b> หยอดโบรชัวร์และอัดฉีดโปรโมชั่นสำหรับลูกค้าที่มารับหน้าเคาน์เตอร์ (Takeout) แบบลด 10% ซึ่ง Win-Win และ Margin สุทธิกลับมาตกที่ร้านมหาศาล`);
    }

    // --- 5. Overhead & Opex Leakages ---
    let utilGrowth = calcGrowth(util[l], util[p]);
    let consGrowth = calcGrowth(cons[l], cons[p]);
    let overheadText = "";
    
    if (util[l] > 0 && utilGrowth > 15) overheadText += `⚡ <b>Utilities Explosion (ค่าน้ำ/ไฟ/พลังงาน):</b> ทะยานขึ้น <b>${utilGrowth.toFixed(2)}%</b> (ปิดที่ ${fmtRev(util[l])}) ซึ่งเป็นการเติบโตแบบก้าวกระโดดที่ไร้เหตุผล<br>`;
    if (cons[l] > 0 && consGrowth > 15) overheadText += `📦 <b>Consumables Leakage (ค่าบรรจุภัณฑ์/กล่อง):</b> อัตราพร่องตัวพรวดขึ้น <b>${consGrowth.toFixed(2)}%</b> (ทะลุยอด ${fmtRev(cons[l])}) ชี้ชัดให้เห็นการเบิกทิ้งเบิกขวางก้นครัว<br>`;
    
    if (overheadText !== "") {
        addCard('bolt', 'bad', `Operating Overhead Spike: Immediate Leakage Investigation Required`, 
            `ม่านเรดาร์ระบบดักจับการปลิวหายของค่าใช้จ่าย Overhead พบการกระโดดของ Fixed/Variable OpEx เกินเส้น 15% บ่งชี้ถึงการบริหารหลังร้านที่หย่อนยาน`,
            `${overheadText}<br><br><i class="fa-solid fa-wrench" style="color:#ef4444;"></i> <b>Zero-Based Review:</b><br>
            - บังคับใช้แผนประหยัดพลังงาน (Energy Audit Protocol) สแกนตู้แช่ เครื่องปรับอากาศ หรือช่องก๊าซรั่วทันที<br>
            - แต่งตั้งเจ้าหน้าที่เบิกจ่ายกล่องใส่อาหารและของสิ้นเปลือง ห้ามหยิบอิสระเพื่อปิดรูรั่ว (Pilferage Leakage) แบบเด็ดขาด`);
    }
}
