const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  // Outside rep keys (confirmed by Joe)
  // Lindsey Davis=105, Bernie DeLacy=80, Tom Kane=206+229, Eric Schwarzel=122,
  // Courtney Blue=123, Kara Klund=115, Michael Woessner=104, Danielle Penge=126, Melissa Fox=225
  const outsideKeys = [105, 80, 206, 229, 122, 123, 115, 104, 126, 225];

  // Build client ownership map
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

  // Get ALL real rep start dates
  await pool.request().query(`
    SELECT lSalesRepKey, MIN(dtTranDate) as startDate, MAX(dtTranDate) as endDate,
           COUNT(*) as totalInv, COUNT(DISTINCT lClientKey) as totalClients,
           SUM(dblTranAmount) as totalRev
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

  // Tag each rep as outside or inside
  // Outside = confirmed list. Everyone else with real name = inside
  const allReps = await pool.request().query(`SELECT lSalesRepKey, totalRev, totalClients, totalInv FROM #RS`);
  const outsideSet = new Set(outsideKeys);

  // Build tenure year stats for OUTSIDE vs INSIDE
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

  // Separate into outside vs inside
  const outside = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const inside = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  detail.recordset.forEach(r => {
    const bucket = outsideSet.has(r.lSalesRepKey) ? outside : inside;
    if (bucket[r.tenureYear]) bucket[r.tenureYear].push(r);
  });

  const avg = (arr, fn) => arr.length > 0 ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

  console.log('=== OUTSIDE TERRITORY REPS (9 confirmed) ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (d.length === 0) continue;
    const t = avg(d, x => x.totalRev);
    const nn = avg(d, x => x.netNewRev);
    const inh = avg(d, x => x.inheritedRev);
    const ffs = avg(d, x => x.ffsRev);
    const con = avg(d, x => x.contractRev);
    const cl = avg(d, x => x.totalClients);
    const nnc = avg(d, x => x.netNewClients);
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(t).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} (${Math.round(nn/t*100)}%) | Inherited $${Math.round(inh).toLocaleString()} | FFS $${Math.round(ffs).toLocaleString()} | Contract $${Math.round(con).toLocaleString()} | ${Math.round(cl)} clients (${Math.round(nnc)} new)`);
  }

  console.log('\n=== INSIDE / PHONE REPS (all others) ===');
  for (let y = 1; y <= 5; y++) {
    const d = inside[y];
    if (d.length === 0) continue;
    const t = avg(d, x => x.totalRev);
    const nn = avg(d, x => x.netNewRev);
    const inh = avg(d, x => x.inheritedRev);
    const ffs = avg(d, x => x.ffsRev);
    const con = avg(d, x => x.contractRev);
    const cl = avg(d, x => x.totalClients);
    const nnc = avg(d, x => x.netNewClients);
    console.log(`  Yr${y} (${d.length} reps) | Total $${Math.round(t).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} (${Math.round(nn/t*100)}%) | Inherited $${Math.round(inh).toLocaleString()} | FFS $${Math.round(ffs).toLocaleString()} | Contract $${Math.round(con).toLocaleString()} | ${Math.round(cl)} clients (${Math.round(nnc)} new)`);
  }

  // Also show: top inside reps by revenue for context
  const insideReps = await pool.request().query(`
    SELECT rs.lSalesRepKey, MIN(i.sRepFirst + ' ' + i.sRepLast) as repName,
           rs.startDate, rs.totalRev, rs.totalClients,
           DATEDIFF(month, rs.startDate, rs.endDate) / 12 as yearsActive,
           MAX(i.sBillState) as topState
    FROM #RS rs
    JOIN tblInvoice i ON rs.lSalesRepKey = i.lSalesRepKey
    WHERE rs.lSalesRepKey NOT IN (${outsideKeys.join(',')})
      AND rs.totalRev > 100000
    GROUP BY rs.lSalesRepKey, rs.startDate, rs.totalRev, rs.totalClients
    ORDER BY rs.totalRev DESC
  `);
  console.log('\n=== TOP INSIDE REPS (by career revenue) ===');
  insideReps.recordset.slice(0, 25).forEach(r =>
    console.log(`  ${r.repName} | $${Math.round(r.totalRev).toLocaleString()} | ${r.totalClients} clients | ${r.yearsActive}yr | ${r.topState}`)
  );

  await pool.request().query('DROP TABLE #CF, #RS');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
