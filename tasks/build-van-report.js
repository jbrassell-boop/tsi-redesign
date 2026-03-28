const sql = require('mssql/msnodesqlv8');
const XLSX = require('xlsx');
const config = {
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;'
};

async function run() {
  const wb = XLSX.readFile('C:/Users/JoeBrassell/Downloads/InstrumentRepairs.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const woNumbers = [...new Set(data.map(r => r['Work Order']))];
  const woList = woNumbers.map(w => "'" + w + "'").join(',');

  const pool = await sql.connect(config);

  // Tech assignments from tblPointsTechs
  const pts = await pool.request().query(`
    SELECT DISTINCT sWorkOrderNumber, sTechName FROM tblPointsTechs WHERE sWorkOrderNumber IN (${woList})
  `);
  const techMap = {};
  pts.recordset.forEach(r => { techMap[r.sWorkOrderNumber] = r.sTechName; });

  // Manual overrides for the 9 unassigned
  const overrides = {
    'NR25077013': 'Allen Martello', 'NR25091001': 'Charles Kaufman', 'NR25091008': 'Allen Martello',
    'NR25091009': 'Allen Martello', 'NR25093022': 'Allen Martello', 'NR25094022': 'Allen Martello',
    'NR25100001': 'Charles Kaufman', 'NR25128022': 'Charles Kaufman', 'NR25279002': 'Charles Kaufman'
  };
  Object.assign(techMap, overrides);

  // Van WOs with full detail
  const vanWOs = await pool.request().query(`
    SELECT r.sWorkOrderNumber, r.lDepartmentKey, r.dtDateIn, r.dtDateOut, r.dblAmtRepair,
           r.sBillName1, r.sComplaintDesc, r.nSalesTax,
           c.sClientName1 AS ActualClient, d.sDepartmentName
    FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c ON d.lClientKey = c.lClientKey
    WHERE r.sWorkOrderNumber IN (${woList})
  `);

  // All candidate depot repairs
  const deptKeys = [...new Set(vanWOs.recordset.map(r => r.lDepartmentKey))];
  const allDepot = await pool.request().query(`
    SELECT r.sWorkOrderNumber, r.lDepartmentKey, r.dtDateIn, r.dtDateOut, r.dblAmtRepair,
           r.sBillName1, r.sComplaintDesc, r.nSalesTax,
           c.sClientName1 AS ActualClient, d.sDepartmentName
    FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c ON d.lClientKey = c.lClientKey
    WHERE r.lDepartmentKey IN (${deptKeys.join(',')})
      AND r.sWorkOrderNumber LIKE 'NR25%'
      AND r.sWorkOrderNumber NOT IN (${woList})
      AND r.sComplaintDesc NOT LIKE '%Onsite%Service%'
  `);

  // Index depot by dept
  const depotByDept = {};
  allDepot.recordset.forEach(r => {
    if (!depotByDept[r.lDepartmentKey]) depotByDept[r.lDepartmentKey] = [];
    depotByDept[r.lDepartmentKey].push(r);
  });

  // Match depot to van visits (8 biz days = ~12 calendar days)
  const matchedDepotWOs = new Set();
  const depotToVan = {};
  for (const van of vanWOs.recordset) {
    const vanDate = new Date(van.dtDateIn);
    const windowEnd = new Date(vanDate);
    windowEnd.setDate(windowEnd.getDate() + 12);
    const candidates = depotByDept[van.lDepartmentKey] || [];
    for (const d of candidates) {
      const depotDate = new Date(d.dtDateIn);
      if (depotDate >= vanDate && depotDate <= windowEnd && !matchedDepotWOs.has(d.sWorkOrderNumber)) {
        matchedDepotWOs.add(d.sWorkOrderNumber);
        depotToVan[d.sWorkOrderNumber] = van.sWorkOrderNumber;
      }
    }
  }

  // Parse service date from complaint desc
  function parseServiceDate(desc) {
    if (!desc) return null;
    const m = desc.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
    return m ? m[1] : null;
  }

  // Helper to format dates for Excel
  function toDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt;
  }

  // === BUILD WORKBOOK ===
  const outWb = XLSX.utils.book_new();

  // --- SHEET 1: Van Service Detail ---
  const vanRows = vanWOs.recordset.map(r => ({
    'Work Order': r.sWorkOrderNumber,
    'Technician': techMap[r.sWorkOrderNumber] || 'Unassigned',
    'Client': r.ActualClient,
    'Department': r.sDepartmentName,
    'Bill-To Name': r.sBillName1,
    'Service Date': parseServiceDate(r.sComplaintDesc) || '',
    'Date In': toDate(r.dtDateIn),
    'Date Out': toDate(r.dtDateOut),
    'Revenue': r.dblAmtRepair || 0,
    'Sales Tax': r.nSalesTax || 0,
    'Description': r.sComplaintDesc
  })).sort((a, b) => (a.Technician || '').localeCompare(b.Technician || '') || ((a['Date In'] || 0) - (b['Date In'] || 0)));

  const ws1 = XLSX.utils.json_to_sheet(vanRows);
  ws1['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 42 }, { wch: 22 }, { wch: 42 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 45 }
  ];
  // Format cells
  const range1 = XLSX.utils.decode_range(ws1['!ref']);
  for (let row = range1.s.r + 1; row <= range1.e.r; row++) {
    // Revenue
    const revCell = ws1[XLSX.utils.encode_cell({ r: row, c: 8 })];
    if (revCell) revCell.z = '$#,##0.00';
    // Sales Tax
    const taxCell = ws1[XLSX.utils.encode_cell({ r: row, c: 9 })];
    if (taxCell) taxCell.z = '$#,##0.00';
    // Dates
    for (const col of [6, 7]) {
      const cell = ws1[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell && cell.v instanceof Date) { cell.t = 'd'; cell.z = 'mm/dd/yyyy'; }
    }
  }
  XLSX.utils.book_append_sheet(outWb, ws1, 'Van Service Detail');

  // --- SHEET 2: Depot Repairs Linked ---
  const depotRows = allDepot.recordset
    .filter(r => matchedDepotWOs.has(r.sWorkOrderNumber))
    .map(r => {
      const linkedVanWO = depotToVan[r.sWorkOrderNumber];
      return {
        'Depot Work Order': r.sWorkOrderNumber,
        'Linked Van WO': linkedVanWO || '',
        'Van Technician': linkedVanWO ? (techMap[linkedVanWO] || 'Unassigned') : '',
        'Client': r.ActualClient,
        'Department': r.sDepartmentName,
        'Bill-To Name': r.sBillName1,
        'Date In': toDate(r.dtDateIn),
        'Date Out': toDate(r.dtDateOut),
        'Revenue': r.dblAmtRepair || 0,
        'Complaint / Description': r.sComplaintDesc
      };
    }).sort((a, b) => (a['Van Technician'] || '').localeCompare(b['Van Technician'] || ''));

  const ws2 = XLSX.utils.json_to_sheet(depotRows);
  ws2['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 42 }, { wch: 22 },
    { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 55 }
  ];
  const range2 = XLSX.utils.decode_range(ws2['!ref']);
  for (let row = range2.s.r + 1; row <= range2.e.r; row++) {
    const revCell = ws2[XLSX.utils.encode_cell({ r: row, c: 8 })];
    if (revCell) revCell.z = '$#,##0.00';
    for (const col of [6, 7]) {
      const cell = ws2[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell && cell.v instanceof Date) { cell.t = 'd'; cell.z = 'mm/dd/yyyy'; }
    }
  }
  XLSX.utils.book_append_sheet(outWb, ws2, 'Depot Repairs Linked');

  // --- SHEET 3: Tech Summary ---
  const techSummary = {};
  vanRows.forEach(r => {
    const t = r.Technician;
    if (!techSummary[t]) techSummary[t] = { vanWOs: 0, vanRev: 0, depotWOs: 0, depotRev: 0, clients: new Set() };
    techSummary[t].vanWOs++;
    techSummary[t].vanRev += r.Revenue;
    techSummary[t].clients.add(r.Client);
  });
  depotRows.forEach(r => {
    const t = r['Van Technician'] || 'Unassigned';
    if (!techSummary[t]) techSummary[t] = { vanWOs: 0, vanRev: 0, depotWOs: 0, depotRev: 0, clients: new Set() };
    techSummary[t].depotWOs++;
    techSummary[t].depotRev += r.Revenue;
  });

  const techRows = Object.entries(techSummary)
    .sort((a, b) => (b[1].vanRev + b[1].depotRev) - (a[1].vanRev + a[1].depotRev))
    .map(([tech, d]) => ({
      'Technician': tech,
      'Van Service WOs': d.vanWOs,
      'Van Service Revenue': d.vanRev,
      'Depot WOs Generated': d.depotWOs,
      'Depot Revenue': d.depotRev,
      'Total Program Revenue': d.vanRev + d.depotRev,
      'Depot Uplift %': d.vanRev > 0 ? d.depotRev / d.vanRev : 0,
      'Clients Served': d.clients.size
    }));

  // Add total row
  const tTotals = {
    'Technician': 'TOTAL',
    'Van Service WOs': techRows.reduce((s, r) => s + r['Van Service WOs'], 0),
    'Van Service Revenue': techRows.reduce((s, r) => s + r['Van Service Revenue'], 0),
    'Depot WOs Generated': techRows.reduce((s, r) => s + r['Depot WOs Generated'], 0),
    'Depot Revenue': techRows.reduce((s, r) => s + r['Depot Revenue'], 0),
    'Total Program Revenue': techRows.reduce((s, r) => s + r['Total Program Revenue'], 0),
    'Depot Uplift %': 0,
    'Clients Served': ''
  };
  tTotals['Depot Uplift %'] = tTotals['Van Service Revenue'] > 0 ? tTotals['Depot Revenue'] / tTotals['Van Service Revenue'] : 0;
  techRows.push(tTotals);

  const ws3 = XLSX.utils.json_to_sheet(techRows);
  ws3['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 },
    { wch: 24 }, { wch: 14 }, { wch: 14 }
  ];
  const range3 = XLSX.utils.decode_range(ws3['!ref']);
  for (let row = range3.s.r + 1; row <= range3.e.r; row++) {
    for (const col of [2, 4, 5]) {
      const cell = ws3[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.z = '$#,##0.00';
    }
    const pctCell = ws3[XLSX.utils.encode_cell({ r: row, c: 6 })];
    if (pctCell) pctCell.z = '0.0%';
  }
  XLSX.utils.book_append_sheet(outWb, ws3, 'Tech Summary');

  // --- SHEET 4: Client Summary ---
  const clientSummary = {};
  vanRows.forEach(r => {
    const c = r.Client;
    if (!clientSummary[c]) clientSummary[c] = { vanWOs: 0, vanRev: 0, depotWOs: 0, depotRev: 0, techs: new Set() };
    clientSummary[c].vanWOs++;
    clientSummary[c].vanRev += r.Revenue;
    clientSummary[c].techs.add(r.Technician);
  });
  depotRows.forEach(r => {
    const c = r.Client;
    if (!clientSummary[c]) clientSummary[c] = { vanWOs: 0, vanRev: 0, depotWOs: 0, depotRev: 0, techs: new Set() };
    clientSummary[c].depotWOs++;
    clientSummary[c].depotRev += r.Revenue;
  });

  const clientRows = Object.entries(clientSummary)
    .sort((a, b) => (b[1].vanRev + b[1].depotRev) - (a[1].vanRev + a[1].depotRev))
    .map(([client, d]) => ({
      'Client': client,
      'Van Service WOs': d.vanWOs,
      'Van Service Revenue': d.vanRev,
      'Depot WOs Generated': d.depotWOs,
      'Depot Revenue': d.depotRev,
      'Total Program Revenue': d.vanRev + d.depotRev,
      'Depot Uplift %': d.vanRev > 0 ? d.depotRev / d.vanRev : 0,
      'Technician(s)': [...d.techs].sort().join(', ')
    }));

  // Add total row
  const cTotals = {
    'Client': 'TOTAL',
    'Van Service WOs': clientRows.reduce((s, r) => s + r['Van Service WOs'], 0),
    'Van Service Revenue': clientRows.reduce((s, r) => s + r['Van Service Revenue'], 0),
    'Depot WOs Generated': clientRows.reduce((s, r) => s + r['Depot WOs Generated'], 0),
    'Depot Revenue': clientRows.reduce((s, r) => s + r['Depot Revenue'], 0),
    'Total Program Revenue': clientRows.reduce((s, r) => s + r['Total Program Revenue'], 0),
    'Depot Uplift %': 0,
    'Technician(s)': ''
  };
  cTotals['Depot Uplift %'] = cTotals['Van Service Revenue'] > 0 ? cTotals['Depot Revenue'] / cTotals['Van Service Revenue'] : 0;
  clientRows.push(cTotals);

  const ws4 = XLSX.utils.json_to_sheet(clientRows);
  ws4['!cols'] = [
    { wch: 42 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 },
    { wch: 24 }, { wch: 14 }, { wch: 30 }
  ];
  const range4 = XLSX.utils.decode_range(ws4['!ref']);
  for (let row = range4.s.r + 1; row <= range4.e.r; row++) {
    for (const col of [2, 4, 5]) {
      const cell = ws4[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.z = '$#,##0.00';
    }
    const pctCell = ws4[XLSX.utils.encode_cell({ r: row, c: 6 })];
    if (pctCell) pctCell.z = '0.0%';
  }
  XLSX.utils.book_append_sheet(outWb, ws4, 'Client Summary');

  // Write file
  const outPath = 'C:/Users/JoeBrassell/Downloads/TSI_Van_Service_2025_Analysis.xlsx';
  XLSX.writeFile(outWb, outPath);
  console.log('Written to:', outPath);
  console.log('Sheets:');
  console.log('  1. Van Service Detail - ' + vanRows.length + ' rows');
  console.log('  2. Depot Repairs Linked - ' + depotRows.length + ' rows');
  console.log('  3. Tech Summary - ' + techRows.length + ' rows');
  console.log('  4. Client Summary - ' + clientRows.length + ' rows');

  await pool.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
