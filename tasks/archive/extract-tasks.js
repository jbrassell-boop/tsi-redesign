// Extract task data from WinScopeNetNashville + TSIPortal
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');

const NASH = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=WinScopeNetNashville;Trusted_Connection=yes;TrustServerCertificate=yes;';
const PORTAL = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=TSIPortal;Trusted_Connection=yes;TrustServerCertificate=yes;';

async function query(connStr, q) {
  const pool = await new sql.ConnectionPool({ connectionString: connStr }).connect();
  const r = await pool.request().query(q);
  await pool.close();
  return r.recordset;
}

async function run() {
  const result = {};

  console.log('=== Nashville Task Data ===');

  // Lookup tables
  result.taskTypes = await query(NASH, 'SELECT * FROM tblTaskTypes ORDER BY lTaskTypeKey');
  console.log('Types:', result.taskTypes.map(r => `${r.lTaskTypeKey}:${r.sTaskType}`).join(', '));

  result.taskStatuses = await query(NASH, 'SELECT TaskStatusKey, TaskStatus FROM tblTaskStatuses ORDER BY TaskStatusKey');
  console.log('Statuses:', result.taskStatuses.map(r => `${r.TaskStatusKey}:${r.TaskStatus}`).join(', '));

  result.taskPriorities = await query(NASH, 'SELECT * FROM tblTaskPriorities ORDER BY lTaskPriorityKey');
  console.log('Priorities:', result.taskPriorities.map(r => `${r.lTaskPriorityKey}:${r.sTaskPriority}`).join(', '));

  // tblTasks has NO status column — status lives in tblTaskStatusHistory (latest entry = current status)
  // Build a CTE to get current status per task
  const CURRENT_STATUS_CTE = `
    WITH CurrentStatus AS (
      SELECT lTaskKey, lTaskStatusKey, lUserKey,
        ROW_NUMBER() OVER (PARTITION BY lTaskKey ORDER BY dtTaskStatusDate DESC, lTaskStatusHistoryKey DESC) AS rn
      FROM tblTaskStatusHistory
    )`;

  // Distribution by current status
  console.log('\n--- Tasks by current status ---');
  const byStatus = await query(NASH, `${CURRENT_STATUS_CTE}
    SELECT ts.TaskStatus, COUNT(*) AS cnt
    FROM tblTasks t
    LEFT JOIN CurrentStatus cs ON t.lTaskKey = cs.lTaskKey AND cs.rn = 1
    LEFT JOIN tblTaskStatuses ts ON cs.lTaskStatusKey = ts.TaskStatusKey
    GROUP BY ts.TaskStatus ORDER BY cnt DESC`);
  byStatus.forEach(r => console.log(`  ${r.TaskStatus}: ${r.cnt}`));

  // By type
  console.log('\n--- Tasks by type ---');
  const byType = await query(NASH, `SELECT tt.sTaskType, COUNT(*) AS cnt
    FROM tblTasks t JOIN tblTaskTypes tt ON t.lTaskTypeKey = tt.lTaskTypeKey
    GROUP BY tt.sTaskType ORDER BY cnt DESC`);
  byType.forEach(r => console.log(`  ${r.sTaskType}: ${r.cnt}`));

  // By priority
  console.log('\n--- Tasks by priority ---');
  const byPriority = await query(NASH, `SELECT tp.sTaskPriority, COUNT(*) AS cnt
    FROM tblTasks t JOIN tblTaskPriorities tp ON t.lTaskPriorityKey = tp.lTaskPriorityKey
    GROUP BY tp.sTaskPriority ORDER BY cnt DESC`);
  byPriority.forEach(r => console.log(`  ${r.sTaskPriority}: ${r.cnt}`));

  // Repair linkage
  const repairLink = await query(NASH, `SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN lRepairKey IS NOT NULL AND lRepairKey > 0 THEN 1 ELSE 0 END) AS withRepair,
    SUM(CASE WHEN bFromPortal = 1 THEN 1 ELSE 0 END) AS fromPortal
    FROM tblTasks`);
  console.log(`\nTotal: ${repairLink[0].total}, With repair FK: ${repairLink[0].withRepair}, From portal: ${repairLink[0].fromPortal}`);

  // Date range
  const dates = await query(NASH, 'SELECT MIN(dtTaskDate) AS earliest, MAX(dtTaskDate) AS latest FROM tblTasks');
  console.log(`Date range: ${dates[0].earliest} to ${dates[0].latest}`);

  // Top assignees (from latest status history per task)
  console.log('\n--- Top assignees (from status history) ---');
  const assignees = await query(NASH, `${CURRENT_STATUS_CTE}
    SELECT TOP 10
      ISNULL(u.sUserFullName, 'System/Unknown') AS userName, COUNT(*) AS cnt
    FROM CurrentStatus cs
    LEFT JOIN tblUsers u ON cs.lUserKey = u.lUserKey
    WHERE cs.rn = 1
    GROUP BY u.sUserFullName ORDER BY cnt DESC`);
  assignees.forEach(r => console.log(`  ${r.userName}: ${r.cnt}`));

  // Extract recent 30 days for seed
  console.log('\n--- Extracting seed data (last 30 days) ---');
  result.tasks = await query(NASH, `${CURRENT_STATUS_CTE}
    SELECT t.*, cs.lTaskStatusKey, ts.TaskStatus, tt.sTaskType, tp.sTaskPriority,
      d.sDepartmentName, c.sClientName1 AS sClientName,
      ISNULL(u.sUserFullName, 'Unassigned') AS sAssignedTo,
      cs.lUserKey AS lAssignedToKey
    FROM tblTasks t
    LEFT JOIN CurrentStatus cs ON t.lTaskKey = cs.lTaskKey AND cs.rn = 1
    LEFT JOIN tblTaskStatuses ts ON cs.lTaskStatusKey = ts.TaskStatusKey
    JOIN tblTaskTypes tt ON t.lTaskTypeKey = tt.lTaskTypeKey
    JOIN tblTaskPriorities tp ON t.lTaskPriorityKey = tp.lTaskPriorityKey
    LEFT JOIN tblDepartment d ON t.lDepartmentKey = d.lDepartmentKey
    LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
    LEFT JOIN tblUsers u ON cs.lUserKey = u.lUserKey
    WHERE t.dtTaskDate >= '2025-09-01'
    ORDER BY t.lTaskKey DESC`);
  console.log(`  Tasks: ${result.tasks.length}`);

  // Loaners for those tasks
  const taskKeys = result.tasks.map(t => t.lTaskKey);
  if (taskKeys.length > 0) {
    result.taskLoaners = await query(NASH, `SELECT tl.*, st.sScopeTypeDesc
      FROM tblTaskLoaners tl
      LEFT JOIN tblScopeType st ON tl.lScopeTypeKey = st.lScopeTypeKey
      WHERE tl.lTaskKey IN (${taskKeys.join(',')})`);
  } else {
    result.taskLoaners = [];
  }
  console.log(`  Loaners: ${result.taskLoaners.length}`);

  // Status history for those tasks
  if (taskKeys.length > 0) {
    result.taskStatusHistory = await query(NASH, `SELECT h.*, ts.TaskStatus,
      ISNULL(u.sUserFullName, 'System') AS sUserName
      FROM tblTaskStatusHistory h
      JOIN tblTaskStatuses ts ON h.lTaskStatusKey = ts.TaskStatusKey
      LEFT JOIN tblUsers u ON h.lUserKey = u.lUserKey
      WHERE h.lTaskKey IN (${taskKeys.join(',')})`);
  } else {
    result.taskStatusHistory = [];
  }
  console.log(`  Status history: ${result.taskStatusHistory.length}`);

  // === TSIPortal ===
  console.log('\n=== TSIPortal ===');
  const portalTables = await query(PORTAL, "SELECT name FROM sys.tables ORDER BY name");
  console.log('All tables:', portalTables.map(r => r.name).join(', '));

  // Check portal-specific tables
  for (const tblName of portalTables.map(t => t.name)) {
    if (tblName.toLowerCase().includes('request') || tblName.toLowerCase().includes('repair') || tblName.toLowerCase().includes('form')) {
      const cnt = await query(PORTAL, `SELECT COUNT(*) AS cnt FROM [${tblName}]`);
      const cols = await query(PORTAL, `SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID('${tblName}') ORDER BY c.column_id`);
      console.log(`  ${tblName}: ${cnt[0].cnt} rows — [${cols.map(c => c.name).join(', ')}]`);
    }
  }

  // Save
  fs.writeFileSync('C:\\tmp\\task-seed.json', JSON.stringify(result, null, 2));
  console.log(`\nSaved C:\\tmp\\task-seed.json — ${result.tasks.length} tasks, ${result.taskLoaners.length} loaners, ${result.taskStatusHistory.length} history`);
}

run().catch(e => { console.error('Fatal:', e.message, e.precedingErrors?.[0]?.message || ''); process.exit(1); });
