const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};
(async () => {
  const pool = await sql.connect(config);

  // Check what sUnderContract looks like on tblRptSalesRepInvoiced
  let r = await pool.request().query(`
    SELECT DISTINCT sUnderContract FROM tblRptSalesRepInvoiced
  `);
  console.log('sUnderContract values:', r.recordset.map(x => x.sUnderContract));

  // Check scope types on invoices — what does C mean?
  r = await pool.request().query(`
    SELECT DISTINCT s.sRigidOrFlexible, s.sScopeTypeDesc,
           COUNT(*) as cnt
    FROM tblInvoice i
    JOIN tblScope s ON i.lScopeKey = s.lScopeKey
    WHERE s.sRigidOrFlexible IS NOT NULL
    GROUP BY s.sRigidOrFlexible, s.sScopeTypeDesc
    ORDER BY s.sRigidOrFlexible, cnt DESC
  `);
  console.log('\n=== SCOPE TYPES ON INVOICES ===');
  r.recordset.slice(0, 30).forEach(x => console.log(`  ${x.sRigidOrFlexible} | ${x.sScopeTypeDesc} | ${x.cnt} invoices`));

  // Check lContractKey distribution
  r = await pool.request().query(`
    SELECT
      SUM(CASE WHEN lContractKey > 0 THEN 1 ELSE 0 END) as withContract,
      SUM(CASE WHEN lContractKey = 0 OR lContractKey IS NULL THEN 1 ELSE 0 END) as noContract,
      COUNT(*) as total,
      SUM(CASE WHEN lContractKey > 0 THEN dblTranAmount ELSE 0 END) as contractRev,
      SUM(CASE WHEN lContractKey = 0 OR lContractKey IS NULL THEN dblTranAmount ELSE 0 END) as ffsRev
    FROM tblInvoice
  `);
  console.log('\n=== lContractKey ON tblInvoice ===');
  console.log(`  With contract: ${r.recordset[0].withContract} inv ($${Math.round(r.recordset[0].contractRev).toLocaleString()})`);
  console.log(`  No contract: ${r.recordset[0].noContract} inv ($${Math.round(r.recordset[0].ffsRev).toLocaleString()})`);

  // Check if there's a contract type column on invoice
  r = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='tblInvoice' AND (COLUMN_NAME LIKE '%Contract%' OR COLUMN_NAME LIKE '%Type%')
  `);
  console.log('\nContract/Type columns on tblInvoice:', r.recordset.map(x => x.COLUMN_NAME));

  // Sample invoices WITH lContractKey > 0
  r = await pool.request().query(`
    SELECT TOP 10 i.sRepFirst + ' ' + i.sRepLast as rep, i.sBillName1, i.lContractKey,
           i.dblTranAmount, YEAR(i.dtTranDate) as yr, s.sRigidOrFlexible, s.sScopeTypeDesc
    FROM tblInvoice i
    LEFT JOIN tblScope s ON i.lScopeKey = s.lScopeKey
    WHERE i.lContractKey > 0 AND i.dblTranAmount > 0
    ORDER BY i.dblTranAmount DESC
  `);
  console.log('\n=== SAMPLE CONTRACT INVOICES (with revenue > 0) ===');
  r.recordset.forEach(x => console.log(`  ${x.rep} | ${x.sBillName1} | Contract#${x.lContractKey} | $${Math.round(x.dblTranAmount)} | ${x.yr} | ${x.sRigidOrFlexible} ${x.sScopeTypeDesc || ''}`));

  // Check: how are contract invoices billed? Many show $0
  r = await pool.request().query(`
    SELECT
      SUM(CASE WHEN dblTranAmount = 0 THEN 1 ELSE 0 END) as zeroAmt,
      SUM(CASE WHEN dblTranAmount > 0 THEN 1 ELSE 0 END) as nonZero,
      SUM(CASE WHEN dblTranAmount < 0 THEN 1 ELSE 0 END) as negative,
      COUNT(*) as total
    FROM tblInvoice WHERE lContractKey > 0
  `);
  console.log('\n=== CONTRACT INVOICE AMOUNTS ===');
  console.log(`  $0: ${r.recordset[0].zeroAmt} | >$0: ${r.recordset[0].nonZero} | <$0: ${r.recordset[0].negative} | Total: ${r.recordset[0].total}`);

  // Check the contract billing tables
  r = await pool.request().query(`
    SELECT TOP 5 * FROM tblContractDepartmentInvoiceSchedule ORDER BY dtBillDate DESC
  `);
  console.log('\n=== tblContractDepartmentInvoiceSchedule (sample) ===');
  if (r.recordset.length > 0) {
    console.log(Object.keys(r.recordset[0]).join(', '));
    r.recordset.forEach(x => console.log(JSON.stringify(x)));
  }

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
