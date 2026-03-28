const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};
(async () => {
  const pool = await sql.connect(config);

  // Find Bayhealth
  let r = await pool.request().query(`
    SELECT c.lClientKey, c.sClientName1, c.lSalesRepKey
    FROM tblClient c WHERE c.sClientName1 LIKE '%Bayhealth%' OR c.sClientName1 LIKE '%Bay Health%'
  `);
  console.log('=== BAYHEALTH CLIENT ===');
  r.recordset.forEach(x => console.log(`  Key:${x.lClientKey} | ${x.sClientName1} | Rep:${x.lSalesRepKey}`));

  // Find Bayhealth contracts
  r = await pool.request().query(`
    SELECT con.lContractKey, con.sContractName1, con.dtDateEffective, con.dtDateTermination,
           con.dblAmtTotal, con.lSalesRepKey, con.lContractLengthInMonths,
           sr.sRepFirst + ' ' + sr.sRepLast as repName
    FROM tblContract con
    JOIN tblSalesRep sr ON con.lSalesRepKey = sr.lSalesRepKey
    WHERE con.lClientKey IN (SELECT lClientKey FROM tblClient WHERE sClientName1 LIKE '%Bayhealth%' OR sClientName1 LIKE '%Bay Health%')
       OR con.sContractName1 LIKE '%Bayhealth%' OR con.sContractName1 LIKE '%Bay Health%'
    ORDER BY con.dtDateEffective DESC
  `);
  console.log('\n=== BAYHEALTH CONTRACTS ===');
  r.recordset.forEach(x => console.log(`  Contract#${x.lContractKey} | ${x.sContractName1} | ${x.repName} [${x.lSalesRepKey}] | $${Math.round(x.dblAmtTotal||0).toLocaleString()} | ${x.dtDateEffective?.toISOString().split('T')[0]} to ${x.dtDateTermination?.toISOString().split('T')[0]} | ${x.lContractLengthInMonths}mo`));

  // Check contract billing schedule for Bayhealth
  if (r.recordset.length > 0) {
    const contractKey = r.recordset[0].lContractKey;
    const sched = await pool.request().input('ck', contractKey).query(`
      SELECT TOP 20 * FROM tblContractDepartmentInvoiceSchedule
      WHERE lContractKey = @ck ORDER BY dtBillDate DESC
    `);
    console.log('\n=== BILLING SCHEDULE ===');
    console.log('Columns:', sched.recordset.length > 0 ? Object.keys(sched.recordset[0]).join(', ') : 'empty');
    sched.recordset.forEach(x => console.log(JSON.stringify(x)));
  }

  // Check invoices for Bayhealth
  r = await pool.request().query(`
    SELECT YEAR(i.dtTranDate) as yr, i.sRepFirst + ' ' + i.sRepLast as rep,
           i.lContractKey, COUNT(*) as inv, SUM(i.dblTranAmount) as rev,
           SUM(CASE WHEN i.dblTranAmount = 0 THEN 1 ELSE 0 END) as zeroAmt
    FROM tblInvoice i
    WHERE i.sBillName1 LIKE '%Bayhealth%' OR i.sBillName1 LIKE '%Bay Health%'
       OR i.lClientKey IN (SELECT lClientKey FROM tblClient WHERE sClientName1 LIKE '%Bayhealth%')
    GROUP BY YEAR(i.dtTranDate), i.sRepFirst, i.sRepLast, i.lContractKey
    ORDER BY yr DESC
  `);
  console.log('\n=== BAYHEALTH INVOICES ===');
  r.recordset.forEach(x => console.log(`  ${x.yr} | ${x.rep} | Contract#${x.lContractKey} | ${x.inv} inv | $${Math.round(x.rev||0).toLocaleString()} | ${x.zeroAmt} at $0`));

  // Also check the contract installment/invoice tables
  r = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME LIKE '%ContractDepartment%' AND COLUMN_NAME LIKE '%Amount%' OR
          (TABLE_NAME LIKE '%ContractDepartment%' AND COLUMN_NAME LIKE '%Bill%')
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);
  console.log('\n=== CONTRACT BILLING COLUMNS ===');
  r.recordset.forEach(x => console.log(`  ${x.TABLE_NAME}.${x.COLUMN_NAME}`));

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
