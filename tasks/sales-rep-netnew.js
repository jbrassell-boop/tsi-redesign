const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000 },
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  // Step 1: Get first-ever invoice per client (who "owns" that client)
  console.log('Building client ownership map...');
  await pool.request().query(`
    SELECT lClientKey, MIN(dtTranDate) as firstEverDate
    INTO #ClientFirst
    FROM tblInvoice WHERE lClientKey > 0
    GROUP BY lClientKey
  `);

  // Add the first rep for each client
  await pool.request().query(`
    ALTER TABLE #ClientFirst ADD firstRepKey INT
  `);
  await pool.request().query(`
    UPDATE cf SET cf.firstRepKey = sub.lSalesRepKey
    FROM #ClientFirst cf
    CROSS APPLY (
      SELECT TOP 1 i.lSalesRepKey FROM tblInvoice i
      WHERE i.lClientKey = cf.lClientKey AND i.dtTranDate = cf.firstEverDate
      ORDER BY i.lInvoiceKey
    ) sub
  `);

  // Step 2: Rep start dates (real reps only)
  console.log('Finding real reps...');
  await pool.request().query(`
    SELECT lSalesRepKey,
           MIN(sRepFirst + ' ' + sRepLast) as repName,
           MIN(dtTranDate) as startDate,
           MAX(dtTranDate) as endDate,
           COUNT(*) as totalInv,
           DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) as monthsActive
    INTO #RepInfo
    FROM tblInvoice
    WHERE lSalesRepKey > 2
      AND sRepFirst NOT LIKE 'BSC%'
      AND sRepFirst NOT LIKE 'FMR%'
      AND sRepLast NOT LIKE '%test%'
      AND sRepFirst NOT LIKE '%test%'
      AND sRepLast NOT LIKE '%Account%'
      AND sRepLast NOT LIKE '%Legacy%'
      AND sRepLast NOT LIKE '%Demo%'
      AND sRepLast NOT LIKE '%Industrial%'
      AND sRepLast NOT LIKE '%Vet%'
      AND sRepFirst NOT LIKE 'EC %'
      AND sRepFirst NOT LIKE 'Cogentix%'
      AND sRepFirst NOT LIKE 'ORTHO%'
      AND sRepFirst NOT LIKE 'TITAN%'
      AND sRepFirst NOT LIKE 'Aesculap%'
      AND sRepFirst NOT LIKE 'MultiMedical%'
      AND sRepFirst NOT LIKE 'MytaMed%'
      AND sRepFirst NOT LIKE 'Boston%'
      AND sRepFirst NOT LIKE 'Chesapeake%'
      AND sRepFirst NOT LIKE 'Parkcity%'
      AND sRepFirst NOT LIKE 'Endoscopy%'
      AND sRepFirst NOT LIKE 'South %'
      AND sRepFirst NOT LIKE 'Westside%'
      AND sRepFirst NOT LIKE 'WHDC%'
      AND sRepFirst NOT LIKE 'Renovo%'
      AND sRepLast NOT LIKE 'Doe'
      AND sRepLast NOT LIKE '%Scientific%'
    GROUP BY lSalesRepKey
    HAVING COUNT(*) >= 20 AND DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) >= 6
  `);

  const repCount = await pool.request().query('SELECT COUNT(*) as cnt FROM #RepInfo');
  console.log('Found', repCount.recordset[0].cnt, 'real reps');

  // Step 3: Tag each invoice as net new or inherited
  console.log('Tagging invoices...');
  await pool.request().query(`
    SELECT i.lSalesRepKey, i.lClientKey, i.dtTranDate, i.dblTranAmount,
           ri.repName, ri.startDate,
           DATEDIFF(month, ri.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           CASE
             WHEN cf.firstRepKey = i.lSalesRepKey THEN 'NET_NEW'
             ELSE 'INHERITED'
           END as clientType
    INTO #TaggedInvoices
    FROM tblInvoice i
    JOIN #RepInfo ri ON i.lSalesRepKey = ri.lSalesRepKey
    LEFT JOIN #ClientFirst cf ON i.lClientKey = cf.lClientKey
    WHERE i.lClientKey > 0
  `);

  // Step 4: Aggregate — average across all reps
  console.log('Aggregating...\n');
  const agg = await pool.request().query(`
    WITH RepYearType AS (
      SELECT lSalesRepKey, repName, tenureYear, clientType,
             SUM(dblTranAmount) as rev,
             COUNT(DISTINCT lClientKey) as clients
      FROM #TaggedInvoices
      WHERE tenureYear BETWEEN 1 AND 10
      GROUP BY lSalesRepKey, repName, tenureYear, clientType
    )
    SELECT tenureYear, clientType,
           COUNT(*) as repCount,
           AVG(rev) as avgRev,
           AVG(CAST(clients AS FLOAT)) as avgClients
    FROM RepYearType
    GROUP BY tenureYear, clientType
    ORDER BY tenureYear, clientType
  `);

  console.log('=== AVERAGE REP: NET NEW vs INHERITED BY TENURE YEAR ===');
  console.log('(Net New = rep brought in the client; Inherited = client existed before this rep)');
  console.log('');
  let lastYr = 0;
  agg.recordset.forEach(x => {
    if (x.tenureYear !== lastYr) { if (lastYr > 0) console.log(''); lastYr = x.tenureYear; }
    console.log(`  Yr${x.tenureYear} ${x.clientType.padEnd(9)} | ${x.repCount} reps | avg $${Math.round(x.avgRev||0).toLocaleString().padStart(9)} | ${Math.round(x.avgClients)} clients`);
  });

  // Step 5: Per-rep detail for top reps (100+ invoices)
  const perRep = await pool.request().query(`
    WITH RepYearType AS (
      SELECT lSalesRepKey, repName, tenureYear, clientType,
             SUM(dblTranAmount) as rev,
             COUNT(DISTINCT lClientKey) as clients,
             COUNT(*) as invoices
      FROM #TaggedInvoices
      WHERE tenureYear BETWEEN 1 AND 10
      GROUP BY lSalesRepKey, repName, tenureYear, clientType
    )
    SELECT * FROM RepYearType
    WHERE lSalesRepKey IN (SELECT lSalesRepKey FROM #RepInfo WHERE totalInv >= 100)
    ORDER BY repName, tenureYear, clientType
  `);

  console.log('\n\n=== PER REP: NET NEW vs INHERITED ===');
  let lastRep = '';
  perRep.recordset.forEach(x => {
    if (x.repName !== lastRep) {
      console.log('\n' + x.repName + ':');
      lastRep = x.repName;
    }
    console.log(`  Yr${x.tenureYear} ${x.clientType.padEnd(9)} | $${Math.round(x.rev||0).toLocaleString().padStart(10)} | ${x.clients} clients | ${x.invoices} inv`);
  });

  // Cleanup
  await pool.request().query('DROP TABLE #ClientFirst, #RepInfo, #TaggedInvoices');
  pool.close();
  console.log('\n\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
