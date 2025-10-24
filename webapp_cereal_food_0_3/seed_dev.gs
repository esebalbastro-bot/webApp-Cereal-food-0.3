/* ===================== SEED / HOTFIX (DESARROLLO) ===================== */
/** Crea/obtiene la hoja CREDENTIALS para listar credenciales generadas */
function HOTFIX_ensureCredentials_(){
  const ss = getDb_();
  let sh = ss.getSheetByName('CREDENTIALS');
  if (!sh){
    sh = ss.insertSheet('CREDENTIALS');
    sh.appendRow(['nome','cognome','email','role_id','squad_id','password_plain']);
  }
  return sh;
}

/** Asegura una squad por nombre de Capo; devuelve squad_id */
function HOTFIX_ensureSquadByCapoName_(shSquads, capoName){
  const head = shSquads.getRange(1,1,1,shSquads.getLastColumn()).getValues()[0];
  const ixId   = head.indexOf('squad_id');
  const ixName = head.indexOf('squad_name');
  const ixCapo = head.indexOf('capo_name');
  const ixVice = head.indexOf('vice_name');
  const ixCapoEmail = head.indexOf('capo_email');
  const ixViceEmail = head.indexOf('vice_email');

  const data = shSquads.getDataRange().getValues();
  for (let r=1;r<data.length;r++){
    const row = data[r];
    if (String(row[ixName]||'').trim() === capoName){
      // Completa capo/vice emails si faltan (pseudo)
      const capoEmail = (row[ixCapoEmail]||'').toString().trim();
      const viceEmail = (row[ixViceEmail]||'').toString().trim();
      if (!capoEmail && ixCapoEmail>=0) shSquads.getRange(r+1, ixCapoEmail+1).setValue(HOTFIX_pseudoEmail_(capoName));
      if (!viceEmail && ixViceEmail>=0 && row[ixVice]) shSquads.getRange(r+1, ixViceEmail+1).setValue(HOTFIX_pseudoEmail_(row[ixVice]));
      return String(row[ixId]);
    }
  }
  const squad_id = 'SQUAD-' + capoName.toUpperCase().replace(/\s+/g,'').slice(0,12);
  const capoEmail = HOTFIX_pseudoEmail_(capoName);
  shSquads.appendRow([squad_id, capoName, capoName, '', capoEmail, '']);
  return squad_id;
}

function HOTFIX_pseudoEmail_(fullName){
  const parts = String(fullName||'').trim().toLowerCase().split(/\s+/);
  return (parts[0]||'user') + '.' + (parts.slice(1).join('.')||'cf') + '@temp.local';
}

/** Hash compatible con login (SHA-256 de "pwd|email") */
function HOTFIX_hashPassword_(plain, email){
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain||'') + '|' + String(email||''));
  return Utilities.base64Encode(bytes);
}

/** Crea/actualiza un usuario con rol/squad/password */
function HOTFIX_upsertUser_(shUsers, shCred, u, squad_id){
  const head = shUsers.getRange(1,1,1,shUsers.getLastColumn()).getValues()[0];
  const ixEmail = head.indexOf('email');
  const ixRole  = head.indexOf('role_id');
  const ixSquad = head.indexOf('squad_id');
  const ixHash  = head.indexOf('password_hash');

  // buscar existente
  const data = shUsers.getDataRange().getValues();
  let foundRow = null;
  for (let r=1;r<data.length;r++){
    if (String(data[r][ixEmail]||'').toLowerCase() === String(u.email||'').toLowerCase()){
      foundRow = r+1; break;
    }
  }
  const hash = HOTFIX_hashPassword_(u.password, u.email);

  if (foundRow){
    shUsers.getRange(foundRow, ixRole+1).setValue(u.role_id);
    shUsers.getRange(foundRow, ixSquad+1).setValue(squad_id);
    shUsers.getRange(foundRow, ixHash+1).setValue(hash);
    shCred.appendRow([u.nome, u.cognome, u.email, u.role_id, squad_id, u.password]);
    return { email:u.email, status:'UPDATED' };
  } else {
    const user_id = 'U' + Utilities.getUuid().slice(0,8).toUpperCase();
    shUsers.appendRow([user_id, u.nome, u.cognome, u.email, u.role_id, squad_id, true, new Date(), hash]);
    shCred.appendRow([u.nome, u.cognome, u.email, u.role_id, squad_id, u.password]);
    return { email:u.email, status:'CREATED' };
  }
}

/** SEED principal: crea squads y 6 usuarios CAPO/VICE con contraseñas fijas */
function HOTFIX_seedCaposVices_(){
  const shUsers  = ensureUsers_();
  const shSquads = ensureSquads_();
  const shCred   = HOTFIX_ensureCredentials_();

  // Definición de capos/vices
  const CAPOS = ['Carlo Marino','Domenico Zito','Alfredo Colamorea'];
  const VICES = [
    { vice:'Julia Testores',    capo:'Carlo Marino'     },
    { vice:'Loris Inglese',     capo:'Domenico Zito'    },
    { vice:'Mikela Giovanette', capo:'Alfredo Colamorea'}
  ];

  // Asegurar squads por capo
  const squadByCapo = {};
  CAPOS.forEach(capo => { squadByCapo[capo] = HOTFIX_ensureSquadByCapoName_(shSquads, capo); });

  // Usuarios fijos (CAPO R002, VICE R003)
  const USERS = [
    { nome:'Carlo',   cognome:'Marino',     email:'carlo.marino@temp.local',      role_id:'R002', squad_name:'Carlo Marino',      password:'9hT7Q2ZP' },
    { nome:'Domenico',cognome:'Zito',       email:'domenico.zito@temp.local',     role_id:'R002', squad_name:'Domenico Zito',     password:'F3N6K8JW' },
    { nome:'Alfredo', cognome:'Colamorea',  email:'alfredo.colamorea@temp.local', role_id:'R002', squad_name:'Alfredo Colamorea', password:'R7B2M4LC' },
    { nome:'Julia',   cognome:'Testores',   email:'julia.testores@temp.local',    role_id:'R003', squad_name:'Carlo Marino',      password:'P6V9D1TX' },
    { nome:'Loris',   cognome:'Inglese',    email:'loris.inglese@temp.local',     role_id:'R003', squad_name:'Domenico Zito',     password:'H8C3S5QA' },
    { nome:'Mikela',  cognome:'Giovanette', email:'mikela.giovanette@temp.local', role_id:'R003', squad_name:'Alfredo Colamorea', password:'N2W4Y7DG' }
  ];

  const results = [];
  USERS.forEach(u => {
    const squad_id = squadByCapo[u.squad_name];
    results.push(HOTFIX_upsertUser_(shUsers, shCred, u, squad_id));
  });

  Logger.log(JSON.stringify(results, null, 2));
  return { ok:true, results:results, note:'Revisá la hoja CREDENTIALS' };
}

/** Setear/actualizar el webhook de Make en Script Properties */
function HOTFIX_setWebhook_(){
  PropertiesService.getScriptProperties().setProperty(
    'MAKE_APPROVAL_WEBHOOK_URL',
    'https://hook.eu2.make.com/4n0u3otfcudumd04tc1kjb0v80bum7iz'
  );
  // Opcional: canal de notify (si lo tenés)
  // PropertiesService.getScriptProperties().setProperty('MAKE_NOTIFY_WEBHOOK_URL','https://hook.eu2.make.com/XXXX');
  return 'OK';
}

/** Wrapper para menú */
function RUN_SEED_CAPOS_VICES(){
  return HOTFIX_seedCaposVices_();
}
