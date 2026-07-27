                if (!parsed) return false;
                const yearMatch = (yearVal === 'all') ? true : parsed.year === parseInt(yearVal);
                const monthMatch = (monthVal === 'all') ? true : (parsed.month + 1) === parseInt(monthVal);
                const deptMatch = (deptVal === 'all') ? true : (d.department === deptVal);
                const subDeptMatch = (subDeptVal === 'all') ? true : (d.subDepartment === subDeptVal);
                return yearMatch && monthMatch && deptMatch && subDeptMatch;
            });
 
            const inCount = filteredDocs.filter(d => d.type === 'doc-in').length;
            const outCount = filteredDocs.filter(d => d.type === 'doc-out').length;
            const externalCount = filteredDocs.filter(d => d.type === 'doc-external').length;
            const internalCount = filteredDocs.filter(d => d.type === 'doc-internal').length;
            const orderCount = filteredDocs.filter(d => ['doc-command', 'doc-regulation', 'doc-rule'].includes(d.type)).length;
            const publicCount = filteredDocs.filter(d => ['doc-announcement', 'doc-statement', 'doc-news'].includes(d.type)).length;
            const evidenceCount = filteredDocs.filter(d => ['doc-certification', 'doc-meeting-report', 'doc-memo', 'doc-other', 'doc-general', 'doc-circular', 'doc-urgent'].includes(d.type)).length;
 
            document.getElementById('stat-in').innerText = inCount;
            document.getElementById('stat-out').innerText = outCount;
            document.getElementById('stat-external').innerText = externalCount;
            document.getElementById('stat-internal').innerText = internalCount;
            document.getElementById('stat-order').innerText = orderCount;
            document.getElementById('stat-public').innerText = publicCount;
            document.getElementById('stat-evidence').innerText = evidenceCount;
            document.getElementById('stat-total').innerText = filteredDocs.length;
            renderDashboardWorkPanels(filteredDocs);

            const yearDocs = appDocuments.filter(d => {
                const parsed = parseDocDate(d.date);
                if (!parsed) return false;
                const yearMatch = (yearVal === 'all') ? true : parsed.year === parseInt(yearVal);
                const deptMatch = (deptVal === 'all') ? true : (d.department === deptVal);
                const subDeptMatch = (subDeptVal === 'all') ? true : (d.subDepartment === subDeptVal);
                return yearMatch && deptMatch && subDeptMatch;
            });
 
            const monthlyByType = {
                'doc-in': Array(12).fill(0),
                'doc-out': Array(12).fill(0),
                'doc-external': Array(12).fill(0),
                'doc-internal': Array(12).fill(0),
                'doc-order-group': Array(12).fill(0),
                'doc-public-group': Array(12).fill(0),
                'doc-evidence-group': Array(12).fill(0)
            };
            yearDocs.forEach(d => {
                const parsed = parseDocDate(d.date);
                if (!parsed) return;
                const groupType = ['doc-command', 'doc-regulation', 'doc-rule'].includes(d.type) ? 'doc-order-group'
                    : ['doc-announcement', 'doc-statement', 'doc-news'].includes(d.type) ? 'doc-public-group'
                    : ['doc-certification', 'doc-meeting-report', 'doc-memo', 'doc-other', 'doc-general', 'doc-circular', 'doc-urgent'].includes(d.type) ? 'doc-evidence-group'
                    : d.type;
                if (monthlyByType[groupType]) {
                    monthlyByType[groupType][parsed.month]++;
                }
            });
 
            const yearLabel = (yearVal === 'all') ? 'ทุกปี' : ('พ.ศ. ' + (parseInt(yearVal) + BE_OFFSET));
            const monthLabel = (monthVal === 'all') ? '' : ' - เดือน' + document.getElementById('dashMonth').selectedOptions[0].text;
            const deptLabel = (deptVal === 'all') ? '' : ' - ' + deptVal + (subDeptVal !== 'all' ? ' (' + subDeptVal + ')' : '');
 
            document.getElementById('barChartTitle').innerText = 'สถิติเอกสารรายเดือน (' + yearLabel + deptLabel + ')';
            document.getElementById('pieChartTitle').innerText = 'สัดส่วนประเภทเอกสาร (' + yearLabel + monthLabel + deptLabel + ')';
 
            renderCharts(monthlyByType, inCount, outCount, externalCount, internalCount, orderCount, publicCount, evidenceCount);
        }

        function renderCharts(monthlyByType, inC, outC, externalC, internalC, orderC, publicC, evidenceC) {
            if(barChartInstance) barChartInstance.destroy();
            if(pieChartInstance) pieChartInstance.destroy();

            const labels = ['รับ', 'ส่ง', 'ภายนอก', 'ภายใน', 'สั่งการ', 'ประชาสัมพันธ์', 'หลักฐานราชการ'];
            // ชุดสีโทนเย็นเพื่อให้อ่านข้อมูลได้สบายตาและแยกประเภทได้ชัดเจน
            const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#1CECFF', '#F43F5E', '#F59E0B', '#64748B'];
            const highlightColors = ['#93C5FD', '#6EE7B7', '#C4B5FD', '#A5F3FC', '#FDA4AF', '#FCD34D', '#CBD5E1'];
            const commonDataset = {
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 42,
                barPercentage: 0.72,
                categoryPercentage: 0.74
            };

            const ctxBar = document.getElementById('barChart').getContext('2d');
            const barGradients = colors.map((color, index) => {
                const gradient = ctxBar.createLinearGradient(0, 0, 0, 260);
                gradient.addColorStop(0, highlightColors[index]);
                gradient.addColorStop(1, color);
                return gradient;
            });
            barChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: THAI_MONTHS_SHORT,
                    datasets: [
                        { label: labels[0], data: monthlyByType['doc-in'], backgroundColor: barGradients[0], ...commonDataset },
                        { label: labels[1], data: monthlyByType['doc-out'], backgroundColor: barGradients[1], ...commonDataset },
                        { label: labels[2], data: monthlyByType['doc-external'], backgroundColor: barGradients[2], ...commonDataset },
                        { label: labels[3], data: monthlyByType['doc-internal'], backgroundColor: barGradients[3], ...commonDataset },
                        { label: labels[4], data: monthlyByType['doc-order-group'], backgroundColor: barGradients[4], ...commonDataset },
                        { label: labels[5], data: monthlyByType['doc-public-group'], backgroundColor: barGradients[5], ...commonDataset },
                        { label: labels[6], data: monthlyByType['doc-evidence-group'], backgroundColor: barGradients[6], ...commonDataset }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    interaction: { mode: 'index', intersect: false },
                    layout: { padding: { top: 12, right: 10, left: 4, bottom: 2 } },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 9, boxHeight: 9, padding: 14, font: { family: 'Sarabun', size: 12, weight: '600' } } },
                        tooltip: { backgroundColor: '#172033', padding: 12, cornerRadius: 10, titleFont: { family: 'Sarabun', weight: '700' }, bodyFont: { family: 'Sarabun' }, displayColors: true, caretPadding: 8 }
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Sarabun', size: 12 } }, border: { display: false } },
                        y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { family: 'Sarabun', size: 12 } }, grid: { color: 'rgba(148,163,184,.18)', drawBorder: false }, border: { display: false } }
                    }
                }
            });
 
            const ctxPie = document.getElementById('pieChart').getContext('2d');
            const totalDocuments = inC + outC + externalC + internalC + orderC + publicC + evidenceC;
            const doughnutCenterText = {
                id: 'doughnutCenterText',
                afterDraw(chart) {
                    const { ctx, chartArea } = chart;
                    const x = (chartArea.left + chartArea.right) / 2;
                    const y = (chartArea.top + chartArea.bottom) / 2;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#1e3a5f';
                    ctx.font = '700 24px Kanit, Sarabun, sans-serif';
                    ctx.fillText(totalDocuments, x, y - 3);
                    ctx.fillStyle = '#718096';
                    ctx.font = '500 11px Sarabun, sans-serif';
                    ctx.fillText('เอกสารทั้งหมด', x, y + 16);
                    ctx.restore();
                }
            };
            pieChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: [inC, outC, externalC, internalC, orderC, publicC, evidenceC],
                        backgroundColor: colors,
                        borderColor: '#ffffff',
                        borderWidth: 4,
                        hoverOffset: 9
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '66%',
                    layout: { padding: { top: 2, bottom: 3 } },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { family: 'Sarabun', size: 12, weight: '600' } } },
                        tooltip: { backgroundColor: '#172033', padding: 12, cornerRadius: 9, titleFont: { family: 'Sarabun', weight: '700' }, bodyFont: { family: 'Sarabun' } }
                    }
                },
                plugins: [doughnutCenterText]
            });
        }
