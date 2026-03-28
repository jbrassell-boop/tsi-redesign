const sql = require('mssql/msnodesqlv8');
const config = {
  database: 'WinScopeNet', driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 60000
};

const outsideKeys = new Set([105, 80, 206, 229, 122, 123, 115, 104, 126, 225]);

(async () => {
  const pool = await sql.connect(config);

  // Get all inside reps with real activity check
  // For each rep: check actual active months (months with at least 1 invoice)
  const r = await pool.request().query(`
    WITH RepMonths AS (
      SELECT lSalesRepKey,
             MIN(sRepFirst + ' ' + sRepLast) as repName,
             MIN(dtTranDate) as firstInv,
             MAX(dtTranDate) as lastInv,
             COUNT(DISTINCT YEAR(dtTranDate) * 100 + MONTH(dtTranDate)) as activeMonths,
             COUNT(DISTINCT YEAR(dtTranDate)) as activeYears,
             DATEDIFF(month, MIN(dtTranDate), MAX(dtTranDate)) as spanMonths,
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
    )
    SELECT *,
           CAST(activeMonths AS FLOAT) / NULLIF(spanMonths, 0) * 100 as activityRate
    FROM RepMonths
    ORDER BY totalRev DESC
  `);

  const inside = r.recordset.filter(x => !outsideKeys.has(x.lSalesRepKey));

  // Apply Joe's rule: if 5+ year span but under $300K, remove
  console.log('=== INSIDE REPS — CLEANED ===');
  console.log('(Removed: 5+ year span with <$300K = ghost key)\n');

  const clean = inside.filter(x => {
    const spanYears = x.spanMonths / 12;
    if (spanYears >= 5 && x.totalRev < 300000) return false;
    return true;
  });

  // Show what got removed
  const removed = inside.filter(x => {
    const spanYears = x.spanMonths / 12;
    return spanYears >= 5 && x.totalRev < 300000;
  });
  console.log('REMOVED (ghost keys):');
  removed.forEach(x => console.log(`  ${x.repName} [${x.lSalesRepKey}] | span ${Math.round(x.spanMonths/12)}yr | $${Math.round(x.totalRev).toLocaleString()} | only ${x.activeMonths} active months out of ${x.spanMonths} span | ${Math.round(x.activityRate)}% activity`));

  // Now recount tenure using ACTIVE YEARS (years with invoices) instead of span
  console.log('\n=== CLEANED INSIDE REPS — BY ACTIVE YEARS ===');
  const buckets = { '< 1yr': 0, '1-2yr': 0, '2-3yr': 0, '3-4yr': 0, '4-5yr': 0, '5+ yr': 0 };
  clean.forEach(rep => {
    const yrs = rep.activeYears;
    if (yrs < 1) buckets['< 1yr']++;
    else if (yrs < 2) buckets['1-2yr']++;
    else if (yrs < 3) buckets['2-3yr']++;
    else if (yrs < 4) buckets['3-4yr']++;
    else if (yrs < 5) buckets['4-5yr']++;
    else buckets['5+ yr']++;
  });
  console.log(`Total clean inside reps: ${clean.length}`);
  for (const [bucket, count] of Object.entries(buckets)) {
    console.log(`  ${bucket}: ${count} reps (${Math.round(count/clean.length*100)}%)`);
  }

  // List the 5+ active year reps
  const fivePlus = clean.filter(x => x.activeYears >= 5).sort((a, b) => b.totalRev - a.totalRev);
  console.log(`\n=== INSIDE REPS WITH 5+ ACTIVE YEARS (cleaned) ===`);
  fivePlus.forEach(x => {
    console.log(`  ${x.repName.padEnd(28)} | ${x.activeYears} active yrs | ${x.activeMonths} active months / ${x.spanMonths} span (${Math.round(x.activityRate)}%) | $${Math.round(x.totalRev).toLocaleString().padStart(12)} | ${x.totalClients} clients`);
  });
  console.log(`\nTotal: ${fivePlus.length} inside reps with 5+ active years`);

  // Also show 3-4 year group
  const threeFour = clean.filter(x => x.activeYears >= 3 && x.activeYears < 5).sort((a, b) => b.totalRev - a.totalRev);
  console.log(`\n=== INSIDE REPS WITH 3-4 ACTIVE YEARS ===`);
  threeFour.forEach(x => {
    console.log(`  ${x.repName.padEnd(28)} | ${x.activeYears} active yrs | $${Math.round(x.totalRev).toLocaleString().padStart(12)} | ${x.totalClients} clients`);
  });

  // 1-2 year group
  const oneTwo = clean.filter(x => x.activeYears >= 1 && x.activeYears < 3).sort((a, b) => b.totalRev - a.totalRev);
  console.log(`\n=== INSIDE REPS WITH 1-2 ACTIVE YEARS ===`);
  oneTwo.forEach(x => {
    console.log(`  ${x.repName.padEnd(28)} | ${x.activeYears} active yrs | $${Math.round(x.totalRev).toLocaleString().padStart(12)} | ${x.totalClients} clients`);
  });

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
