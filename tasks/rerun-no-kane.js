const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  // 8 outside reps (Tom Kane removed)
  // Lindsey Davis=105, Bernie DeLacy=80, Eric Schwarzel=122,
  // Courtney Blue=123, Kara Klund=115, Michael Woessner=104, Danielle Penge=126, Melissa Fox=225
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
    SELECT lSalesRepKey, MIN(dtTranDate) as startDate, MAX(dtTranDate) as endDate, COUNT(*) as totalInv
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
           SUM(CASE WHEN i.lContractKey > 0 THEN i.dblTranAmount ELSE 0 END) as contractRev,
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

  console.log('=== OUTSIDE TERRITORY REPS (8 confirmed, Tom Kane removed) ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    const t = avg(d, x => x.totalRev);
    const nn = avg(d, x => x.netNewRev);
    const inh = avg(d, x => x.inheritedRev);
    const ffs = avg(d, x => x.ffsRev);
    const con = avg(d, x => x.contractRev);
    const cl = avg(d, x => x.totalClients);
    const nnc = avg(d, x => x.netNewClients);
    const inhc = avg(d, x => x.inheritedClients);
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(t).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} (${Math.round(nn/t*100)}%) | Inherited $${Math.round(inh).toLocaleString()} | FFS $${Math.round(ffs).toLocaleString()} | Contract $${Math.round(con).toLocaleString()} | ${Math.round(cl)} clients (${Math.round(nnc)} new, ${Math.round(inhc)} inh)`);
  }

  console.log('\n=== INSIDE / PHONE REPS (all others, Tom Kane now here) ===');
  for (let y = 1; y <= 5; y++) {
    const d = inside[y];
    if (d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    const t = avg(d, x => x.totalRev);
    const nn = avg(d, x => x.netNewRev);
    const inh = avg(d, x => x.inheritedRev);
    const ffs = avg(d, x => x.ffsRev);
    const con = avg(d, x => x.contractRev);
    const cl = avg(d, x => x.totalClients);
    const nnc = avg(d, x => x.netNewClients);
    const inhc = avg(d, x => x.inheritedClients);
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(t).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} (${Math.round(nn/t*100)}%) | Inherited $${Math.round(inh).toLocaleString()} | FFS $${Math.round(ffs).toLocaleString()} | Contract $${Math.round(con).toLocaleString()} | ${Math.round(cl)} clients (${Math.round(nnc)} new, ${Math.round(inhc)} inh)`);
  }

  await pool.request().query('DROP TABLE #CF, #RS');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
