/* =========================== AUTH / EMAIL / SESIÓN =========================== */
function hashPassword_(plain, email) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (plain||'') + '|' + (email || ''));
  return Utilities.base64Encode(bytes);
}
function generatePassword_(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&';
  let out = '';
  for (let i = 0; i < (len||10); i++) out += chars.charAt(Math.floor(Math.random()*chars.length));
  return out;
}
function sendWelcomeEmail_(to, displayName, email, password) {
  const subject = 'Benvenuto – Cereal Food WebApp';
  const link = ScriptApp.getService().getUrl();
  const body =
    'Ciao ' + (displayName || '') + '\n\n' +
    'Il tuo account è stato creato. Puoi accedere con:\n' +
    'Email: ' + email + '\n' +
    'Password: ' + password + '\n\n' +
    'Link: ' + link + '\n\n' +
    'Per sicurezza, cambia la password dopo il primo accesso.';
  GmailApp.sendEmail(to, subject, body, {name: 'Cereal Food – Etichette'});
}

function findUserByEmail_(email) {
  const sh = ensureUsers_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const iEmail = head.indexOf('email');
  for (let r = 1; r < data.length; r++) {
    if ((data[r][iEmail]||'').toString().trim().toLowerCase() === (email||'').toLowerCase()) {
      return { row: r+1, rowData: data[r], header: head };
    }
  }
  return null;
}

/** Sesión mínima: guarda email en UserProperties al hacer login */
function setCurrentUserEmail_(email){
  PropertiesService.getUserProperties().setProperty('CURRENT_EMAIL', String(email||'').trim());
}
function getCurrentUser_(){
  const email = (PropertiesService.getUserProperties().getProperty('CURRENT_EMAIL') || '').trim();
  if (!email) throw new Error('Utente non autenticato (sessione vuota).');
  const found = findUserByEmail_(email);
  if (!found) throw new Error('Utente non trovato: ' + email);

  const head = found.header;
  const row  = found.rowData;
  const obj = {};
  head.forEach((k, idx) => obj[k] = row[idx]);
  obj.is_active = String(obj.is_active).toLowerCase() === 'true'; // normaliza booleano
  return obj; // { user_id, nome, cognome, email, role_id, squad_id, is_active, ... }
}

/* ===== Registro operador (Richiedi accesso) ===== */
function createOperator(form) {
  ensureUsersSchema_();
  const sh = ensureUsers_();

  const nome = (form && form.nome || '').trim();
  const cognome = (form && form.cognome || '').trim();
  const email = (form && form.email || '').trim();
  const squad_id = (form && form.squad_id || '').trim();

  if (!nome || !cognome || !email || !squad_id) {
    throw new Error('Dati obbligatori mancanti (Nome, Cognome, Email, Squadra)');
  }

  const existing = findUserByEmail_(email);
  if (existing) throw new Error('Email già registrata');

  const user_id = 'U' + Utilities.getUuid().slice(0,8).toUpperCase();
  const password = generatePassword_(10);
  const pHash = hashPassword_(password, email);
  const row = [ user_id, nome, cognome, email, 'R004', squad_id, true, new Date(), pHash ];
  sh.appendRow(row);

  const displayName = (nome + ' ' + cognome).trim();
  try {
    sendWelcomeEmail_(email, displayName, email, password);
    return { ok: true, user_id, email_sent: true };
  } catch (e) {
    return { ok: true, user_id, email_sent: false, error: e && e.message };
  }
}

/* ===== Login / Reset ===== */
function login(email, password) {
  ensureUsersSchema_();
  const sh = ensureUsers_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { ok:false, msg:'Nessun utente' };

  const head = data[0];
  const iEmail = head.indexOf('email');
  const iNome = head.indexOf('nome');
  const iCognome = head.indexOf('cognome');
  const iHash = head.indexOf('password_hash');
  const iActive = head.indexOf('is_active');
  const iRole = head.indexOf('role_id');
  const iSquad = head.indexOf('squad_id');

  const target = data.find((r, idx) => idx>0 && (r[iEmail]||'').toString().toLowerCase() === (email||'').toLowerCase());
  if (!target) return { ok:false, msg:'Utente non trovato' };
  if (String(target[iActive]).toLowerCase() !== 'true') return { ok:false, msg:'Utente disabilitato' };

  const expected = target[iHash];
  const given = hashPassword_(password||'', email||'');
  if (expected !== given) return { ok:false, msg:'Password errata' };

  const display = ((target[iNome]||'') + ' ' + (target[iCognome]||'')).trim() || email;
  setCurrentUserEmail_(email);
  return { ok:true, display_name: display, role_id: target[iRole], squad_id: target[iSquad] };
}

function resetPassword(email) {
  if (!email) throw new Error('Email obbligatoria');
  ensureUsersSchema_();
  const found = findUserByEmail_(email);
  if (!found) throw new Error('Utente non trovato');

  const iActive = found.header.indexOf('is_active');
  if (String(found.rowData[iActive]).toLowerCase() !== 'true') throw new Error('Utente disabilitato');

  const newPwd = generatePassword_(10);
  const newHash = hashPassword_(newPwd, email);
  const iHash = found.header.indexOf('password_hash');
  const sh = ensureUsers_();
  sh.getRange(found.row, iHash + 1).setValue(newHash);

  const iNome = found.header.indexOf('nome');
  const iCognome = found.header.indexOf('cognome');
  const display = ((found.rowData[iNome]||'') + ' ' + (found.rowData[iCognome]||'')).trim() || email;

  try {
    sendWelcomeEmail_(email, display, email, newPwd);
    return { ok:true, email_sent:true };
  } catch(e) {
    return { ok:true, email_sent:false, error: e && e.message };
  }
}
