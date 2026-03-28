const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  const outsideKeys = new Set([105, 80, 122, 123, 115, 104, 126, 225]);

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

  const detail = await pool.request().query(`
    SELECT i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as netNewRev,
           SUM(CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.dblTranAmount ELSE 0 END) as inheritedRev,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as netNewClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.lClientKey END) as inheritedClients,
           SUM(CASE WHEN i.lContractKey > 0 AND i.dblTranAmount > 0 THEN i.dblTranAmount ELSE 0 END) as contractRevPositive,
           SUM(CASE WHEN i.lContractKey > 0 THEN 1 ELSE 0 END) as contractInvCount,
           SUM(CASE WHEN i.lContractKey > 0 AND i.dblTranAmount = 0 THEN 1 ELSE 0 END) as contractZeroCount,
           SUM(CASE WHEN i.lContractKey = 0 OR i.lContractKey IS NULL THEN i.dblTranAmount ELSE 0 END) as ffsRev,
           SUM(i.dblTranAmount) as totalRev,
           COUNT(DISTINCT i.lClientKey) as totalClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
    GROUP BY i.lSalesRepKey, DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
    HAVING DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 5
  `);

  const outside = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const inside = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  detail.recordset.forEach(r => {
    const bucket = outsideKeys.has(r.lSalesRepKey) ? outside : inside;
    if (bucket[r.tenureYear]) bucket[r.tenureYear].push(r);
  });

  const avg = (arr, fn) => arr.length > 0 ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

  console.log('=== OUTSIDE TERRITORY REPS (8 reps) ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(avg(d, x=>x.totalRev)).toLocaleString()} | FFS $${Math.round(avg(d, x=>x.ffsRev)).toLocaleString()} | Contract $${Math.round(avg(d, x=>x.contractRevPositive)).toLocaleString()} (${Math.round(avg(d, x=>x.contractInvCount))} inv, ${Math.round(avg(d, x=>x.contractZeroCount))} at $0) | NetNew $${Math.round(avg(d, x=>x.netNewRev)).toLocaleString()} | ${Math.round(avg(d, x=>x.totalClients))} clients`);
  }

  console.log('\n=== INSIDE REPS (all others) ===');
  for (let y = 1; y <= 5; y++) {
    const d = inside[y];
    if (d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(avg(d, x=>x.totalRev)).toLocaleString()} | FFS $${Math.round(avg(d, x=>x.ffsRev)).toLocaleString()} | Contract $${Math.round(avg(d, x=>x.contractRevPositive)).toLocaleString()} (${Math.round(avg(d, x=>x.contractInvCount))} inv, ${Math.round(avg(d, x=>x.contractZeroCount))} at $0) | NetNew $${Math.round(avg(d, x=>x.netNewRev)).toLocaleString()} | ${Math.round(avg(d, x=>x.totalClients))} clients`);
  }

  // Show which inside reps had the most contract revenue
  console.log('\n=== TOP INSIDE REPS BY CONTRACT REVENUE (Year 1-5 combined) ===');
  const repContract = {};
  detail.recordset.forEach(r => {
    if (outsideKeys.has(r.lSalesRepKey)) return;
    if (!repContract[r.lSalesRepKey]) repContract[r.lSalesRepKey] = { contractRev: 0, totalRev: 0, contractInv: 0 };
    repContract[r.lSalesRepKey].contractRev += r.contractRevPositive;
    repContract[r.lSalesRepKey].totalRev += r.totalRev;
    repContract[r.lSalesRepKey].contractInv += r.contractInvCount;
  });

  // Get rep names
  const names = await pool.request().query(`SELECT DISTINCT lSalesRepKey, MIN(sRepFirst + ' ' + sRepLast) as n FROM tblInvoice GROUP BY lSalesRepKey`);
  const nameMap = {};
  names.recordset.forEach(x => nameMap[x.lSalesRepKey] = x.n);

  const sorted = Object.entries(repContract).sort((a, b) => b[1].contractRev - a[1].contractRev).slice(0, 20);
  sorted.forEach(([key, data]) => {
    const pct = data.totalRev > 0 ? Math.round(data.contractRev / data.totalRev * 100) : 0;
    console.log(`  ${(nameMap[key]||key).padEnd(28)} | Contract $${Math.round(data.contractRev).toLocaleString().padStart(10)} (${pct}% of total) | ${data.contractInv} contract inv`);
  });

  await pool.request().query('DROP TABLE #CF, #RS');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
