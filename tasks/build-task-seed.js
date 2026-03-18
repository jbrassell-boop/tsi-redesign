// Build a representative task seed from Nashville data
// Mixes recent tasks + tasks with history/loaners for realistic mock data
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');

const NASH = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=WinScopeNetNashville;Trusted_Connection=yes;TrustServerCertificate=yes;';

const CURRENT_STATUS_CTE = `
  WITH CurrentStatus AS (
    SELECT lTaskKey, lTaskStatusKey, lUserKey,
      ROW_NUMBER() OVER (PARTITION BY lTaskKey ORDER BY dtTaskStatusDate DESC, lTaskStatusHistoryKey DESC) AS rn
    FROM tblTaskStatusHistory
  )`;

async function run() {
  const pool = await new sql.ConnectionPool({ connectionString: NASH }).connect();
  const result = {};

  // 1. Lookup tables
  result.taskTypes = (await pool.request().query('SELECT lTaskTypeKey, sTaskType FROM tblTaskTypes ORDER BY lTaskTypeKey')).recordset;
  result.taskStatuses = (await pool.request().query('SELECT TaskStatusKey AS lTaskStatusKey, TaskStatus AS sTaskStatus FROM tblTaskStatuses ORDER BY TaskStatusKey')).recordset;
  result.taskPriorities = (await pool.request().query('SELECT lTaskPriorityKey, sTaskPriority FROM tblTaskPriorities ORDER BY lTaskPriorityKey')).recordset;

  // 2. Get 50 tasks WITH status history (rich data) - varied types
  const richTasks = (await pool.request().query(`${CURRENT_STATUS_CTE}
    SELECT t.*, cs.lTaskStatusKey, ts.TaskStatus AS sTaskStatusDesc,
      tt.sTaskType AS sTaskTypeDesc, tp.sTaskPriority AS sTaskPriorityDesc,
      d.sDepartmentName, c.sClientName1 AS sClientName,
      ISNULL(u.sUserFullName, 'Unassigned') AS sAssignedTo,
      cs.lUserKey AS lAssignedToKey
    FROM tblTasks t
    JOIN tblTaskStatusHistory h2 ON t.lTaskKey = h2.lTaskKey
    LEFT JOIN CurrentStatus cs ON t.lTaskKey = cs.lTaskKey AND cs.rn = 1
    LEFT JOIN tblTaskStatuses ts ON cs.lTaskStatusKey = ts.TaskStatusKey
    JOIN tblTaskTypes tt ON t.lTaskTypeKey = tt.lTaskTypeKey
    JOIN tblTaskPriorities tp ON t.lTaskPriorityKey = tp.lTaskPriorityKey
    LEFT JOIN tblDepartment d ON t.lDepartmentKey = d.lDepartmentKey
    LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
    LEFT JOIN tblUsers u ON cs.lUserKey = u.lUserKey
    WHERE h2.lTaskStatusHistoryKey = (SELECT MIN(lTaskStatusHistoryKey) FROM tblTaskStatusHistory WHERE lTaskKey = t.lTaskKey)
    ORDER BY t.dtTaskDate DESC
    OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
  `)).recordset;
  console.log(`Rich tasks (with history): ${richTasks.length}`);

  // 3. Get 25 recent tasks WITHOUT history (portal/auto-created)
  const recentTasks = (await pool.request().query(`
    SELECT t.*, NULL AS lTaskStatusKey, 'Not Started' AS sTaskStatusDesc,
      tt.sTaskType AS sTaskTypeDesc, tp.sTaskPriority AS sTaskPriorityDesc,
      d.sDepartmentName, c.sClientName1 AS sClientName,
      'Unassigned' AS sAssignedTo, NULL AS lAssignedToKey
    FROM tblTasks t
    JOIN tblTaskTypes tt ON t.lTaskTypeKey = tt.lTaskTypeKey
    JOIN tblTaskPriorities tp ON t.lTaskPriorityKey = tp.lTaskPriorityKey
    LEFT JOIN tblDepartment d ON t.lDepartmentKey = d.lDepartmentKey
    LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
    WHERE NOT EXISTS (SELECT 1 FROM tblTaskStatusHistory WHERE lTaskKey = t.lTaskKey)
    ORDER BY t.dtTaskDate DESC
    OFFSET 0 ROWS FETCH NEXT 25 ROWS ONLY
  `)).recordset;
  console.log(`Recent tasks (no history): ${recentTasks.length}`);

  // Combine
  result.tasks = [...richTasks, ...recentTasks];
  console.log(`Total tasks: ${result.tasks.length}`);

  // 4. Get loaners for all selected tasks
  const allKeys = result.tasks.map(t => t.lTaskKey);
  if (allKeys.length > 0) {
    result.taskLoaners = (await pool.request().query(`
      SELECT tl.*, st.sScopeTypeDesc
      FROM tblTaskLoaners tl
      LEFT JOIN tblScopeType st ON tl.lScopeTypeKey = st.lScopeTypeKey
      WHERE tl.lTaskKey IN (${allKeys.join(',')})
    `)).recordset;
  } else {
    result.taskLoaners = [];
  }
  console.log(`Task loaners: ${result.taskLoaners.length}`);

  // 5. Get status history for all selected tasks
  if (allKeys.length > 0) {
    result.taskStatusHistory = (await pool.request().query(`
      SELECT h.*, ts.TaskStatus AS sTaskStatusDesc,
        ISNULL(u.sUserFullName, 'System') AS sUserName
      FROM tblTaskStatusHistory h
      JOIN tblTaskStatuses ts ON h.lTaskStatusKey = ts.TaskStatusKey
      LEFT JOIN tblUsers u ON h.lUserKey = u.lUserKey
      WHERE h.lTaskKey IN (${allKeys.join(',')})
      ORDER BY h.lTaskKey, h.dtTaskStatusDate
    `)).recordset;
  } else {
    result.taskStatusHistory = [];
  }
  console.log(`Status history: ${result.taskStatusHistory.length}`);

  // 6. Get users (active CS reps for assignment dropdown)
  result.users = (await pool.request().query(`
    SELECT lUserKey, sUserFullName, sUserName, sEmailAddress, bActive, bCustomerService
    FROM tblUsers
    WHERE bActive = 1
    ORDER BY sUserFullName
  `)).recordset;
  console.log(`Active users: ${result.users.length}`);

  // Save
  fs.writeFileSync('C:\\tmp\\task-seed.json', JSON.stringify(result, null, 2));
  console.log(`\nSaved C:\\tmp\\task-seed.json`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Tasks: ${result.tasks.length} (${richTasks.length} with history, ${recentTasks.length} recent)`);
  console.log(`Loaners: ${result.taskLoaners.length}`);
  console.log(`History: ${result.taskStatusHistory.length}`);
  console.log(`Users: ${result.users.length}`);
  console.log(`Types: ${result.taskTypes.length}`);
  console.log(`Statuses: ${result.taskStatuses.length}`);
  console.log(`Priorities: ${result.taskPriorities.length}`);

  // Print type distribution
  const typeDist = {};
  result.tasks.forEach(t => { typeDist[t.sTaskTypeDesc] = (typeDist[t.sTaskTypeDesc] || 0) + 1; });
  console.log('\nType distribution:', typeDist);

  const statusDist = {};
  result.tasks.forEach(t => { statusDist[t.sTaskStatusDesc || 'Not Started'] = (statusDist[t.sTaskStatusDesc || 'Not Started'] || 0) + 1; });
  console.log('Status distribution:', statusDist);

  await pool.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
