const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;'
};
(async () => {
  const pool = await sql.connect(config);

  // Kenney: invoice start 2011-03-14, contract billing starts 2020
  // tenure year 10 = month 108-119, which is 2020-03 to 2021-02
  // So his contracts fall in years 10-16
  let r = await pool.request().query(`
    WITH RS AS (SELECT CAST('2011-03-14' AS DATE) as startDate)
    SELECT DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as rev, COUNT(*) as rows
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    CROSS JOIN RS rs
    WHERE con.lSalesRepKey = 197 AND cds.nInvoiceAmount > 0
    GROUP BY DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
    ORDER BY tenureYear
  `);
  console.log('Kenney [197] contract by tenure year (start 2011-03-14):');
  r.recordset.forEach(x => console.log('  Yr' + x.tenureYear + ': $' + Math.round(x.rev).toLocaleString()));

  // Bernie: invoice start
  r = await pool.request().query("SELECT MIN(dtTranDate) as first FROM tblInvoice WHERE lSalesRepKey = 80");
  console.log('\nBernie [80] invoice start:', r.recordset[0].first.toISOString().split('T')[0]);
  // His contract billing start
  r = await pool.request().query(`
    SELECT MIN(cds.dtInvoiceDate) as first FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE con.lSalesRepKey = 80 AND cds.nInvoiceAmount > 0
  `);
  console.log('Bernie [80] contract billing start:', r.recordset[0].first.toISOString().split('T')[0]);

  r = await pool.request().query(`
    WITH RS AS (SELECT CAST('2001-08-13' AS DATE) as startDate)
    SELECT DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1 as tenureYear,
           SUM(cds.nInvoiceAmount) as rev
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    CROSS JOIN RS rs
    WHERE con.lSalesRepKey = 80 AND cds.nInvoiceAmount > 0
    GROUP BY DATEDIFF(month, rs.startDate, cds.dtInvoiceDate) / 12 + 1
    ORDER BY tenureYear
  `);
  console.log('Bernie contract by tenure year (start 2001-08-13):');
  r.recordset.forEach(x => console.log('  Yr' + x.tenureYear + ': $' + Math.round(x.rev).toLocaleString()));

  // AH HA - the issue is clear. These contracts land in tenure years 10-25,
  // but our analysis only goes to year 10! Kenney's $4.8M is in years 10-16.
  // Bernie's Bayhealth is in year 23-25 (2024 minus 2001 start).

  // The fix: we need to either extend the range OR use a different start date
  // for reps who left and came back.

  console.log('\n=== THE PROBLEM ===');
  console.log('Contracts fall OUTSIDE the 1-10 tenure year window because:');
  console.log('- Kenney started invoicing in 2011, contracts started 2020 = Year 10+');
  console.log('- Bernie started invoicing in 2001, Bayhealth contract 2024 = Year 23!');
  console.log('');
  console.log('FIX: Extend tenure year range to capture all data, or show by calendar year instead.');

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
