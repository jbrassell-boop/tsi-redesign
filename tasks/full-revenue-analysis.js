const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 180000
};

(async () => {
  const pool = await sql.connect(config);

  const outsideKeys = new Set([105, 80, 122, 123, 115, 104, 126, 225]);

  console.log('Building rep start dates...');
  // Rep start dates from invoice table
  await pool.request().query(`
    SELECT lSalesRepKey, MIN(dtTranDate) as startDate
    INTO #RS FROM tblInvoice
    WHERE lSalesRepKey > 2
      AND sRepFirst NOT LIKE 'BSC%' AND sRepFirst NOT LIKE 'FMR%'
      AND sRepLast NOT LIKE '%test%' AND sRepFirst NOT LIKE '%test%'
      AND sRepLast NOT LIKE '%Account%' AND sRepLast NOT LIKE '%Legacy%'
      AND sRepLast NOT LIKE '%Demo%' AND sRepLast NOT LIKE '%Vet%'
      AND sRepFirst NOT LIKE 'EC %' AND sRepFirst NOT LIKE 'Cogentix%'
      AND sRepFirst NOT LIKE 'ORTHO%' AND sRepFirst NOT LIKE 'TITAN%'
      AND sRepFirst NOT LIKE 'Aesculap%' AND sRepFirst NOT LIKE 'Boston%'
      AND sRepFirst NOT LIKE 'Chesapeake%' AND sRepFirst NOT LIKE 'Endoscopy%'
      AND sRepFirst NOT LIKE 'MultiMedical%' AND sRepFirst NOT LIKE 'MytaMed%'
      AND sRepFirst NOT LIKE 'Parkcity%' AND sRepFirst NOT LIKE 'South %'
      AND sRepFirst NOT LIKE 'Westside%' AND sRepFirst NOT LIKE 'WHDC%'
      AND sRepFirst NOT LIKE 'Renovo%' AND sRepLast NOT LIKE 'Doe'
      AND sRepLast NOT LIKE '%Scientific%'
    GROUP BY lSalesRepKey
    HAVING COUNT(*) >= 20 AND DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) >= 6
  `);

  // Client ownership for net new tagging
  console.log('Building client ownership...');
  await pool.request().query(`
    SELECT lClientKey, MIN(dtTranDate) as firstEverDate
    INTO #CF FROM tblInvoice WHERE lClientKey > 0 GROUP BY lClientKey
  `);
  await pool.request().query('ALTER TABLE #CF ADD firstRepKey INT');
  await pool.request().query(`
    UPDATE cf SET cf.firstRepKey = sub.lSalesRepKey
    FROM #CF cf CROSS APPLY (
      SELECT TOP 1 i.lSalesRepKey FROM tblInvoice i
      WHERE i.lClientKey = cf.lClientKey AND i.dtTranDate = cf.firstEverDate ORDER BY i.lInvoiceKey
    ) sub
  `);

  // FFS revenue by rep and tenure year (from tblInvoice)
  console.log('Pulling FFS revenue...');
  const ffs = await pool.request().query(`
    SELECT i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as ffsNetNew,
           SUM(CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.dblTranAmount ELSE 0 END) as ffsInherited,
           SUM(i.dblTranAmount) as ffsTotal,
           COUNT(DISTINCT i.lClientKey) as ffsClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as ffsNetNewClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
    GROUP BY i.lSalesRepKey, DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
    HAVING DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 10
  `);

  // Contract billing revenue by rep and tenure year
  // Link: contract -> client -> salesrep on client, then use rep start date for tenure year
  console.log('Pulling contract billing revenue...');
  const contracts = await pool.request().query(`
    SELECT c.lSalesRepKey,
           DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as contractRev,
           COUNT(DISTINCT con.lContractKey) as contractCount,
           COUNT(DISTINCT c.lClientKey) as contractClients
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    JOIN tblDepartment d ON cds.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c ON d.lClientKey = c.lClientKey
    JOIN #RS rs ON c.lSalesRepKey = rs.lSalesRepKey
    WHERE cds.nInvoiceAmount > 0
    GROUP BY c.lSalesRepKey, DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
    HAVING DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 BETWEEN 1 AND 10
  `);

  // Also try linking through the contract's own lSalesRepKey
  const contracts2 = await pool.request().query(`
    SELECT con.lSalesRepKey,
           DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as contractRev,
           COUNT(DISTINCT con.lContractKey) as contractCount
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    JOIN #RS rs ON con.lSalesRepKey = rs.lSalesRepKey
    WHERE cds.nInvoiceAmount > 0
    GROUP BY con.lSalesRepKey, DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
    HAVING DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 BETWEEN 1 AND 10
  `);

  // Merge the data
  // Build a map: repKey -> tenureYear -> {ffs, contract}
  const repData = {};
  ffs.recordset.forEach(r => {
    const k = `${r.lSalesRepKey}_${r.tenureYear}`;
    if (!repData[k]) repData[k] = { repKey: r.lSalesRepKey, tenureYear: r.tenureYear, ffsTotal: 0, ffsNetNew: 0, ffsInherited: 0, contractRev: 0, ffsClients: 0, ffsNetNewClients: 0, contractCount: 0 };
    repData[k].ffsTotal = r.ffsTotal;
    repData[k].ffsNetNew = r.ffsNetNew;
    repData[k].ffsInherited = r.ffsInherited;
    repData[k].ffsClients = r.ffsClients;
    repData[k].ffsNetNewClients = r.ffsNetNewClients;
  });

  // Use contract link through client's rep (more reliable)
  contracts.recordset.forEach(r => {
    const k = `${r.lSalesRepKey}_${r.tenureYear}`;
    if (!repData[k]) repData[k] = { repKey: r.lSalesRepKey, tenureYear: r.tenureYear, ffsTotal: 0, ffsNetNew: 0, ffsInherited: 0, contractRev: 0, ffsClients: 0, ffsNetNewClients: 0, contractCount: 0 };
    repData[k].contractRev = r.contractRev;
    repData[k].contractCount = r.contractCount;
  });

  // Separate outside vs inside
  const outside = {};
  const inside = {};
  for (const d of Object.values(repData)) {
    const bucket = outsideKeys.has(d.repKey) ? outside : inside;
    if (!bucket[d.tenureYear]) bucket[d.tenureYear] = [];
    bucket[d.tenureYear].push(d);
  }

  const avg = (arr, fn) => arr.length > 0 ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

  console.log('\n=== OUTSIDE TERRITORY REPS (8 reps) — FFS + CONTRACT ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (!d || d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    const total = avg(d, x => x.ffsTotal + x.contractRev);
    const ffsAvg = avg(d, x => x.ffsTotal);
    const conAvg = avg(d, x => x.contractRev);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.ffsClients);
    console.log(`  Yr${y} (${d.length} reps) | TOTAL $${Math.round(total).toLocaleString()} | FFS $${Math.round(ffsAvg).toLocaleString()} | Contract $${Math.round(conAvg).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  console.log('\n=== INSIDE REPS (all others) — FFS + CONTRACT ===');
  for (let y = 1; y <= 10; y++) {
    const d = inside[y];
    if (!d || d.length === 0) continue;
    const total = avg(d, x => x.ffsTotal + x.contractRev);
    const ffsAvg = avg(d, x => x.ffsTotal);
    const conAvg = avg(d, x => x.contractRev);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.ffsClients);
    const conCount = avg(d, x => x.contractCount);
    console.log(`  Yr${y} (${d.length} reps) | TOTAL $${Math.round(total).toLocaleString()} | FFS $${Math.round(ffsAvg).toLocaleString()} | Contract $${Math.round(conAvg).toLocaleString()} (${Math.round(conCount)} contracts) | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  // Top reps by contract revenue
  console.log('\n=== TOP REPS BY CONTRACT BILLING REVENUE (all tenure years combined) ===');
  const repContractTotals = {};
  for (const d of Object.values(repData)) {
    if (!repContractTotals[d.repKey]) repContractTotals[d.repKey] = { contractRev: 0, ffsRev: 0 };
    repContractTotals[d.repKey].contractRev += d.contractRev;
    repContractTotals[d.repKey].ffsRev += d.ffsTotal;
  }
  const names = await pool.request().query(`SELECT DISTINCT lSalesRepKey, MIN(sRepFirst + ' ' + sRepLast) as n FROM tblInvoice GROUP BY lSalesRepKey`);
  const nameMap = {};
  names.recordset.forEach(x => nameMap[x.lSalesRepKey] = x.n);

  const sorted = Object.entries(repContractTotals)
    .filter(([k, v]) => v.contractRev > 0)
    .sort((a, b) => b[1].contractRev - a[1].contractRev)
    .slice(0, 25);
  sorted.forEach(([key, data]) => {
    const total = data.contractRev + data.ffsRev;
    const pct = total > 0 ? Math.round(data.contractRev / total * 100) : 0;
    const type = outsideKeys.has(parseInt(key)) ? 'OUTSIDE' : 'inside';
    console.log(`  ${(nameMap[key]||key).padEnd(28)} | Contract $${Math.round(data.contractRev).toLocaleString().padStart(10)} | FFS $${Math.round(data.ffsRev).toLocaleString().padStart(12)} | Contract ${pct}% | ${type}`);
  });

  await pool.request().query('DROP TABLE #CF, #RS');
  pool.close();
  console.log('\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
