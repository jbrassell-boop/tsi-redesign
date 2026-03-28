const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 180000
};

(async () => {
  const pool = await sql.connect(config);
  const outsideKeys = new Set([105, 80, 122, 123, 115, 104, 126, 225]);

  // TIGHT FILTER: Only reps with 20+ invoices AND 6+ months active in tblInvoice
  // Then layer contract revenue ON TOP
  console.log('Building tight rep roster (20+ inv, 6+ months)...');
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

  const repCount = await pool.request().query('SELECT COUNT(*) as cnt FROM #RS');
  console.log('Tight roster:', repCount.recordset[0].cnt, 'reps');

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

  // FFS from tblInvoice
  console.log('Pulling FFS...');
  const ffs = await pool.request().query(`
    SELECT i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(i.dblTranAmount) as ffsTotal,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as ffsNetNew,
           COUNT(DISTINCT i.lClientKey) as ffsClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as ffsNetNewClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
      AND DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 10
    GROUP BY i.lSalesRepKey, DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
  `);

  // Contract billing (using contract's own lSalesRepKey, but only for reps in tight roster)
  console.log('Pulling contract billing...');
  const contracts = await pool.request().query(`
    SELECT con.lSalesRepKey,
           DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as contractRev,
           COUNT(DISTINCT con.lContractKey) as contractCount
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    JOIN #RS rs ON con.lSalesRepKey = rs.lSalesRepKey
    WHERE cds.nInvoiceAmount > 0
      AND DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 BETWEEN 1 AND 10
    GROUP BY con.lSalesRepKey, DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
  `);

  // Merge
  const repData = {};
  ffs.recordset.forEach(r => {
    const k = r.lSalesRepKey + '_' + r.tenureYear;
    repData[k] = {
      repKey: r.lSalesRepKey, tenureYear: r.tenureYear,
      ffs: r.ffsTotal, ffsNetNew: r.ffsNetNew, clients: r.ffsClients,
      nnClients: r.ffsNetNewClients, contract: 0
    };
  });
  contracts.recordset.forEach(r => {
    const k = r.lSalesRepKey + '_' + r.tenureYear;
    if (repData[k]) {
      repData[k].contract = r.contractRev;
    }
    // If not in repData, skip — they didn't pass the tight filter
  });

  // Split outside/inside and compute averages + median
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

  console.log('\n=== OUTSIDE TERRITORY REPS (tight filter) ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (!d || !d.length) continue;
    const t = avg(d, x => x.ffs + x.contract);
    const f = avg(d, x => x.ffs);
    const c = avg(d, x => x.contract);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.clients);
    const med = median(d, x => x.ffs + x.contract);
    console.log(`  Yr${y} (${d.length}) | Avg $${Math.round(t).toLocaleString()} | Median $${Math.round(med).toLocaleString()} | FFS $${Math.round(f).toLocaleString()} | Contract $${Math.round(c).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  console.log('\n=== INSIDE REPS (tight filter) ===');
  for (let y = 1; y <= 10; y++) {
    const d = inside[y];
    if (!d || !d.length) continue;
    const t = avg(d, x => x.ffs + x.contract);
    const f = avg(d, x => x.ffs);
    const c = avg(d, x => x.contract);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.clients);
    const med = median(d, x => x.ffs + x.contract);
    console.log(`  Yr${y} (${d.length}) | Avg $${Math.round(t).toLocaleString()} | Median $${Math.round(med).toLocaleString()} | FFS $${Math.round(f).toLocaleString()} | Contract $${Math.round(c).toLocaleString()} | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  await pool.request().query('DROP TABLE #RS, #CF');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
