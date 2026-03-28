const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};
(async () => {
  const pool = await sql.connect(config);

  // Find Walter Reed in invoices under Lindsey (key 105)
  let r = await pool.request().query(`
    SELECT sBillName1, YEAR(dtTranDate) as yr, COUNT(*) as inv,
           SUM(dblTranAmount) as rev, lContractKey,
           CASE WHEN lContractKey > 0 THEN 'CONTRACT' ELSE 'FFS' END as type
    FROM tblInvoice
    WHERE lSalesRepKey = 105
      AND (sBillName1 LIKE '%Walter%' OR sBillName1 LIKE '%Reed%' OR sBillName1 LIKE '%Army%' OR sBillName1 LIKE '%Military%')
    GROUP BY sBillName1, YEAR(dtTranDate), lContractKey
    ORDER BY sBillName1, yr
  `);
  console.log('=== LINDSEY DAVIS - WALTER REED INVOICES ===');
  if (r.recordset.length === 0) console.log('(none found by name)');
  r.recordset.forEach(x => console.log(`  ${x.sBillName1} | ${x.yr} | ${x.inv} inv | $${Math.round(x.rev||0).toLocaleString()} | ${x.type} (key:${x.lContractKey})`));

  // Show all of Lindsey's top clients by revenue
  r = await pool.request().query(`
    SELECT TOP 20 sBillName1, COUNT(*) as inv, SUM(dblTranAmount) as rev,
           SUM(CASE WHEN lContractKey > 0 THEN dblTranAmount ELSE 0 END) as contractRev,
           SUM(CASE WHEN lContractKey = 0 OR lContractKey IS NULL THEN dblTranAmount ELSE 0 END) as ffsRev,
           MIN(YEAR(dtTranDate)) as firstYr, MAX(YEAR(dtTranDate)) as lastYr
    FROM tblInvoice
    WHERE lSalesRepKey = 105
    GROUP BY sBillName1
    ORDER BY SUM(dblTranAmount) DESC
  `);
  console.log('\n=== LINDSEY DAVIS - TOP 20 CLIENTS ===');
  r.recordset.forEach(x => console.log(`  ${x.sBillName1} | $${Math.round(x.rev||0).toLocaleString()} total | FFS: $${Math.round(x.ffsRev||0).toLocaleString()} | Contract: $${Math.round(x.contractRev||0).toLocaleString()} | ${x.firstYr}-${x.lastYr} | ${x.inv} inv`));

  // Check all her contract-linked invoices
  r = await pool.request().query(`
    SELECT TOP 10 sBillName1, lContractKey, YEAR(dtTranDate) as yr, SUM(dblTranAmount) as rev, COUNT(*) as inv
    FROM tblInvoice
    WHERE lSalesRepKey = 105 AND lContractKey > 0
    GROUP BY sBillName1, lContractKey, YEAR(dtTranDate)
    ORDER BY SUM(dblTranAmount) DESC
  `);
  console.log('\n=== LINDSEY CONTRACT-LINKED INVOICES ===');
  if (r.recordset.length === 0) console.log('(none — all FFS)');
  r.recordset.forEach(x => console.log(`  ${x.sBillName1} | Contract#${x.lContractKey} | ${x.yr} | $${Math.round(x.rev||0).toLocaleString()} | ${x.inv} inv`));

  // Also check: is Walter Reed under a different rep?
  r = await pool.request().query(`
    SELECT sRepFirst + ' ' + sRepLast as repName, sBillName1, YEAR(dtTranDate) as yr,
           COUNT(*) as inv, SUM(dblTranAmount) as rev
    FROM tblInvoice
    WHERE sBillName1 LIKE '%Walter%' OR sBillName1 LIKE '%Reed%'
    GROUP BY sRepFirst, sRepLast, sBillName1, YEAR(dtTranDate)
    ORDER BY sBillName1, yr
  `);
  console.log('\n=== WALTER REED - ALL REPS ===');
  r.recordset.forEach(x => console.log(`  ${x.repName} | ${x.sBillName1} | ${x.yr} | ${x.inv} inv | $${Math.round(x.rev||0).toLocaleString()}`));

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
