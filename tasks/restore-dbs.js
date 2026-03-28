const sql = require('mssql/msnodesqlv8');
const config = {
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;'
};

const BS = String.fromCharCode(92);  // backslash
const Q = String.fromCharCode(39);   // single quote
const dataDir = `C:${BS}Program Files${BS}Microsoft SQL Server${BS}MSSQL16.SQLEXPRESS${BS}MSSQL${BS}DATA${BS}`;

const databases = [
  {
    name: 'WinScopeNet',
    bak: `C:${BS}TSI${BS}E_L_WinScopeNet_backup_2026_03_13_160001_9437378.bak`,
    logicalData: 'WinScopeNETdat',
    logicalLog: 'WinScopeNETlog'
  },
  {
    name: 'WinScopeNetNashville',
    bak: `C:${BS}TSI${BS}E_L_WinScopeNetNashville_backup_2026_03_13_190007_4819399.bak`,
    logicalData: null, // will discover
    logicalLog: null
  },
  {
    name: 'TSIPortal',
    bak: `C:${BS}TSI${BS}E_L_TSIPortal_backup_2026_03_13_160001_9398741.bak`,
    logicalData: null,
    logicalLog: null
  }
];

async function run() {
  const pool = await sql.connect(config);

  for (const db of databases) {
    console.log(`\n=== ${db.name} ===`);

    // Get logical names if not known
    if (!db.logicalData) {
      const fl = await pool.request().query(`RESTORE FILELISTONLY FROM DISK = N${Q}${db.bak}${Q}`);
      fl.recordset.forEach(row => {
        console.log(`  Logical: ${row.LogicalName} (${row.Type})`);
        if (row.Type === 'D') db.logicalData = row.LogicalName;
        if (row.Type === 'L') db.logicalLog = row.LogicalName;
      });
    }

    console.log(`  Restoring ${db.name}...`);
    const restoreSQL = `RESTORE DATABASE [${db.name}] FROM DISK = N${Q}${db.bak}${Q} `
      + `WITH MOVE N${Q}${db.logicalData}${Q} TO N${Q}${dataDir}${db.name}.mdf${Q}, `
      + `MOVE N${Q}${db.logicalLog}${Q} TO N${Q}${dataDir}${db.name}_log.ldf${Q}, `
      + `REPLACE`;

    try {
      await pool.request().query(restoreSQL);
      console.log(`  ${db.name} restored OK!`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
      if (e.precedingErrors) e.precedingErrors.forEach(pe => console.error(`  Detail: ${pe.message}`));
    }
  }

  // Verify
  const dbs = await pool.request().query('SELECT name FROM sys.databases ORDER BY name');
  console.log('\nAll databases:', dbs.recordset.map(r => r.name).join(', '));

  await sql.close();
}

run().catch(e => { console.error('Fatal:', e.message); sql.close(); });
