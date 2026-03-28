const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  // Outside territory reps
  const reps = await pool.request().query(`
    SELECT lSalesRepKey, sRepFirst + ' ' + sRepLast as repName
    FROM tblSalesRep
    WHERE (sRepLast = 'Davis' AND sRepFirst = 'Lindsey')
       OR (sRepLast LIKE 'DeLacy%' AND sRepFirst = 'Bernie')
       OR (sRepLast = 'Kane' AND sRepFirst = 'Tom')
       OR (sRepLast = 'Schwarzel' AND sRepFirst = 'Eric')
       OR (sRepLast = 'Blue' AND sRepFirst = 'Courtney')
       OR (sRepLast = 'Klund' AND sRepFirst = 'Kara')
       OR (sRepLast = 'Woessner' AND sRepFirst = 'Michael')
       OR (sRepLast = 'Penge' AND sRepFirst = 'Danielle')
  `);
  console.log('=== OUTSIDE TERRITORY REPS ===');
  reps.recordset.forEach(r => console.log(`  [${r.lSalesRepKey}] ${r.repName}`));
  const keys = reps.recordset.map(r => r.lSalesRepKey);

  // Also find name variants in invoice table
  const nameVariants = await pool.request().query(`
    SELECT DISTINCT lSalesRepKey, sRepFirst + ' ' + sRepLast as repName
    FROM tblInvoice
    WHERE sRepLast IN ('Davis','DeLacy','Kane','Schwarzel','Blue','Klund','Woessner','Penge')
      AND sRepFirst IN ('Lindsey','Bernie','Tom','Eric','Courtney','Kara','Michael','Danielle')
  `);
  console.log('\nInvoice name variants:');
  nameVariants.recordset.forEach(r => console.log(`  [${r.lSalesRepKey}] ${r.repName}`));
  const allKeys = [...new Set([...keys, ...nameVariants.recordset.map(r => r.lSalesRepKey)])];
  console.log('All keys:', allKeys);

  // Build client ownership
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

  // Rep start dates
  await pool.request().query(`
    SELECT lSalesRepKey, MIN(dtTranDate) as startDate, MAX(dtTranDate) as endDate, COUNT(*) as totalInv
    INTO #RS FROM tblInvoice
    WHERE lSalesRepKey IN (${allKeys.join(',')})
    GROUP BY lSalesRepKey HAVING COUNT(*) >= 10
  `);

  // Detail
  const detail = await pool.request().query(`
    SELECT i.sRepFirst + ' ' + i.sRepLast as repName, i.lSalesRepKey,
           DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 as tenureYear,
           SUM(CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.dblTranAmount ELSE 0 END) as netNewRev,
           SUM(CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.dblTranAmount ELSE 0 END) as inheritedRev,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey = i.lSalesRepKey THEN i.lClientKey END) as netNewClients,
           COUNT(DISTINCT CASE WHEN cf.firstRepKey != i.lSalesRepKey OR cf.firstRepKey IS NULL THEN i.lClientKey END) as inheritedClients,
           SUM(CASE WHEN i.lContractKey > 0 THEN i.dblTranAmount ELSE 0 END) as contractRev,
           SUM(CASE WHEN i.lContractKey = 0 OR i.lContractKey IS NULL THEN i.dblTranAmount ELSE 0 END) as ffsRev,
           COUNT(CASE WHEN s.sRigidOrFlexible = 'F' THEN 1 END) as flexCount,
           COUNT(CASE WHEN s.sRigidOrFlexible = 'R' THEN 1 END) as rigidCount,
           COUNT(CASE WHEN s.sRigidOrFlexible = 'C' THEN 1 END) as cameraCount,
           COUNT(CASE WHEN s.sRigidOrFlexible NOT IN ('F','R','C') OR s.sRigidOrFlexible IS NULL THEN 1 END) as otherCount,
           SUM(i.dblTranAmount) as totalRev,
           COUNT(*) as invoices,
           COUNT(DISTINCT i.lClientKey) as totalClients
    FROM tblInvoice i
    JOIN #RS rs ON i.lSalesRepKey = rs.lSalesRepKey
    LEFT JOIN #CF cf ON i.lClientKey = cf.lClientKey
    LEFT JOIN tblScope s ON i.lScopeKey = s.lScopeKey
    WHERE i.lClientKey > 0
    GROUP BY i.sRepFirst, i.sRepLast, i.lSalesRepKey,
             DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1
    HAVING DATEDIFF(month, rs.startDate, i.dtTranDate) / 12 + 1 BETWEEN 1 AND 5
    ORDER BY i.sRepLast, i.sRepFirst, tenureYear
  `);

  console.log('\n=== PER REP DETAIL (Years 1-5) ===');
  console.log('Rep|Year|Total|NetNew|Inherited|NNClients|InhClients|AllClients|FFS|Contract|Flex|Rigid|Camera|Other');
  detail.recordset.forEach(r => {
    console.log([r.repName, r.tenureYear, Math.round(r.totalRev), Math.round(r.netNewRev),
      Math.round(r.inheritedRev), r.netNewClients, r.inheritedClients, r.totalClients,
      Math.round(r.ffsRev), Math.round(r.contractRev),
      r.flexCount, r.rigidCount, r.cameraCount, r.otherCount].join('|'));
  });

  // Averages
  console.log('\n=== OUTSIDE TERRITORY REP AVERAGES (Yr 1-5) ===');
  const byYear = {};
  detail.recordset.forEach(r => {
    const y = r.tenureYear;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  });
  for (let y = 1; y <= 5; y++) {
    if (byYear[y]) {
      const d = byYear[y];
      const n = d.length;
      const avg = (fn) => d.reduce((s, x) => s + fn(x), 0) / n;
      const totalAvg = avg(x => x.totalRev);
      const nnAvg = avg(x => x.netNewRev);
      console.log(`Yr${y} (${n} reps): Total $${Math.round(totalAvg).toLocaleString()} | NetNew $${Math.round(nnAvg).toLocaleString()} | Inherited $${Math.round(avg(x => x.inheritedRev)).toLocaleString()} | Clients ${Math.round(avg(x => x.totalClients))} | NN% ${Math.round(nnAvg/totalAvg*100)}% | FFS $${Math.round(avg(x => x.ffsRev)).toLocaleString()} | Contract $${Math.round(avg(x => x.contractRev)).toLocaleString()}`);
    }
  }

  await pool.request().query('DROP TABLE #CF, #RS');
  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
