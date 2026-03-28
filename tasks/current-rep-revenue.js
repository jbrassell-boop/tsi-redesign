const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 120000
};

(async () => {
  const pool = await sql.connect(config);

  // Current active rep roster with 2024 + 2025 revenue from BOTH sources
  // FFS from tblInvoice
  const ffs = await pool.request().query(`
    SELECT i.lSalesRepKey,
           MIN(i.sRepFirst + ' ' + i.sRepLast) as repName,
           SUM(CASE WHEN YEAR(i.dtTranDate) = 2024 THEN i.dblTranAmount ELSE 0 END) as ffs2024,
           SUM(CASE WHEN YEAR(i.dtTranDate) = 2025 THEN i.dblTranAmount ELSE 0 END) as ffs2025,
           SUM(CASE WHEN YEAR(i.dtTranDate) = 2026 THEN i.dblTranAmount ELSE 0 END) as ffs2026,
           COUNT(DISTINCT CASE WHEN YEAR(i.dtTranDate) = 2025 THEN i.lClientKey END) as clients2025
    FROM tblInvoice i
    WHERE i.lSalesRepKey > 2
      AND YEAR(i.dtTranDate) >= 2024
      AND i.sRepFirst NOT LIKE 'BSC%' AND i.sRepFirst NOT LIKE 'FMR%'
      AND i.sRepLast NOT LIKE '%test%' AND i.sRepFirst NOT LIKE '%test%'
      AND i.sRepLast NOT LIKE '%Account%' AND i.sRepLast NOT LIKE '%Legacy%'
      AND i.sRepLast NOT LIKE '%Demo%' AND i.sRepLast NOT LIKE '%Vet%'
      AND i.sRepFirst NOT LIKE 'EC %' AND i.sRepFirst NOT LIKE 'Cogentix%'
      AND i.sRepFirst NOT LIKE 'ORTHO%' AND i.sRepFirst NOT LIKE 'TITAN%'
      AND i.sRepFirst NOT LIKE 'Aesculap%' AND i.sRepFirst NOT LIKE 'Boston%'
      AND i.sRepFirst NOT LIKE 'Chesapeake%' AND i.sRepFirst NOT LIKE 'Endoscopy%'
      AND i.sRepFirst NOT LIKE 'MultiMedical%' AND i.sRepFirst NOT LIKE 'MytaMed%'
      AND i.sRepFirst NOT LIKE 'Parkcity%' AND i.sRepFirst NOT LIKE 'South %'
      AND i.sRepFirst NOT LIKE 'Westside%' AND i.sRepFirst NOT LIKE 'WHDC%'
      AND i.sRepFirst NOT LIKE 'Renovo%' AND i.sRepLast NOT LIKE 'Doe'
      AND i.sRepLast NOT LIKE '%Scientific%'
    GROUP BY i.lSalesRepKey
    HAVING SUM(CASE WHEN YEAR(i.dtTranDate) = 2025 THEN i.dblTranAmount ELSE 0 END) > 0
       OR SUM(CASE WHEN YEAR(i.dtTranDate) = 2024 THEN i.dblTranAmount ELSE 0 END) > 0
  `);

  // Contract billing by rep (using contract's lSalesRepKey)
  const con = await pool.request().query(`
    SELECT con.lSalesRepKey,
           SUM(CASE WHEN YEAR(cds.dtInvoiceDate) = 2024 THEN cds.nInvoiceAmount ELSE 0 END) as con2024,
           SUM(CASE WHEN YEAR(cds.dtInvoiceDate) = 2025 THEN cds.nInvoiceAmount ELSE 0 END) as con2025,
           SUM(CASE WHEN YEAR(cds.dtInvoiceDate) = 2026 THEN cds.nInvoiceAmount ELSE 0 END) as con2026,
           COUNT(DISTINCT con.lContractKey) as contractCount
    FROM tblContractDepartmentInvoiceSchedule cds
    JOIN tblContract con ON cds.lContractKey = con.lContractKey
    WHERE cds.nInvoiceAmount > 0
      AND YEAR(cds.dtInvoiceDate) >= 2024
      AND con.lSalesRepKey > 2
    GROUP BY con.lSalesRepKey
  `);

  // Merge
  const reps = {};
  ffs.recordset.forEach(r => {
    reps[r.lSalesRepKey] = {
      name: r.repName.trim(), key: r.lSalesRepKey,
      ffs2024: r.ffs2024, ffs2025: r.ffs2025, ffs2026: r.ffs2026,
      con2024: 0, con2025: 0, con2026: 0, contractCount: 0,
      clients2025: r.clients2025
    };
  });
  con.recordset.forEach(r => {
    if (!reps[r.lSalesRepKey]) {
      // Rep has only contract revenue, no FFS
      const nameR = pool.request();
      reps[r.lSalesRepKey] = {
        name: 'Rep #' + r.lSalesRepKey, key: r.lSalesRepKey,
        ffs2024: 0, ffs2025: 0, ffs2026: 0,
        con2024: 0, con2025: 0, con2026: 0, contractCount: 0,
        clients2025: 0
      };
    }
    reps[r.lSalesRepKey].con2024 = r.con2024;
    reps[r.lSalesRepKey].con2025 = r.con2025;
    reps[r.lSalesRepKey].con2026 = r.con2026;
    reps[r.lSalesRepKey].contractCount = r.contractCount;
  });

  // Get rep names for contract-only reps
  const nameResult = await pool.request().query(`SELECT lSalesRepKey, sRepFirst + ' ' + sRepLast as n FROM tblSalesRep`);
  nameResult.recordset.forEach(x => {
    if (reps[x.lSalesRepKey] && reps[x.lSalesRepKey].name.startsWith('Rep #')) {
      reps[x.lSalesRepKey].name = (x.n || '').trim();
    }
  });

  // Output sorted by 2025 total revenue
  const sorted = Object.values(reps)
    .map(r => ({ ...r, total2025: r.ffs2025 + r.con2025, total2024: r.ffs2024 + r.con2024 }))
    .filter(r => r.total2025 > 0 || r.total2024 > 50000)
    .sort((a, b) => b.total2025 - a.total2025);

  console.log('=== CURRENT REP REVENUE ROSTER (2024-2026) ===');
  console.log('Name | 2024 FFS | 2024 Contract | 2024 Total | 2025 FFS | 2025 Contract | 2025 Total | 2026 FFS | 2026 Contract | Contracts | Clients2025');
  sorted.forEach(r => {
    console.log([
      r.name,
      Math.round(r.ffs2024), Math.round(r.con2024), Math.round(r.ffs2024 + r.con2024),
      Math.round(r.ffs2025), Math.round(r.con2025), Math.round(r.ffs2025 + r.con2025),
      Math.round(r.ffs2026), Math.round(r.con2026),
      r.contractCount, r.clients2025
    ].join('|'));
  });

  // Totals
  let totFFS24 = 0, totCon24 = 0, totFFS25 = 0, totCon25 = 0;
  sorted.forEach(r => { totFFS24 += r.ffs2024; totCon24 += r.con2024; totFFS25 += r.ffs2025; totCon25 += r.con2025; });
  console.log('\n=== COMPANY TOTALS ===');
  console.log('2024: FFS $' + Math.round(totFFS24).toLocaleString() + ' + Contract $' + Math.round(totCon24).toLocaleString() + ' = Total $' + Math.round(totFFS24 + totCon24).toLocaleString());
  console.log('2025: FFS $' + Math.round(totFFS25).toLocaleString() + ' + Contract $' + Math.round(totCon25).toLocaleString() + ' = Total $' + Math.round(totFFS25 + totCon25).toLocaleString());

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
