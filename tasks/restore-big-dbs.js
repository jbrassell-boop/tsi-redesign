const sql = require('mssql/msnodesqlv8');
const config = {
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 600000  // 10 minutes
};

const BS = String.fromCharCode(92);
const Q = String.fromCharCode(39);
const dataDir = `C:${BS}Program Files${BS}Microsoft SQL Server${BS}MSSQL16.SQLEXPRESS${BS}MSSQL${BS}DATA${BS}`;

async function run() {
  const pool = await sql.connect(config);
  pool.config.requestTimeout = 600000;

  // Drop stuck databases first
  for (const dbName of ['WinScopeNet', 'WinScopeNetNashville']) {
    console.log(`Dropping ${dbName}...`);
    try {
      await pool.request().query(`DROP DATABASE [${dbName}]`);
      console.log(`  Dropped.`);
    } catch(e) {
      console.log(`  Drop note: ${e.message.substring(0, 100)}`);
    }
  }

  // Restore WinScopeNet (16GB - biggest)
  console.log('\nRestoring WinScopeNet (16GB, this will take a few minutes)...');
  const t1 = Date.now();
  try {
    const req = pool.request();
    req.timeout = 600000;
    const bakPath = `C:${BS}TSI${BS}E_L_WinScopeNet_backup_2026_03_13_160001_9437378.bak`;
    await req.query(
      `RESTORE DATABASE [WinScopeNet] FROM DISK = N${Q}${bakPath}${Q} `
      + `WITH MOVE N${Q}WinScopeNETdat${Q} TO N${Q}${dataDir}WinScopeNet.mdf${Q}, `
      + `MOVE N${Q}WinScopeNETlog${Q} TO N${Q}${dataDir}WinScopeNet_log.ldf${Q}, REPLACE`
    );
    console.log(`  WinScopeNet OK! (${Math.round((Date.now()-t1)/1000)}s)`);
  } catch(e) {
    console.error(`  FAILED (${Math.round((Date.now()-t1)/1000)}s): ${e.message}`);
    if (e.precedingErrors) e.precedingErrors.forEach(pe => console.error(`  Detail: ${pe.message}`));
  }

  // Restore Nashville (2.7GB)
  console.log('\nRestoring WinScopeNetNashville (2.7GB)...');
  const t2 = Date.now();
  try {
    const req = pool.request();
    req.timeout = 600000;
    const bakPath = `C:${BS}TSI${BS}E_L_WinScopeNetNashville_backup_2026_03_13_190007_4819399.bak`;
    await req.query(
      `RESTORE DATABASE [WinScopeNetNashville] FROM DISK = N${Q}${bakPath}${Q} `
      + `WITH MOVE N${Q}WinScopeNETdat${Q} TO N${Q}${dataDir}WinScopeNetNashville.mdf${Q}, `
      + `MOVE N${Q}WinScopeNETlog${Q} TO N${Q}${dataDir}WinScopeNetNashville_log.ldf${Q}, REPLACE`
    );
    console.log(`  Nashville OK! (${Math.round((Date.now()-t2)/1000)}s)`);
  } catch(e) {
    console.error(`  FAILED (${Math.round((Date.now()-t2)/1000)}s): ${e.message}`);
    if (e.precedingErrors) e.precedingErrors.forEach(pe => console.error(`  Detail: ${pe.message}`));
  }

  // Final check
  const dbs = await pool.request().query('SELECT name, state_desc FROM sys.databases ORDER BY name');
  console.log('\nFinal state:');
  dbs.recordset.forEach(r => console.log(`  ${r.name}: ${r.state_desc}`));

  await sql.close();
}

run().catch(e => { console.error('Fatal:', e.message); sql.close(); });
