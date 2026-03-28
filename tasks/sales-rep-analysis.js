const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet',
  driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000 }
};

function $(n) { return Math.round(n||0).toLocaleString(); }

(async () => {
  const pool = await sql.connect(config);

  // 1. Active sales rep roster
  const reps = await pool.request().query(`
    SELECT lSalesRepKey, sRepFirst + ' ' + sRepLast as repName, sActiveFlag,
           dblDefltCommPctIn, dblDefltCommPctOut
    FROM tblSalesRep WHERE sActiveFlag = 'Y'
    ORDER BY sRepLast
  `);
  console.log('=== ACTIVE SALES REPS ===');
  reps.recordset.forEach(r =>
    console.log(`  [${r.lSalesRepKey}] ${r.repName} | CommIn:${r.dblDefltCommPctIn}% CommOut:${r.dblDefltCommPctOut}%`)
  );

  // 2. Clients per rep (top 20 by client count)
  const clientsByRep = await pool.request().query(`
    SELECT TOP 20
           sr.sRepFirst + ' ' + sr.sRepLast as repName, sr.sActiveFlag as repActive,
           COUNT(DISTINCT c.lClientKey) as clientCount,
           SUM(CASE WHEN c.bActive = 1 THEN 1 ELSE 0 END) as activeClients
    FROM tblClient c
    JOIN tblSalesRep sr ON c.lSalesRepKey = sr.lSalesRepKey
    GROUP BY sr.sRepFirst, sr.sRepLast, sr.sActiveFlag
    ORDER BY clientCount DESC
  `);
  console.log('\n=== TOP 20 REPS BY CLIENT COUNT ===');
  clientsByRep.recordset.forEach(r =>
    console.log(`  ${r.repName} (${r.repActive === 'Y' ? 'active' : 'fmr'}): ${r.clientCount} total, ${r.activeClients} active`)
  );

  // 3. Repair volume & revenue by rep by year (using dblAmtRepair, going thru dept→client→rep)
  const repairsByRep = await pool.request().query(`
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           YEAR(r.dtDateIn) as yr,
           COUNT(*) as repairCount,
           SUM(r.dblAmtRepair) as totalRevenue,
           AVG(r.dblAmtRepair) as avgTicket,
           COUNT(DISTINCT d.lClientKey) as uniqueClients
    FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblSalesRep sr ON r.lSalesRepKey = sr.lSalesRepKey
    WHERE YEAR(r.dtDateIn) >= 2022 AND r.lSalesRepKey > 0
    GROUP BY sr.sRepFirst, sr.sRepLast, YEAR(r.dtDateIn)
    ORDER BY sr.sRepLast, yr
  `);
  console.log('\n=== REPAIRS & REVENUE BY REP BY YEAR ===');
  repairsByRep.recordset.forEach(r =>
    console.log(`  ${r.repName} | ${r.yr} | ${r.repairCount} repairs | $${$(r.totalRevenue)} rev | $${$(r.avgTicket)} avg | ${r.uniqueClients} clients`)
  );

  // 4. Invoiced revenue by rep by year (from tblRptSalesRepInvoiced — actual billed)
  const invoicedByRep = await pool.request().query(`
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           YEAR(i.dtTranDate) as yr,
           COUNT(*) as invoiceLines,
           SUM(i.dblTranAmount) as invoicedRevenue,
           SUM(i.dblShippingAmt) as shippingRevenue,
           COUNT(DISTINCT i.sBillName1) as billedClients
    FROM tblRptSalesRepInvoiced i
    JOIN tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKey
    WHERE YEAR(i.dtTranDate) >= 2022
    GROUP BY sr.sRepFirst, sr.sRepLast, YEAR(i.dtTranDate)
    ORDER BY sr.sRepLast, yr
  `);
  console.log('\n=== INVOICED REVENUE BY REP BY YEAR ===');
  invoicedByRep.recordset.forEach(r =>
    console.log(`  ${r.repName} | ${r.yr} | $${$(r.invoicedRevenue)} invoiced | $${$(r.shippingRevenue)} shipping | ${r.billedClients} clients | ${r.invoiceLines} lines`)
  );

  // 5. Active contracts by rep
  const contractsByRep = await pool.request().query(`
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           COUNT(DISTINCT con.lContractKey) as contractCount,
           SUM(con.dblAmtTotal) as totalContractValue,
           SUM(con.dblAmtTotal) / NULLIF(SUM(con.lContractLengthInMonths), 0) * 12 as annualizedValue
    FROM tblContract con
    JOIN tblSalesRep sr ON con.lSalesRepKey = sr.lSalesRepKey
    WHERE con.dtDateTermination > GETDATE()
    GROUP BY sr.sRepFirst, sr.sRepLast
    ORDER BY totalContractValue DESC
  `);
  console.log('\n=== ACTIVE CONTRACTS BY REP ===');
  contractsByRep.recordset.forEach(r =>
    console.log(`  ${r.repName}: ${r.contractCount} contracts | $${$(r.totalContractValue)} total value | ~$${$(r.annualizedValue)}/yr annualized`)
  );

  // 6. Net new clients by rep by year (first repair = acquisition)
  const netNew = await pool.request().query(`
    WITH FirstRepair AS (
      SELECT d.lClientKey, r.lSalesRepKey, MIN(r.dtDateIn) as firstRepairDate
      FROM tblRepair r
      JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
      WHERE r.lSalesRepKey > 0
      GROUP BY d.lClientKey, r.lSalesRepKey
    )
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           YEAR(fr.firstRepairDate) as yr,
           COUNT(*) as newClients
    FROM FirstRepair fr
    JOIN tblSalesRep sr ON fr.lSalesRepKey = sr.lSalesRepKey
    WHERE YEAR(fr.firstRepairDate) >= 2020
    GROUP BY sr.sRepFirst, sr.sRepLast, YEAR(fr.firstRepairDate)
    ORDER BY sr.sRepLast, yr
  `);
  console.log('\n=== NET NEW CLIENTS BY REP BY YEAR ===');
  netNew.recordset.forEach(r =>
    console.log(`  ${r.repName} | ${r.yr} | ${r.newClients} new clients`)
  );

  // 7. First-year revenue from newly acquired clients (2020+)
  const firstYearRev = await pool.request().query(`
    WITH FirstRepair AS (
      SELECT d.lClientKey, r.lSalesRepKey, MIN(r.dtDateIn) as firstDate
      FROM tblRepair r
      JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
      WHERE r.lSalesRepKey > 0
      GROUP BY d.lClientKey, r.lSalesRepKey
    ),
    FirstYearRevenue AS (
      SELECT fr.lClientKey, fr.lSalesRepKey, fr.firstDate,
             SUM(r.dblAmtRepair) as firstYearRev,
             COUNT(*) as firstYearRepairs
      FROM FirstRepair fr
      JOIN tblDepartment d ON fr.lClientKey = d.lClientKey
      JOIN tblRepair r ON d.lDepartmentKey = r.lDepartmentKey
        AND r.dtDateIn >= fr.firstDate
        AND r.dtDateIn < DATEADD(year, 1, fr.firstDate)
      GROUP BY fr.lClientKey, fr.lSalesRepKey, fr.firstDate
    )
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           COUNT(*) as clientsAnalyzed,
           AVG(fyr.firstYearRev) as avgFirstYearRev,
           SUM(fyr.firstYearRev) as totalFirstYearRev,
           AVG(CAST(fyr.firstYearRepairs AS FLOAT)) as avgFirstYearRepairs
    FROM FirstYearRevenue fyr
    JOIN tblSalesRep sr ON fyr.lSalesRepKey = sr.lSalesRepKey
    WHERE YEAR(fyr.firstDate) >= 2020
    GROUP BY sr.sRepFirst, sr.sRepLast
    ORDER BY avgFirstYearRev DESC
  `);
  console.log('\n=== FIRST-YEAR REVENUE PER NEW CLIENT (acquired 2020+) ===');
  firstYearRev.recordset.forEach(r =>
    console.log(`  ${r.repName}: ${r.clientsAnalyzed} new clients | avg $${$(r.avgFirstYearRev)} 1st-yr rev | avg ${Math.round(r.avgFirstYearRepairs)} repairs | total $${$(r.totalFirstYearRev)}`)
  );

  // 8. Company totals for context
  const totals = await pool.request().query(`
    SELECT YEAR(r.dtDateIn) as yr,
           COUNT(*) as totalRepairs,
           SUM(r.dblAmtRepair) as totalRevenue,
           COUNT(DISTINCT d.lClientKey) as totalClients,
           AVG(r.dblAmtRepair) as avgTicket
    FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    WHERE YEAR(r.dtDateIn) >= 2022
    GROUP BY YEAR(r.dtDateIn)
    ORDER BY yr
  `);
  console.log('\n=== COMPANY TOTALS FOR CONTEXT ===');
  totals.recordset.forEach(r =>
    console.log(`  ${r.yr}: ${r.totalRepairs} repairs | $${$(r.totalRevenue)} revenue | ${r.totalClients} clients | $${$(r.avgTicket)} avg ticket`)
  );

  // 9. Contract vs non-contract revenue split by rep
  const contractSplit = await pool.request().query(`
    SELECT sr.sRepFirst + ' ' + sr.sRepLast as repName,
           YEAR(r.dtDateIn) as yr,
           SUM(CASE WHEN r.lContractKey > 0 THEN r.dblAmtRepair ELSE 0 END) as contractRev,
           SUM(CASE WHEN r.lContractKey = 0 OR r.lContractKey IS NULL THEN r.dblAmtRepair ELSE 0 END) as nonContractRev,
           COUNT(CASE WHEN r.lContractKey > 0 THEN 1 END) as contractRepairs,
           COUNT(CASE WHEN r.lContractKey = 0 OR r.lContractKey IS NULL THEN 1 END) as nonContractRepairs
    FROM tblRepair r
    JOIN tblSalesRep sr ON r.lSalesRepKey = sr.lSalesRepKey
    WHERE YEAR(r.dtDateIn) >= 2023 AND r.lSalesRepKey > 0
    GROUP BY sr.sRepFirst, sr.sRepLast, YEAR(r.dtDateIn)
    ORDER BY sr.sRepLast, yr
  `);
  console.log('\n=== CONTRACT vs NON-CONTRACT REVENUE BY REP ===');
  contractSplit.recordset.forEach(r =>
    console.log(`  ${r.repName} | ${r.yr} | Contract: $${$(r.contractRev)} (${r.contractRepairs}) | T&M: $${$(r.nonContractRev)} (${r.nonContractRepairs})`)
  );

  pool.close();
  console.log('\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
