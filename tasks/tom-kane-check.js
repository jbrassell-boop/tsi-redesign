const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};
(async () => {
  const pool = await sql.connect(config);
  const r = await pool.request().query(`
    SELECT lSalesRepKey, YEAR(dtTranDate) as yr,
           COUNT(*) as inv, SUM(dblTranAmount) as rev,
           COUNT(DISTINCT lClientKey) as clients
    FROM tblInvoice
    WHERE lSalesRepKey IN (206, 229)
    GROUP BY lSalesRepKey, YEAR(dtTranDate)
    ORDER BY lSalesRepKey, yr
  `);
  r.recordset.forEach(x => console.log(`Key ${x.lSalesRepKey} | ${x.yr} | ${x.inv} inv | $${Math.round(x.rev||0).toLocaleString()} | ${x.clients} clients`));
  pool.close();
})().catch(e => console.error(e.message));
