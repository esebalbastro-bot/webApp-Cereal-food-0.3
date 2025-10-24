/* ===================== SESSIONES POR SID ===================== */
function SES_nowIso(){ return new Date().toISOString(); }

function ensureSessions_(){
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'SESSIONS', ['sid','email','created_at','last_seen']);
}

function SES_create_(email){
  const sh = ensureSessions_();
  const sid = 'SID-' + Utilities.getUuid().slice(0,8).toUpperCase();
  sh.appendRow([sid, String(email||'').trim(), SES_nowIso(), SES_nowIso()]);
  return sid;
}

function SES_touch_(sid){
  const sh = ensureSessions_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const iSid = head.indexOf('sid');
  const iSeen= head.indexOf('last_seen');
  for (let r=1; r<data.length; r++){
    if (String(data[r][iSid]) === String(sid)){
      sh.getRange(r+1, iSeen+1).setValue(new Date());
      return true;
    }
  }
  return false;
}

function SES_getUserBySid_(sid){
  const sh = ensureSessions_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const iSid = head.indexOf('sid');
  const iEmail = head.indexOf('email');
  let email = '';
  for (let r=1; r<data.length; r++){
    if (String(data[r][iSid]) === String(sid)){ email = (data[r][iEmail]||'').toString().trim(); break; }
  }
  if (!email) throw new Error('SID non valido.');
  const found = findUserByEmail_(email);
  if (!found) throw new Error('Utente non trovato per SID.');
  const u = {};
  found.header.forEach((k, idx) => u[k] = found.rowData[idx]);
  u.is_active = String(u.is_active).toLowerCase() === 'true';
  return u;
}

/* Login V2 -> devuelve SID sin depender de UserProperties compartidas */
function loginV2(email, password){
  const base = login(email, password); // reutiliza tu login existente
  if (!base || !base.ok) return base;
  const sid = SES_create_(email);
  return Object.assign({}, base, { sid });
}
