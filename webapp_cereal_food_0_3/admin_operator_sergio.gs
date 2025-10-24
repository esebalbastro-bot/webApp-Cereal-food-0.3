/** Crea/actualiza a SERGIO como OPERATORE (R004) y lo asocia a la squad de Carlo Marino */
function RUN_UPSERT_OPERATOR_SERGIO_EN_SQUAD_CARLO(){
  var email    = 'sergiom@temp.local';
  var password = '12345';            // solo para pruebas
  var nome     = 'Sergio';
  var cognome  = 'M';
  var capoFull = 'Carlo Marino';

  var shUsers  = ensureUsers_();
  var shSquads = ensureSquads_();

  // Buscar squad de "Carlo Marino" (por capo_name, fallback por squad_name)
  var headS = shSquads.getRange(1,1,1,Math.max(1, shSquads.getLastColumn())).getValues()[0];
  var s_ixId   = headS.indexOf('squad_id');
  var s_ixName = headS.indexOf('squad_name');
  var s_ixCapo = headS.indexOf('capo_name');

  var dataS = shSquads.getDataRange().getValues();
  var squadId = null;

  for (var i=1;i<dataS.length;i++){
    if (String(dataS[i][s_ixCapo]||'').trim() === capoFull){ squadId = String(dataS[i][s_ixId]||'').trim(); break; }
  }
  if (!squadId){
    for (var j=1;j<dataS.length;j++){
      if (String(dataS[j][s_ixName]||'').trim() === capoFull){ squadId = String(dataS[j][s_ixId]||'').trim(); break; }
    }
  }
  if (!squadId){
    // Si no existe, la creamos mínima para evitar errores
    squadId = 'SQUAD-' + capoFull.toUpperCase().replace(/\s+/g,'').slice(0,12);
    shSquads.appendRow([squadId, capoFull, capoFull, '', '', '']);
  }

  // Upsert en USERS con rol R004 + password HASH
  var headU    = shUsers.getRange(1,1,1,Math.max(1, shUsers.getLastColumn())).getValues()[0];
  var u_ixEmail= headU.indexOf('email');
  var u_ixRole = headU.indexOf('role_id');
  var u_ixSquad= headU.indexOf('squad_id');
  var u_ixHash = headU.indexOf('password_hash');
  var u_ixAct  = headU.indexOf('is_active');

  var dataU = shUsers.getDataRange().getValues();
  var foundRow = null;
  for (var r=1;r<dataU.length;r++){
    if (String(dataU[r][u_ixEmail]||'').toLowerCase() === email.toLowerCase()){ foundRow = r+1; break; }
  }

  var hash = hashPassword_(password, email);
  if (foundRow){
    if (u_ixRole >=0)  shUsers.getRange(foundRow, u_ixRole+1 ).setValue('R004');
    if (u_ixSquad>=0)  shUsers.getRange(foundRow, u_ixSquad+1).setValue(squadId);
    if (u_ixHash >=0)  shUsers.getRange(foundRow, u_ixHash+1 ).setValue(hash);
    if (u_ixAct  >=0)  shUsers.getRange(foundRow, u_ixAct+1  ).setValue(true);
  } else {
    var user_id = 'U' + Utilities.getUuid().slice(0,8).toUpperCase();
    shUsers.appendRow([user_id, nome, cognome, email, 'R004', squadId, true, new Date(), hash]);
  }

  // (Opcional) exportar a CREDENTIALS si existe
  try{
    var ss = getDb_();
    var cred = ss.getSheetByName('CREDENTIALS');
    if (cred){ cred.appendRow([nome, cognome, email, 'R004', squadId, password]); }
  }catch(e){}

  Logger.log('Operatore listo -> ' + email + ' / ' + password + ' (R004, squad ' + squadId + ')');
  return { ok:true, email: email, role_id:'R004', squad_id: squadId };
}
