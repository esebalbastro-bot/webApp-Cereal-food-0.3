/* ===================== ADMIN / MENÚ ===================== */
function setUserRoleByEmail_(email, newRole){
  const sh = ensureUsers_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const iEmail = head.indexOf('email');
  const iRole  = head.indexOf('role_id');
  for (let r=1; r<data.length; r++){
    if ((data[r][iEmail]||'').toString().trim().toLowerCase() === String(email||'').trim().toLowerCase()){
      sh.getRange(r+1, iRole+1).setValue(newRole); // 'R001' o 'JEFE'
      return 'OK';
    }
  }
  throw new Error('Email non trovato: ' + email);
}

/**
 * Crea/actualiza un superusuario (R001 = JEFE) con contraseña fija.
 * - Usuario: esebalbastro@gmail.com
 * - Password: QDkRkKpf8i
 * - Squad: ADMIN (se crea si no existe)
 * - También agrega fila en CREDENTIALS si existe esa hoja.
 */
function RUN_ADD_SUPERUSER(){
  var email = 'esebalbastro@gmail.com';
  var password = 'QDkRkKpf8i';
  var nome = 'Ese';
  var cognome = 'Balbastro';

  // Asegurar hojas base
  var shUsers  = ensureUsers_();
  var shSquads = ensureSquads_();

  // 1) Asegurar SQUAD ADMIN
  var headS = shSquads.getRange(1,1,1,Math.max(1, shSquads.getLastColumn())).getValues()[0];
  var s_ixId   = headS.indexOf('squad_id');
  var s_ixName = headS.indexOf('squad_name');
  var adminSquadId = null;

  var dataS = shSquads.getDataRange().getValues();
  for (var i=1;i<dataS.length;i++){
    var name = (dataS[i][s_ixName] || '').toString().trim().toUpperCase();
    if (name === 'ADMIN'){
      adminSquadId = (dataS[i][s_ixId] || '').toString().trim();
      break;
    }
  }
  if (!adminSquadId){
    adminSquadId = 'SQUAD-ADMIN';
    // cols: squad_id,squad_name,capo_name,vice_name,capo_email,vice_email
    shSquads.appendRow([adminSquadId, 'ADMIN', '(Jefe)', '', '', '']);
  }

  // 2) Crear/actualizar el usuario como R001 (JEFE) con password fija
  var headU   = shUsers.getRange(1,1,1,Math.max(1, shUsers.getLastColumn())).getValues()[0];
  var u_ixEmail = headU.indexOf('email');
  var u_ixRole  = headU.indexOf('role_id');
  var u_ixSquad = headU.indexOf('squad_id');
  var u_ixHash  = headU.indexOf('password_hash');
  var u_ixActive= headU.indexOf('is_active');

  var dataU = shUsers.getDataRange().getValues();
  var foundRow = null;
  for (var r=1;r<dataU.length;r++){
    var em = (dataU[r][u_ixEmail] || '').toString().trim().toLowerCase();
    if (em === email.toLowerCase()){
      foundRow = r+1;
      break;
    }
  }

  var hash = hashPassword_(password, email);
  if (foundRow){
    if (u_ixRole  >=0) shUsers.getRange(foundRow, u_ixRole+1 ).setValue('R001');
    if (u_ixSquad >=0) shUsers.getRange(foundRow, u_ixSquad+1).setValue(adminSquadId);
    if (u_ixHash  >=0) shUsers.getRange(foundRow, u_ixHash+1 ).setValue(hash);
    if (u_ixActive>=0) shUsers.getRange(foundRow, u_ixActive+1).setValue(true);
  } else {
    var user_id = 'U' + Utilities.getUuid().slice(0,8).toUpperCase();
    shUsers.appendRow([user_id, nome, cognome, email, 'R001', adminSquadId, true, new Date(), hash]);
  }

  // 3) (Opcional) Registrar en CREDENTIALS si existe
  try{
    var ss = getDb_();
    var cred = ss.getSheetByName('CREDENTIALS');
    if (cred){
      cred.appendRow([nome, cognome, email, 'R001', adminSquadId, password]);
    }
  }catch(e){ /* no-op */ }

  Logger.log('Superuser listo -> ' + email + ' / ' + password + ' (role R001, squad ' + adminSquadId + ')');
  return { ok:true, email: email, role_id: 'R001', squad_id: adminSquadId };
}

/** Verificación rápida en Logs */
function debug_CheckSetup_(){
  try{
    const u = getCurrentUser_();
    Logger.log('CURRENT user email=%s role_id=%s squad_id=%s', u.email, u.role_id, u.squad_id);
    Logger.log('MAKE_APPROVAL_WEBHOOK_URL=%s', getProp_('MAKE_APPROVAL_WEBHOOK_URL'));
    Logger.log('MAKE_NOTIFY_WEBHOOK_URL=%s', getProp_('MAKE_NOTIFY_WEBHOOK_URL'));
  } catch(e){
    Logger.log('Error debug: ' + e.message);
  }
}

/** Menú (único) */
function onOpen(){
  try{
    SpreadsheetApp.getUi()
      .createMenu('CF Admin')
      .addItem('Crear/actualizar SUPERUSER (R001)', 'RUN_ADD_SUPERUSER')
      .addItem('Seed CAPOS/VICES', 'RUN_SEED_CAPOS_VICES')     // en seed_dev.gs
      .addItem('Set Webhook Make (HOTFIX)', 'HOTFIX_setWebhook_') // en seed_dev.gs
      .addSeparator()
      .addItem('Debug: Check Setup (Logs)', 'debug_CheckSetup_')
      .addToUi();
  }catch(e){
    // Si es standalone (no vinculado a sheet), no hay UI
  }
}
