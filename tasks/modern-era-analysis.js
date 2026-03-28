const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 180000
};

(async () => {
  const pool = await sql.connect(config);
  const outsideKeys = new Set([105, 80, 122, 123, 115, 104, 126, 225]);

  // MODERN ERA: Only reps whose first invoice is 2015+
  // 20+ invoices, 6+ months active
  console.log('Building modern era roster (first invoice 2015+, 20+ inv, 6+ months)...');
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
    HAVING COUNT(*) >= 20
      AND DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) >= 6
      AND MIN(dtTranDate) >= '2015-01-01'
  `);

  // Who's in the pool?
  const roster = await pool.request().query(`
    SELECT rs.lSalesRepKey, rs.startDate,
           MIN(i.sRepFirst + ' ' + i.sRepLast) as repName
    FROM #RS rs
    JOIN tblInvoice i ON rs.lSalesRepKey = i.lSalesRepKey
    GROUP BY rs.lSalesRepKey, rs.startDate
    ORDER BY rs.startDate
  `);
  console.log('Modern era roster (' + roster.recordset.length + ' reps):');
  roster.recordset.forEach(x => {
    const type = outsideKeys.has(x.lSalesRepKey) ? 'OUTSIDE' : 'inside';
    console.log('  [' + x.lSalesRepKey + '] ' + x.repName.trim() + ' | started ' + x.startDate.toISOString().split('T')[0] + ' | ' + type);
  });

  // Client ownership
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

  // FFS
  console.log('\nPulling FFS...');
  const ffs = await pool.request().query(`
    SELECT i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(i.dblTranAmount) as ffsTotal,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as netNew,
           SUM(CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.dblTranAmount ELSE 0 END) as inherited,
           COUNT(DISTINCT i.lClientKey) as clients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as nnClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.lClientKey END) as inhClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
      AND DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 5
    GROUP BY i.lSalesRepKey, DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
  `);

  // Contract billing
  console.log('Pulling contract billing...');
  const contracts = await pool.request().query(`
    SELECT con.lSalesRepKey,
           DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as contractRev
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    JOIN #RS rs ON con.lSalesRepKey = rs.lSalesRepKey
    WHERE cds.nInvoiceAmount > 0
      AND DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 BETWEEN 1 AND 5
    GROUP BY con.lSalesRepKey, DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
  `);

  // Merge
  const repData = {};
  ffs.recordset.forEach(r => {
    const k = r.lSalesRepKey + '_' + r.tenureYear;
    repData[k] = {
      repKey: r.lSalesRepKey, tenureYear: r.tenureYear,
      ffs: r.ffsTotal, netNew: r.netNew, inherited: r.inherited,
      clients: r.clients, nnClients: r.nnClients, inhClients: r.inhClients,
      contract: 0
    };
  });
  contracts.recordset.forEach(r => {
    const k = r.lSalesRepKey + '_' + r.tenureYear;
    if (repData[k]) repData[k].contract = r.contractRev;
  });

  // Split
  const outside = {};
  const inside = {};
  for (const d of Object.values(repData)) {
    const bucket = outsideKeys.has(d.repKey) ? outside : inside;
    if (!bucket[d.tenureYear]) bucket[d.tenureYear] = [];
    bucket[d.tenureYear].push(d);
  }

  const avg = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0) / arr.length;
  const median = (arr, fn) => {
    const sorted = arr.map(fn).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  console.log('\n=== OUTSIDE REPS (2015+ era) ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (!d || !d.length) continue;
    console.log(`  Yr${y} (${d.length}) | Avg $${Math.round(avg(d, x=>x.ffs+x.contract)).toLocaleString()} | Med $${Math.round(median(d, x=>x.ffs+x.contract)).toLocaleString()} | NetNew $${Math.round(avg(d, x=>x.netNew)).toLocaleString()} | Inherited $${Math.round(avg(d, x=>x.inherited)).toLocaleString()} | Contract $${Math.round(avg(d, x=>x.contract)).toLocaleString()} | ${Math.round(avg(d, x=>x.clients))} clients (${Math.round(avg(d, x=>x.nnClients))} new)`);
  }

  console.log('\n=== INSIDE REPS (2015+ era) ===');
  for (let y = 1; y <= 5; y++) {
    const d = inside[y];
    if (!d || !d.length) continue;
    console.log(`  Yr${y} (${d.length}) | Avg $${Math.round(avg(d, x=>x.ffs+x.contract)).toLocaleString()} | Med $${Math.round(median(d, x=>x.ffs+x.contract)).toLocaleString()} | NetNew $${Math.round(avg(d, x=>x.netNew)).toLocaleString()} | Inherited $${Math.round(avg(d, x=>x.inherited)).toLocaleString()} | Contract $${Math.round(avg(d, x=>x.contract)).toLocaleString()} | ${Math.round(avg(d, x=>x.clients))} clients (${Math.round(avg(d, x=>x.nnClients))} new)`);
  }

  // Per-rep detail for Year 1 so Joe can sanity check
  console.log('\n=== EVERY INSIDE REP YEAR 1 (2015+ era) ===');
  const names = {};
  roster.recordset.forEach(x => names[x.lSalesRepKey] = x.repName.trim());
  const yr1 = (inside[1] || []).sort((a, b) => (b.ffs + b.contract) - (a.ffs + a.contract));
  yr1.forEach(d => {
    console.log(`  ${(names[d.repKey]||d.repKey).padEnd(28)} | Total $${Math.round(d.ffs+d.contract).toLocaleString().padStart(10)} | NetNew $${Math.round(d.netNew).toLocaleString().padStart(10)} | Inherited $${Math.round(d.inherited).toLocaleString().padStart(10)} | Contract $${Math.round(d.contract).toLocaleString().padStart(8)} | ${d.clients} clients`);
  });

  await pool.request().query('DROP TABLE #RS, #CF');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
