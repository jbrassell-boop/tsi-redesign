/**
 * extract-dashboard-data.js
 * Extracts dashboard-specific data from WinScopeNetNashville via sqlcmd.
 *
 * Usage:  node tasks/extract-dashboard-data.js
 * Output: C:\tmp\dashboard-seed.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER = 'localhost\\SQLEXPRESS';
const DB = 'WinScopeNetNashville';
const SQLCMD = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const TMP_SQL = path.join(__dirname, '_dash_tmp.sql');
const OUTPUT = 'C:\\tmp\\dashboard-seed.json';

// ============================================================
// SQL helper via sqlcmd
// ============================================================

function sqlQuery(queryStr) {
  // Write SQL to temp file to avoid escaping issues
  fs.writeFileSync(TMP_SQL, queryStr, 'utf8');

  try {
    const raw = execSync(
      `"${SQLCMD}" -S "${SERVER}" -d "${DB}" -C -i "${TMP_SQL}" -y0`,
      { maxBuffer: 500 * 1024 * 1024, encoding: 'utf8', timeout: 300000 }
    );

    // sqlcmd output: JSON rows followed by "(N rows affected)" line
    // The JSON may span multiple lines for large results
    // Strip trailing "(N rows affected)" lines and blank lines
    const lines = raw.split('\n')
      .map(l => l.trimEnd())
      .filter(l => l && !/^\(\d+ rows? affected\)/.test(l));

    const jsonStr = lines.join('').trim();
    if (!jsonStr || jsonStr === 'NULL') return [];
    return JSON.parse(jsonStr);
  } catch (e) {
    const msg = e.stdout || e.stderr || e.message || '';
    console.error('  ERROR:', String(msg).substring(0, 500));
    return [];
  } finally {
    try { fs.unlinkSync(TMP_SQL); } catch (_) {}
  }
}

function discoverColumns(tableName) {
  return sqlQuery(`
    SELECT c.name, t.name AS type
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('${tableName}')
    ORDER BY c.column_id
    FOR JSON PATH
  `);
}

/** Build a safe SELECT list, casting ntext/text to nvarchar(max), skipping image cols */
function safeColList(cols, alias) {
  const pfx = alias ? `${alias}.` : '';
  return cols
    .filter(c => c.type !== 'image')  // image cannot be cast to nvarchar
    .map(c => {
      if (c.type === 'ntext' || c.type === 'text') {
        return `CAST(${pfx}[${c.name}] AS NVARCHAR(MAX)) AS [${c.name}]`;
      }
      return `${pfx}[${c.name}]`;
    }).join(', ');
}

function log(label, arr) {
  console.log(`  ${label}: ${arr.length} rows`);
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('Extracting dashboard data from WinScopeNetNashville ...\n');

  const seed = {};

  // ----------------------------------------------------------
  // 1. Discover schemas for unknown tables
  // ----------------------------------------------------------
  console.log('=== Discovering schemas ===');
  const unknowns = [
    'tblLoanerTran', 'tblEmails', 'tblEmailAttachments', 'tblEmailTypes',
    'tblShippingCharges', 'tblFlags', 'tblFlagTypes', 'tblFlagLocations',
    'tblFlagLocationsUsed', 'tblFlagInstrumentTypes',
    'tblRepairRevenueAndExpenses', 'tblRepairRevenueAndExpensesContract'
  ];
  const schemas = {};
  for (const tbl of unknowns) {
    const cols = discoverColumns(tbl);
    if (cols.length === 0) {
      console.log(`  ${tbl}: NOT FOUND`);
    } else {
      schemas[tbl] = cols;
      console.log(`  ${tbl}: ${cols.length} cols -> ${cols.map(c => c.name).join(', ')}`);
    }
  }
  console.log();

  // ----------------------------------------------------------
  // 2. Lookup tables (small, full extract)
  // ----------------------------------------------------------
  console.log('=== Lookup tables ===');

  seed.taskTypes = sqlQuery(`SELECT lTaskTypeKey, sTaskType FROM tblTaskTypes FOR JSON PATH`);
  log('taskTypes', seed.taskTypes);

  seed.taskStatuses = sqlQuery(`
    SELECT TaskStatusKey AS lTaskStatusKey, TaskStatus AS sTaskStatus
    FROM tblTaskStatuses FOR JSON PATH
  `);
  log('taskStatuses', seed.taskStatuses);

  seed.taskPriorities = sqlQuery(`SELECT lTaskPriorityKey, sTaskPriority FROM tblTaskPriorities FOR JSON PATH`);
  log('taskPriorities', seed.taskPriorities);

  seed.users = sqlQuery(`
    SELECT lUserKey, sUserFullName, sUserName, sEmailAddress, bActive, bCustomerService
    FROM tblUsers FOR JSON PATH
  `);
  log('users', seed.users);

  // Email types
  if (schemas.tblEmailTypes) {
    const cols = safeColList(schemas.tblEmailTypes);
    seed.emailTypes = sqlQuery(`SELECT ${cols} FROM tblEmailTypes FOR JSON PATH`);
  } else {
    seed.emailTypes = [];
  }
  log('emailTypes', seed.emailTypes);

  // Flag types
  if (schemas.tblFlagTypes) {
    const cols = safeColList(schemas.tblFlagTypes);
    seed.flagTypes = sqlQuery(`SELECT ${cols} FROM tblFlagTypes FOR JSON PATH`);
  } else {
    seed.flagTypes = [];
  }
  log('flagTypes', seed.flagTypes);

  // Flag locations
  if (schemas.tblFlagLocations) {
    const cols = safeColList(schemas.tblFlagLocations);
    seed.flagLocations = sqlQuery(`SELECT ${cols} FROM tblFlagLocations FOR JSON PATH`);
  } else {
    seed.flagLocations = [];
  }
  log('flagLocations', seed.flagLocations);

  // Flag locations used
  if (schemas.tblFlagLocationsUsed) {
    const cols = safeColList(schemas.tblFlagLocationsUsed);
    seed.flagLocationsUsed = sqlQuery(`SELECT ${cols} FROM tblFlagLocationsUsed FOR JSON PATH`);
  } else {
    seed.flagLocationsUsed = [];
  }
  log('flagLocationsUsed', seed.flagLocationsUsed);

  // Flag instrument types
  if (schemas.tblFlagInstrumentTypes) {
    const cols = safeColList(schemas.tblFlagInstrumentTypes);
    seed.flagInstrumentTypes = sqlQuery(`SELECT ${cols} FROM tblFlagInstrumentTypes FOR JSON PATH`);
  } else {
    seed.flagInstrumentTypes = [];
  }
  log('flagInstrumentTypes', seed.flagInstrumentTypes);

  console.log();

  // ----------------------------------------------------------
  // 3. Tasks - enriched (100 recent + 50 with history)
  // ----------------------------------------------------------
  console.log('=== Tasks ===');

  seed.tasks = sqlQuery(`
    ;WITH RecentTasks AS (
      SELECT TOP 100 lTaskKey FROM tblTasks ORDER BY dtTaskDate DESC
    ),
    TasksWithHistory AS (
      SELECT DISTINCT TOP 50 h.lTaskKey
      FROM tblTaskStatusHistory h
      WHERE h.lTaskKey NOT IN (SELECT lTaskKey FROM RecentTasks)
      ORDER BY h.lTaskKey DESC
    ),
    AllTaskKeys AS (
      SELECT lTaskKey FROM RecentTasks UNION SELECT lTaskKey FROM TasksWithHistory
    )
    SELECT
      t.lTaskKey, t.lDepartmentKey,
      CAST(t.sTaskTitle AS NVARCHAR(MAX)) AS sTaskTitle,
      CAST(t.sCustomerMessage AS NVARCHAR(MAX)) AS sCustomerMessage,
      t.dtTaskDate, t.lTaskPriorityKey,
      CAST(t.sTaskNotes AS NVARCHAR(MAX)) AS sTaskNotes,
      t.bFromPortal, t.lTaskTypeKey, t.lRepairKey,
      t.sWorkOrderNumber, t.sShipTrackingNumber,
      d.sDepartmentName,
      c.sClientName1 AS sClientName,
      tt.sTaskType AS sTaskTypeDesc,
      tp.sTaskPriority AS sTaskPriorityDesc,
      r.sWorkOrderNumber AS sRepairWO,
      latestStatus.sTaskStatus AS TaskStatus,
      latestStatus.sUserFullName AS sAssignedTo
    FROM tblTasks t
    INNER JOIN AllTaskKeys ak ON ak.lTaskKey = t.lTaskKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = t.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblTaskTypes tt ON tt.lTaskTypeKey = t.lTaskTypeKey
    LEFT JOIN tblTaskPriorities tp ON tp.lTaskPriorityKey = t.lTaskPriorityKey
    LEFT JOIN tblRepair r ON r.lRepairKey = t.lRepairKey
    OUTER APPLY (
      SELECT TOP 1 ts.TaskStatus AS sTaskStatus, u.sUserFullName
      FROM tblTaskStatusHistory h2
      JOIN tblTaskStatuses ts ON ts.TaskStatusKey = h2.lTaskStatusKey
      LEFT JOIN tblUsers u ON u.lUserKey = h2.lUserKey
      WHERE h2.lTaskKey = t.lTaskKey
      ORDER BY h2.dtTaskStatusDate DESC
    ) latestStatus
    ORDER BY t.dtTaskDate DESC
    FOR JSON PATH
  `);
  log('tasks', seed.tasks);

  // Task loaners
  seed.taskLoaners = sqlQuery(`
    SELECT tl.lTaskScopeTypeKey, tl.lTaskKey, tl.lScopeTypeKey, tl.lQuantity,
           st.sScopeTypeDesc
    FROM tblTaskLoaners tl
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = tl.lScopeTypeKey
    FOR JSON PATH
  `);
  log('taskLoaners', seed.taskLoaners);

  // Task status history for selected tasks
  seed.taskStatusHistory = sqlQuery(`
    ;WITH RecentTasks AS (
      SELECT TOP 100 lTaskKey FROM tblTasks ORDER BY dtTaskDate DESC
    ),
    TasksWithHistory AS (
      SELECT DISTINCT TOP 50 h.lTaskKey
      FROM tblTaskStatusHistory h
      WHERE h.lTaskKey NOT IN (SELECT lTaskKey FROM RecentTasks)
      ORDER BY h.lTaskKey DESC
    ),
    AllTaskKeys AS (
      SELECT lTaskKey FROM RecentTasks UNION SELECT lTaskKey FROM TasksWithHistory
    )
    SELECT h.lTaskStatusHistoryKey, h.lTaskKey, h.dtTaskStatusDate,
           h.lTaskStatusKey, h.lUserKey,
           ts.TaskStatus AS sTaskStatusDesc,
           u.sUserFullName AS sUserName
    FROM tblTaskStatusHistory h
    INNER JOIN AllTaskKeys ak ON ak.lTaskKey = h.lTaskKey
    LEFT JOIN tblTaskStatuses ts ON ts.TaskStatusKey = h.lTaskStatusKey
    LEFT JOIN tblUsers u ON u.lUserKey = h.lUserKey
    ORDER BY h.dtTaskStatusDate DESC
    FOR JSON PATH
  `);
  log('taskStatusHistory', seed.taskStatusHistory);

  console.log();

  // ----------------------------------------------------------
  // 4. Loaner transactions (all rows)
  // ----------------------------------------------------------
  console.log('=== Loaner transactions ===');
  if (schemas.tblLoanerTran) {
    const ltCols = schemas.tblLoanerTran;
    const colNames = ltCols.map(c => c.name);
    const hasDepKey = colNames.includes('lDepartmentKey');
    const hasScopeKey = colNames.includes('lScopeKey');
    const hasScopeTypeKey = colNames.includes('lScopeTypeKey');
    const hasRepKey = colNames.includes('lRepairKey');

    let selectCols = safeColList(ltCols, 'lt');
    let joins = '';
    if (hasDepKey) {
      selectCols += ', d.sDepartmentName, c.sClientName1 AS sClientName';
      joins += ' LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey';
    }
    if (hasScopeTypeKey) {
      selectCols += ', st.sScopeTypeDesc';
      joins += ' LEFT JOIN tblScopeType st ON st.lScopeTypeKey = lt.lScopeTypeKey';
    }
    if (hasScopeKey) {
      selectCols += ', s.sSerialNumber';
      joins += ' LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey';
    }
    if (hasRepKey) {
      selectCols += ', r.sWorkOrderNumber AS sRepairWO';
      joins += ' LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey';
    }

    seed.loanerTrans = sqlQuery(`SELECT ${selectCols} FROM tblLoanerTran lt ${joins} FOR JSON PATH`);
  } else {
    seed.loanerTrans = [];
  }
  log('loanerTrans', seed.loanerTrans);
  console.log();

  // ----------------------------------------------------------
  // 5. Emails (300 most recent + their attachments)
  // ----------------------------------------------------------
  console.log('=== Emails ===');
  if (schemas.tblEmails) {
    const eCols = schemas.tblEmails;
    const eColNames = eCols.map(c => c.name);
    const ePK = eColNames.find(c => /emailkey/i.test(c)) || eColNames.find(c => /Key$/i.test(c)) || eColNames[0];
    const eDateCol = eColNames.find(c => /date|sent|created/i.test(c));
    const eTypeKey = eColNames.find(c => /emailtypekey|typekey/i.test(c));

    let selectCols = safeColList(eCols, 'e');
    let joins = '';
    if (eTypeKey && schemas.tblEmailTypes) {
      const etColNames = schemas.tblEmailTypes.map(c => c.name);
      const etPK = etColNames[0];
      const etDesc = etColNames.find(c => /type/i.test(c) && !/key/i.test(c));
      if (etDesc) {
        selectCols += `, et.[${etDesc}] AS sEmailTypeDesc`;
        joins += ` LEFT JOIN tblEmailTypes et ON et.[${etPK}] = e.[${eTypeKey}]`;
      }
    }

    const orderCol = eDateCol || ePK;
    seed.emails = sqlQuery(`SELECT TOP 300 ${selectCols} FROM tblEmails e ${joins} ORDER BY e.[${orderCol}] DESC FOR JSON PATH`);

    // Email attachments for those emails
    if (schemas.tblEmailAttachments && seed.emails.length > 0) {
      const eaCols = schemas.tblEmailAttachments;
      const eaColNames = eaCols.map(c => c.name);
      const eaEmailKey = eaColNames.find(c => /emailkey/i.test(c));
      if (eaEmailKey) {
        const emailKeys = seed.emails.map(e => e[ePK]).filter(Boolean);
        if (emailKeys.length > 0) {
          const safeEaCols = safeColList(eaCols);
          // Build IN clause in batches
          const batchSize = 200;
          seed.emailAttachments = [];
          for (let i = 0; i < emailKeys.length; i += batchSize) {
            const batch = emailKeys.slice(i, i + batchSize).join(',');
            const rows = sqlQuery(`SELECT ${safeEaCols} FROM tblEmailAttachments WHERE [${eaEmailKey}] IN (${batch}) FOR JSON PATH`);
            seed.emailAttachments.push(...rows);
          }
        } else {
          seed.emailAttachments = [];
        }
      } else {
        seed.emailAttachments = [];
      }
    } else {
      seed.emailAttachments = [];
    }
  } else {
    seed.emails = [];
    seed.emailAttachments = [];
  }
  log('emails', seed.emails);
  log('emailAttachments', seed.emailAttachments);
  console.log();

  // ----------------------------------------------------------
  // 6. Shipping charges (200 most recent)
  // ----------------------------------------------------------
  console.log('=== Shipping charges ===');
  if (schemas.tblShippingCharges) {
    const sCols = schemas.tblShippingCharges;
    const sColNames = sCols.map(c => c.name);
    const sRepKey = sColNames.find(c => /repairkey/i.test(c));
    const sDepKey = sColNames.find(c => /departmentkey/i.test(c));
    const sDateCol = sColNames.find(c => /date|ship/i.test(c));

    let selectCols = safeColList(sCols, 'sc');
    let joins = '';
    if (sRepKey) {
      selectCols += ', r.sWorkOrderNumber AS sRepairWO';
      joins += ` LEFT JOIN tblRepair r ON r.lRepairKey = sc.[${sRepKey}]`;
    }
    if (sDepKey) {
      selectCols += ', d.sDepartmentName, c.sClientName1 AS sClientName';
      joins += ` LEFT JOIN tblDepartment d ON d.lDepartmentKey = sc.[${sDepKey}] LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey`;
    }

    const orderCol = sDateCol || sColNames[0];
    seed.shippingCharges = sqlQuery(`SELECT TOP 200 ${selectCols} FROM tblShippingCharges sc ${joins} ORDER BY sc.[${orderCol}] DESC FOR JSON PATH`);
  } else {
    seed.shippingCharges = [];
  }
  log('shippingCharges', seed.shippingCharges);
  console.log();

  // ----------------------------------------------------------
  // 7. Profitability (all regular + 500 contract)
  // ----------------------------------------------------------
  console.log('=== Profitability ===');
  if (schemas.tblRepairRevenueAndExpenses) {
    const pCols = schemas.tblRepairRevenueAndExpenses;
    const pColNames = pCols.map(c => c.name);
    const pRepKey = pColNames.find(c => /repairkey/i.test(c));

    let selectCols = safeColList(pCols, 'p');
    let joins = '';
    if (pRepKey) {
      selectCols += ', r.sWorkOrderNumber AS sRepairWO';
      joins += ` LEFT JOIN tblRepair r ON r.lRepairKey = p.[${pRepKey}]`;
    }

    seed.profitability = sqlQuery(`SELECT ${selectCols} FROM tblRepairRevenueAndExpenses p ${joins} FOR JSON PATH`);
  } else {
    seed.profitability = [];
  }
  log('profitability', seed.profitability);

  if (schemas.tblRepairRevenueAndExpensesContract) {
    const cpCols = schemas.tblRepairRevenueAndExpensesContract;
    const cpColNames = cpCols.map(c => c.name);
    const cpRepKey = cpColNames.find(c => /repairkey/i.test(c));

    let selectCols = safeColList(cpCols, 'cp');
    let joins = '';
    if (cpRepKey) {
      selectCols += ', r.sWorkOrderNumber AS sRepairWO';
      joins += ` LEFT JOIN tblRepair r ON r.lRepairKey = cp.[${cpRepKey}]`;
    }

    seed.contractProfitability = sqlQuery(`SELECT TOP 500 ${selectCols} FROM tblRepairRevenueAndExpensesContract cp ${joins} FOR JSON PATH`);
  } else {
    seed.contractProfitability = [];
  }
  log('contractProfitability', seed.contractProfitability);
  console.log();

  // ----------------------------------------------------------
  // 8. Write output
  // ----------------------------------------------------------
  console.log('=== Writing output ===');
  const json = JSON.stringify(seed, null, 2);
  fs.writeFileSync(OUTPUT, json, 'utf8');
  const sizeMB = (Buffer.byteLength(json, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`  Written to ${OUTPUT} (${sizeMB} MB)\n`);

  // Summary
  console.log('=== SUMMARY ===');
  let totalRows = 0;
  for (const [key, arr] of Object.entries(seed)) {
    console.log(`  ${key}: ${arr.length}`);
    totalRows += arr.length;
  }
  console.log(`  ---`);
  console.log(`  Total collections: ${Object.keys(seed).length}`);
  console.log(`  Total rows: ${totalRows}`);
  console.log(`  File size: ${sizeMB} MB`);
  console.log('\nDone.');
}

main();
