const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};
(async () => {
  const pool = await sql.connect(config);

  // Find her key(s)
  let r = await pool.request().query(`
    SELECT DISTINCT lSalesRepKey, sRepFirst + ' ' + sRepLast as n
    FROM tblInvoice WHERE sRepLast LIKE '%Fox%'
  `);
  console.log('Fox keys:', r.recordset.map(x => `[${x.lSalesRepKey}] ${x.n}`));

  // Her year-by-year invoice data
  r = await pool.request().query(`
    SELECT YEAR(dtTranDate) as yr, COUNT(*) as inv, SUM(dblTranAmount) as rev,
           COUNT(DISTINCT lClientKey) as clients,
           SUM(CASE WHEN lContractKey > 0 THEN dblTranAmount ELSE 0 END) as contractRev
    FROM tblInvoice WHERE lSalesRepKey = 225
    GROUP BY YEAR(dtTranDate) ORDER BY yr
  `);
  console.log('\n=== MELISSA FOX - YEARLY ===');
  r.recordset.forEach(x => console.log(`  ${x.yr} | ${x.inv} inv | $${Math.round(x.rev||0).toLocaleString()} | ${x.clients} clients | Contract: $${Math.round(x.contractRev||0).toLocaleString()}`));

  // Top clients
  r = await pool.request().query(`
    SELECT TOP 10 sBillName1, SUM(dblTranAmount) as rev, COUNT(*) as inv,
           MIN(YEAR(dtTranDate)) as firstYr, MAX(YEAR(dtTranDate)) as lastYr
    FROM tblInvoice WHERE lSalesRepKey = 225
    GROUP BY sBillName1 ORDER BY SUM(dblTranAmount) DESC
  `);
  console.log('\n=== TOP CLIENTS ===');
  r.recordset.forEach(x => console.log(`  ${x.sBillName1} | $${Math.round(x.rev||0).toLocaleString()} | ${x.inv} inv | ${x.firstYr}-${x.lastYr}`));

  // Top states
  r = await pool.request().query(`
    SELECT sBillState, SUM(dblTranAmount) as rev, COUNT(DISTINCT lClientKey) as clients
    FROM tblInvoice WHERE lSalesRepKey = 225
    GROUP BY sBillState ORDER BY SUM(dblTranAmount) DESC
  `);
  console.log('\n=== TERRITORY ===');
  r.recordset.forEach(x => console.log(`  ${x.sBillState} | $${Math.round(x.rev||0).toLocaleString()} | ${x.clients} clients`));

  // Scope type mix
  r = await pool.request().query(`
    SELECT ISNULL(s.sRigidOrFlexible,'Other') as scopeType, COUNT(*) as cnt
    FROM tblInvoice i
    LEFT JOIN tblScope s ON i.lScopeKey = s.lScopeKey
    WHERE i.lSalesRepKey = 225
    GROUP BY s.sRigidOrFlexible ORDER BY COUNT(*) DESC
  `);
  console.log('\n=== INSTRUMENT MIX ===');
  const total = r.recordset.reduce((s,x) => s+x.cnt, 0);
  r.recordset.forEach(x => console.log(`  ${x.scopeType}: ${x.cnt} (${Math.round(x.cnt/total*100)}%)`));

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
