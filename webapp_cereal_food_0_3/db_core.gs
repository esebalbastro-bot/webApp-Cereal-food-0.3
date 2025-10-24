/* =========================== BASE DE DATOS =========================== */
function getDb_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_DB_ID);
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create(DB_NAME);
    props.setProperty(PROP_DB_ID, ss.getId());
  }
  return ss;
}

function getOrCreateSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
  } else {
    // Normaliza headers si faltan columnas
    const lastCol = sh.getLastColumn();
    if (lastCol < header.length) {
      const existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
      for (let i = lastCol; i < header.length; i++) existing.push(header[i]);
      sh.getRange(1, 1, 1, header.length).setValues([existing]);
    }
  }
  return sh;
}

function ensureUsers_() {
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'USERS', [
    'user_id','nome','cognome','email','role_id','squad_id','is_active','created_at','password_hash'
  ]);
}
function ensureSquads_() {
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'SQUADS', [
    'squad_id','squad_name','capo_name','vice_name','capo_email','vice_email'
  ]);
}
function ensureRequests_(){
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'REQUESTS', [
    'request_id','created_at','created_by_user_id','squad_id',
    'type','cliente','codice','quantita','linea','note',
    'status','approved_by_user_id','approved_at','rejection_comment',
    'make_webhook_status','make_webhook_attempts','make_webhook_last_error',
    'payload_json'
  ]);
}
function ensureClienti_(){
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'CLIENTI', [
    'cliente_id','cliente_name','is_active','created_at'
  ]);
}
function ensureUsersSchema_() {
  const sh = ensureUsers_();
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const header = sh.getRange(1,1,1,lastCol).getValues()[0];
  const needCols = ['user_id','nome','cognome','email','role_id','squad_id','is_active','created_at','password_hash'];
  needCols.forEach(col => {
    if (!header.includes(col)) {
      sh.insertColumnAfter(sh.getLastColumn());
      sh.getRange(1, sh.getLastColumn(), 1, 1).setValue(col);
    }
  });
}
