const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 180000
};

(async () => {
  const pool = await sql.connect(config);

  const outsideKeys = new Set([105, 80, 122, 123, 115, 104, 126, 225]);

  // ============================================================
  // STEP 1: Build rep roster with start dates from BOTH sources
  // ============================================================
  console.log('Step 1: Building rep roster...');

  // Get rep names from tblSalesRep (authoritative)
  await pool.request().query(`
    SELECT lSalesRepKey, sRepFirst + ' ' + sRepLast as repName
    INTO #RepNames FROM tblSalesRep
  `);

  // Rep start dates from invoices
  await pool.request().query(`
    SELECT lSalesRepKey, MIN(dtTranDate) as invoiceStart
    INTO #InvStart FROM tblInvoice
    WHERE lSalesRepKey > 2
    GROUP BY lSalesRepKey
    HAVING COUNT(*) >= 10
  `);

  // Rep start dates from contract billing (via contract's own lSalesRepKey)
  await pool.request().query(`
    SELECT con.lSalesRepKey, MIN(cds.dtInvoiceDate) as contractStart
    INTO #ConStart
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE con.lSalesRepKey > 2 AND cds.nInvoiceAmount > 0
    GROUP BY con.lSalesRepKey
  `);

  // Combine: earliest date from either source = rep start
  await pool.request().query(`
    SELECT COALESCE(i.lSalesRepKey, c.lSalesRepKey) as lSalesRepKey,
           CASE
             WHEN i.invoiceStart IS NULL THEN c.contractStart
             WHEN c.contractStart IS NULL THEN i.invoiceStart
             WHEN i.invoiceStart < c.contractStart THEN i.invoiceStart
             ELSE c.contractStart
           END as startDate
    INTO #RS
    FROM #InvStart i
    FULL OUTER JOIN #ConStart c ON i.lSalesRepKey = c.lSalesRepKey
    WHERE COALESCE(i.lSalesRepKey, c.lSalesRepKey) > 2
  `);

  // ============================================================
  // STEP 2: FFS revenue by rep (from tblInvoice, using invoice's own rep key)
  // ============================================================
  console.log('Step 2: FFS revenue...');

  // Client ownership for net new
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

  const ffs = await pool.request().query(`
    SELECT i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(i.dblTranAmount) as ffsTotal,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as ffsNetNew,
           SUM(CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.dblTranAmount ELSE 0 END) as ffsInherited,
           COUNT(DISTINCT i.lClientKey) as ffsClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as ffsNetNewClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
      AND DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 10
    GROUP BY i.lSalesRepKey, DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
  `);

  // ============================================================
  // STEP 3: Contract billing revenue (using CONTRACT's lSalesRepKey, NOT client's)
  // ============================================================
  console.log('Step 3: Contract billing revenue (attributed to contract rep)...');

  const contracts = await pool.request().query(`
    SELECT con.lSalesRepKey,
           DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as contractRev,
           COUNT(DISTINCT con.lContractKey) as contractCount,
           COUNT(DISTINCT con.lClientKey) as contractClients
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    JOIN #RS rs ON con.lSalesRepKey = rs.lSalesRepKey
    WHERE cds.nInvoiceAmount > 0
      AND DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 BETWEEN 1 AND 10
    GROUP BY con.lSalesRepKey, DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
  `);

  // ============================================================
  // STEP 4: Merge into combined rep data
  // ============================================================
  console.log('Step 4: Merging...');

  const repData = {};
  ffs.recordset.forEach(r => {
    const k = `${r.lSalesRepKey}_${r.tenureYear}`;
    repData[k] = {
      repKey: r.lSalesRepKey, tenureYear: r.tenureYear,
      ffsTotal: r.ffsTotal, ffsNetNew: r.ffsNetNew, ffsInherited: r.ffsInherited,
      ffsClients: r.ffsClients, ffsNetNewClients: r.ffsNetNewClients,
      contractRev: 0, contractCount: 0, contractClients: 0
    };
  });

  contracts.recordset.forEach(r => {
    const k = `${r.lSalesRepKey}_${r.tenureYear}`;
    if (!repData[k]) {
      repData[k] = {
        repKey: r.lSalesRepKey, tenureYear: r.tenureYear,
        ffsTotal: 0, ffsNetNew: 0, ffsInherited: 0,
        ffsClients: 0, ffsNetNewClients: 0,
        contractRev: 0, contractCount: 0, contractClients: 0
      };
    }
    repData[k].contractRev = r.contractRev;
    repData[k].contractCount = r.contractCount;
    repData[k].contractClients = r.contractClients;
  });

  // Get rep names
  const nameResult = await pool.request().query('SELECT lSalesRepKey, repName FROM #RepNames');
  const nameMap = {};
  nameResult.recordset.forEach(x => nameMap[x.lSalesRepKey] = (x.repName || 'Unknown').trim());

  // ============================================================
  // STEP 5: Validation — spot check known reps
  // ============================================================
  console.log('\n=== VALIDATION SPOT CHECKS ===');

  // Brian Kenney (197) — should show Surgical Solutions contract revenue
  const kenneyKeys = Object.keys(repData).filter(k => k.startsWith('197_'));
  let kenneyFFS = 0, kenneyCon = 0;
  kenneyKeys.forEach(k => { kenneyFFS += repData[k].ffsTotal; kenneyCon += repData[k].contractRev; });
  console.log(`Brian Kenney [197]: FFS $${Math.round(kenneyFFS).toLocaleString()} | Contract $${Math.round(kenneyCon).toLocaleString()} | Total $${Math.round(kenneyFFS + kenneyCon).toLocaleString()}`);

  // Verify Surgical Solutions contract total
  const ssCheck = await pool.request().query(`
    SELECT SUM(cds.nInvoiceAmount) as total
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE con.lSalesRepKey = 197 AND cds.nInvoiceAmount > 0
  `);
  console.log(`  Surgical Solutions contract billing check: $${Math.round(ssCheck.recordset[0].total || 0).toLocaleString()}`);

  // Bernie DeLacy (80) — should show Bayhealth
  const bernieKeys = Object.keys(repData).filter(k => k.startsWith('80_'));
  let bernieFFS = 0, bernieCon = 0;
  bernieKeys.forEach(k => { bernieFFS += repData[k].ffsTotal; bernieCon += repData[k].contractRev; });
  console.log(`\nBernie DeLacy [80]: FFS $${Math.round(bernieFFS).toLocaleString()} | Contract $${Math.round(bernieCon).toLocaleString()} | Total $${Math.round(bernieFFS + bernieCon).toLocaleString()}`);

  const bhCheck = await pool.request().query(`
    SELECT SUM(cds.nInvoiceAmount) as total
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE con.lSalesRepKey = 80 AND cds.nInvoiceAmount > 0
  `);
  console.log(`  Bayhealth contract billing check: $${Math.round(bhCheck.recordset[0].total || 0).toLocaleString()}`);

  // Brandi Cook (253) — should show big contract revenue
  const brandiKeys = Object.keys(repData).filter(k => k.startsWith('253_'));
  let brandiFFS = 0, brandiCon = 0;
  brandiKeys.forEach(k => { brandiFFS += repData[k].ffsTotal; brandiCon += repData[k].contractRev; });
  console.log(`\nBrandi Cook [253]: FFS $${Math.round(brandiFFS).toLocaleString()} | Contract $${Math.round(brandiCon).toLocaleString()} | Total $${Math.round(brandiFFS + brandiCon).toLocaleString()}`);

  const bcCheck = await pool.request().query(`
    SELECT SUM(cds.nInvoiceAmount) as total
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE con.lSalesRepKey = 253 AND cds.nInvoiceAmount > 0
  `);
  console.log(`  Brandi Cook contract billing check: $${Math.round(bcCheck.recordset[0].total || 0).toLocaleString()}`);

  // Seamus Glavin (266)
  const seamusKeys = Object.keys(repData).filter(k => k.startsWith('266_'));
  let seamusFFS = 0, seamusCon = 0;
  seamusKeys.forEach(k => { seamusFFS += repData[k].ffsTotal; seamusCon += repData[k].contractRev; });
  console.log(`\nSeamus Glavin [266]: FFS $${Math.round(seamusFFS).toLocaleString()} | Contract $${Math.round(seamusCon).toLocaleString()} | Total $${Math.round(seamusFFS + seamusCon).toLocaleString()}`);

  // ============================================================
  // STEP 6: Inside vs Outside comparison
  // ============================================================

  const outside = {};
  const inside = {};
  for (const d of Object.values(repData)) {
    const bucket = outsideKeys.has(d.repKey) ? outside : inside;
    if (!bucket[d.tenureYear]) bucket[d.tenureYear] = [];
    bucket[d.tenureYear].push(d);
  }

  const avg = (arr, fn) => arr.length > 0 ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

  console.log('\n=== OUTSIDE TERRITORY REPS (8 reps) — CORRECTED ===');
  for (let y = 1; y <= 5; y++) {
    const d = outside[y];
    if (!d || d.length === 0) { console.log(`  Yr${y}: no data`); continue; }
    const total = avg(d, x => x.ffsTotal + x.contractRev);
    const ffsAvg = avg(d, x => x.ffsTotal);
    const conAvg = avg(d, x => x.contractRev);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.ffsClients);
    const cc = avg(d, x => x.contractCount);
    console.log(`  Yr${y} (${d.length} reps) | TOTAL $${Math.round(total).toLocaleString()} | FFS $${Math.round(ffsAvg).toLocaleString()} | Contract $${Math.round(conAvg).toLocaleString()} (${Math.round(cc)} contracts) | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  console.log('\n=== INSIDE REPS — CORRECTED ===');
  for (let y = 1; y <= 10; y++) {
    const d = inside[y];
    if (!d || d.length === 0) continue;
    const total = avg(d, x => x.ffsTotal + x.contractRev);
    const ffsAvg = avg(d, x => x.ffsTotal);
    const conAvg = avg(d, x => x.contractRev);
    const nn = avg(d, x => x.ffsNetNew);
    const cl = avg(d, x => x.ffsClients);
    const cc = avg(d, x => x.contractCount);
    console.log(`  Yr${y} (${d.length} reps) | TOTAL $${Math.round(total).toLocaleString()} | FFS $${Math.round(ffsAvg).toLocaleString()} | Contract $${Math.round(conAvg).toLocaleString()} (${Math.round(cc)} contracts) | NetNew $${Math.round(nn).toLocaleString()} | ${Math.round(cl)} clients`);
  }

  // ============================================================
  // STEP 7: Top reps by TOTAL revenue (FFS + Contract)
  // ============================================================
  console.log('\n=== TOP 25 REPS BY TOTAL REVENUE (FFS + Contract, first 10 tenure years) ===');
  const repTotals = {};
  for (const d of Object.values(repData)) {
    if (!repTotals[d.repKey]) repTotals[d.repKey] = { ffs: 0, contract: 0, clients: 0 };
    repTotals[d.repKey].ffs += d.ffsTotal;
    repTotals[d.repKey].contract += d.contractRev;
    repTotals[d.repKey].clients = Math.max(repTotals[d.repKey].clients, d.ffsClients);
  }

  const sortedReps = Object.entries(repTotals)
    .map(([k, v]) => ({ key: parseInt(k), ...v, total: v.ffs + v.contract }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);

  sortedReps.forEach(r => {
    const pct = r.total > 0 ? Math.round(r.contract / r.total * 100) : 0;
    const type = outsideKeys.has(r.key) ? 'OUTSIDE' : 'inside';
    console.log(`  ${(nameMap[r.key] || String(r.key)).padEnd(28)} | Total $${Math.round(r.total).toLocaleString().padStart(12)} | FFS $${Math.round(r.ffs).toLocaleString().padStart(12)} | Contract $${Math.round(r.contract).toLocaleString().padStart(10)} (${String(pct).padStart(2)}%) | ${type}`);
  });

  await pool.request().query('DROP TABLE #RepNames, #InvStart, #ConStart, #RS, #CF');
  pool.close();
  console.log('\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
