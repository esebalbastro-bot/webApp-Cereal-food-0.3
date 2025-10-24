/* ========== SCATOLA V2: con SID y destino CAPO/VICE ========== */

/* Asegura columna 'approver_target' en REQUESTS */
function RFV2_ensureRequestsTarget_(){
  const sh = ensureRequests_();
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const head = sh.getRange(1,1,1,lastCol).getValues()[0];
  if (!head.includes('approver_target')){
    sh.insertColumnAfter(lastCol);
    sh.getRange(1, lastCol+1).setValue('approver_target');
  }
  return sh;
}

/**
 * body = { type:'SCATOLA', cliente, linea, quantita, note?, approver_target:'CAPOTURNO'|'VICE' }
 * api_requestsCreateOrSendV2(body, sid)
 * - Usa SID para resolver el usuario real (sin compartir sesión)
 * - Guarda approver_target para que solo vea la notificación el rol elegido
 */
function api_requestsCreateOrSendV2(body, sid){
  try{
    const user = SES_getUserBySid_(sid);
    if (!user || !user.is_active) return { ok:false, message:'Utente non attivo.' };

    const type = String(body && body.type || '').trim().toUpperCase();
    const cliente = (body && body.cliente || '').trim();
    const linea   = (body && body.linea   || '').trim();
    const quantita = parseInt(body && body.quantita, 10);
    const note    = (body && body.note    || '').trim();
    let target    = (body && body.approver_target || '').toString().trim().toUpperCase();
    if (target === 'CAPO') target = 'CAPOTURNO';
    if (target === 'VICE_CAPOTURNO') target = 'VICE';

    if (type !== 'SCATOLA') return { ok:false, message:'Tipo non valido.' };
    if (!cliente || !linea || !quantita || quantita <= 0) return { ok:false, message:'Campi obbligatori mancanti o non validi.' };
    if (!target || !['CAPOTURNO','VICE'].includes(target)) target = 'CAPOTURNO'; // default

    const payload = {
      type: 'SCATOLA',
      cliente, linea, quantita, note,
      created_at: nowIso_(),
      created_by_user_id: user.user_id,
      created_by_email: user.email,
      squad_id: user.squad_id,
      approver_target: target
    };

    // Aprobadores directos -> Make, Operatore -> pendiente
    if (isCapoOrJefe_(user.role_id)) {
      const sent = sendToMake_(payload);
      if (sent.ok) return { ok:true, message:'Inviato a Make.', make_status:'SENT', code: sent.code };
      return { ok:false, message:'Errore inviando a Make: ' + sent.message };
    }

    // R004 -> PENDIENTE + guarda approver_target
    const sh = RFV2_ensureRequestsTarget_();
    const reqId = createPendingRequest_(payload);
    // setear approver_target en la fila recién creada
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId  = head.indexOf('request_id');
    const ixTar = head.indexOf('approver_target');
    for (let r=1; r<data.length; r++){
      if (String(data[r][ixId]) === String(reqId)){
        sh.getRange(r+1, ixTar+1).setValue(target);
        break;
      }
    }
    // (Opcional) webhook/email: desactivado por tu requerimiento
    return { ok:true, request_id: reqId, status:'PENDIENTE', message:'Richiesta creata. In attesa di approvazione ('+target+').' };

  } catch(err){
    return { ok:false, message:'Errore: ' + err.message };
  }
}
