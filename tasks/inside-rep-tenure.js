const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};

const outsideKeys = new Set([105, 80, 206, 229, 122, 123, 115, 104, 126, 225]);

(async () => {
  const pool = await sql.connect(config);

  const r = await pool.request().query(`
    SELECT lSalesRepKey,
           MIN(sRepFirst + ' ' + sRepLast) as repName,
           MIN(dtTranDate) as firstInvoice,
           MAX(dtTranDate) as lastInvoice,
           DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) as monthsActive,
           DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) / 12 as yearsActive,
           COUNT(*) as totalInv,
           SUM(dblTranAmount) as totalRev,
           COUNT(DISTINCT lClientKey) as totalClients
    FROM tblInvoice
    WHERE lSalesRepKey > 2
      AND sRepFirst NOT LIKE 'BSC%' AND sRepFirst NOT LIKE 'FMR%'
      AND sRepLast NOT LIKE '%test%' AND sRepFirst NOT LIKE '%test%'
      AND sRepLast NOT LIKE '%Account%' AND sRepLast NOT LIKE '%Legacy%'
      AND sRepLast NOT LIKE '%Demo%' AND sRepLast NOT LIKE '%Vet%'
      AND sRepFirst NOT LIKE 'EC %' AND sRepFirst NOT LIKE 'Cogentix%'
      AND sRepFirst NOT LIKE 'ORTHO%' AND sRepFirst NOT LIKE 'TITAN%'
      AND sRepFirst NOT LIKE 'Aesculap%' AND sRepFirst NOT LIKE 'Boston%'
      AND sRepFirst NOT LIKE 'Chesapeake%' AND sRepFirst NOT LIKE 'Endoscopy%'
      AND sRepFirst NOT LIKE 'MultiMedical%' AND sRepFirst NOT LIKE 'MytaMed%'
      AND sRepFirst NOT LIKE 'Parkcity%' AND sRepFirst NOT LIKE 'South %'
      AND sRepFirst NOT LIKE 'Westside%' AND sRepFirst NOT LIKE 'WHDC%'
      AND sRepFirst NOT LIKE 'Renovo%' AND sRepLast NOT LIKE 'Doe'
      AND sRepLast NOT LIKE '%Scientific%'
    GROUP BY lSalesRepKey
    HAVING COUNT(*) >= 20
    ORDER BY DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) DESC
  `);

  // Separate inside vs outside
  const inside = r.recordset.filter(x => !outsideKeys.has(x.lSalesRepKey));

  console.log('=== INSIDE REP TENURE DISTRIBUTION ===');
  const buckets = { '< 1yr': 0, '1-2yr': 0, '2-3yr': 0, '3-4yr': 0, '4-5yr': 0, '5+ yr': 0 };
  inside.forEach(rep => {
    const yrs = rep.yearsActive;
    if (yrs < 1) buckets['< 1yr']++;
    else if (yrs < 2) buckets['1-2yr']++;
    else if (yrs < 3) buckets['2-3yr']++;
    else if (yrs < 4) buckets['3-4yr']++;
    else if (yrs < 5) buckets['4-5yr']++;
    else buckets['5+ yr']++;
  });
  console.log(`Total inside reps (20+ invoices): ${inside.length}`);
  for (const [bucket, count] of Object.entries(buckets)) {
    console.log(`  ${bucket}: ${count} reps (${Math.round(count/inside.length*100)}%)`);
  }

  console.log('\n=== INSIDE REPS WITH 5+ YEARS ===');
  const fivePlus = inside.filter(x => x.yearsActive >= 5);
  fivePlus.forEach(rep => {
    console.log(`  ${rep.repName} | ${rep.yearsActive}yr (${rep.firstInvoice.toISOString().split('T')[0]} to ${rep.lastInvoice.toISOString().split('T')[0]}) | $${Math.round(rep.totalRev).toLocaleString()} | ${rep.totalClients} clients | ${rep.totalInv} inv`);
  });
  console.log(`\nTotal 5+ year inside reps: ${fivePlus.length} out of ${inside.length} (${Math.round(fivePlus.length/inside.length*100)}%)`);

  console.log('\n=== INSIDE REPS WITH 3+ YEARS ===');
  const threePlus = inside.filter(x => x.yearsActive >= 3);
  console.log(`Total 3+ year inside reps: ${threePlus.length} out of ${inside.length} (${Math.round(threePlus.length/inside.length*100)}%)`);
  threePlus.forEach(rep => {
    console.log(`  ${rep.repName} | ${rep.yearsActive}yr | $${Math.round(rep.totalRev).toLocaleString()} | ${rep.totalClients} clients`);
  });

  console.log('\n=== ALL INSIDE REPS (sorted by tenure) ===');
  inside.sort((a, b) => b.yearsActive - a.yearsActive);
  inside.forEach(rep => {
    console.log(`  ${rep.repName.padEnd(28)} | ${String(rep.yearsActive).padStart(2)}yr | $${Math.round(rep.totalRev).toLocaleString().padStart(12)} | ${String(rep.totalClients).padStart(3)} clients`);
  });

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
