/* ===================== ASSISTENZE (Capoturno / Vice) ===================== */

function AC_nowIso_(){ return new Date().toISOString(); }

function ensureAssistenze_(){
  const ss = getDb_();
  return getOrCreateSheet_(ss, 'ASSISTENZE', [
    'assist_id','created_at','created_by_user_id','created_by_email',
    'squad_id','target','linea','message',
    'status','ack_by_user_id','ack_at','payload_json'
  ]);
}

/** Crea una asistencia PENDIENTE (Capoturno/Vice) */
function createAssistenzaPending_(target, linea, message, requester){
  const sh = ensureAssistenze_();
  const id = 'AS-' + Utilities.getUuid().slice(0,8).toUpperCase();
  const row = [
    id, AC_nowIso_(), requester.user_id, requester.email,
    requester.squad_id, String(target||'').toUpperCase(), String(linea||''), String(message||''),
    'PENDING','', '', JSON.stringify({created_by: requester.email, target, linea, message})
  ];
  sh.appendRow(row);
  return id;
}

/** ¿El usuario puede ver esta asistencia? (por rol y target) */
function AC_isApproverForTarget_(user, target){
  const t = String(target||'').toUpperCase();
  const role = String(user.role_id||'').toUpperCase();
  if (role === 'R001') return true; // JEFE ve todo
  if (role === 'R002') return (t === 'CAPOTURNO' || t === 'CAPO'); // CAPO
  if (role === 'R003') return (t === 'VICE' || t === 'VICE_CAPOTURNO'); // VICE
  return false;
}

/** Conteo de asistencias PENDING para el aprobador actual */
function api_countAssistenzeForCapo(){
  try{
    const u = getCurrentUser_();
    const sh = ensureAssistenze_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixSquad = head.indexOf('squad_id');
    const ixTarget= head.indexOf('target');
    const ixStatus= head.indexOf('status');
    let count = 0;
    for (let r=1; r<data.length; r++){
      const row = data[r];
      if (String(row[ixSquad]) !== String(u.squad_id)) continue;
      if (String(row[ixStatus]||'').toUpperCase() !== 'PENDING') continue;
      if (!AC_isApproverForTarget_(u, row[ixTarget])) continue;
      count++;
    }
    return { ok:true, count };
  } catch(e){
    return { ok:false, message:e.message, count:0 };
  }
}

/** Lista de asistencias PENDING para el aprobador actual */
function api_listAssistenzeForCapo(){
  try{
    const u = getCurrentUser_();
    const sh = ensureAssistenze_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId     = head.indexOf('assist_id');
    const ixAt     = head.indexOf('created_at');
    const ixByMail = head.indexOf('created_by_email');
    const ixSquad  = head.indexOf('squad_id');
    const ixTarget = head.indexOf('target');
    const ixLinea  = head.indexOf('linea');
    const ixMsg    = head.indexOf('message');
    const ixStatus = head.indexOf('status');

    const items = [];
    for (let r=1; r<data.length; r++){
      const row = data[r];
      if (String(row[ixSquad]) !== String(u.squad_id)) continue;
      if (String(row[ixStatus]||'').toUpperCase() !== 'PENDING') continue;
      if (!AC_isApproverForTarget_(u, row[ixTarget])) continue;

      items.push({
        type: 'ASSISTENZA',
        assist_id: row[ixId],
        created_at: row[ixAt],
        requester_email: row[ixByMail],
        squad_id: row[ixSquad],
        target: row[ixTarget],
        linea: row[ixLinea],
        message: row[ixMsg]
      });
    }
    items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    return { ok:true, items };
  } catch(e){
    return { ok:false, message:e.message, items:[] };
  }
}

/** Marcar asistencia como gestionada (CLOSED) */
function api_ackAssistenza(assist_id){
  try{
    const u = getCurrentUser_();
    const sh = ensureAssistenze_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId     = head.indexOf('assist_id');
    const ixSquad  = head.indexOf('squad_id');
    const ixTarget = head.indexOf('target');
    const ixStatus = head.indexOf('status');
    const ixAckBy  = head.indexOf('ack_by_user_id');
    const ixAckAt  = head.indexOf('ack_at');

    let rowIdx = -1;
    for (let r=1; r<data.length; r++){
      if (String(data[r][ixId]) === String(assist_id)){
        rowIdx = r+1; break;
      }
    }
    if (rowIdx < 0) return { ok:false, message:'Assistenza non trovata.' };

    const row = sh.getRange(rowIdx,1,1,sh.getLastColumn()).getValues()[0];
    if (String(row[ixSquad]) !== String(u.squad_id)) return { ok:false, message:'Non appartiene alla tua squadra.' };
    if (!AC_isApproverForTarget_(u, row[ixTarget])) return { ok:false, message:'Permesso negato.' };
    if (String(row[ixStatus]).toUpperCase() !== 'PENDING') return { ok:false, message:'Già gestita.' };

    sh.getRange(rowIdx, ixStatus+1).setValue('CLOSED');
    sh.getRange(rowIdx, ixAckBy+1).setValue(u.user_id);
    sh.getRange(rowIdx, ixAckAt+1).setValue(new Date());
    return { ok:true, message:'Assistenza segnata come gestita.' };
  } catch(e){
    return { ok:false, message:e.message };
  }
}
