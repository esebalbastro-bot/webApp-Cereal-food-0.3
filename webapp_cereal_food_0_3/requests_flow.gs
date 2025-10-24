/* ===================== SOLICITUDES / ENVÍO A MAKE ===================== */
function sendToMake_(payload){
  try{
    const url = getProp_('MAKE_APPROVAL_WEBHOOK_URL'); // Script Properties
    if (!url) return { ok:false, message:'Falta MAKE_APPROVAL_WEBHOOK_URL.' };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code >= 200 && code < 300) return { ok:true, code, text };
    return { ok:false, message:'HTTP ' + code + ' – ' + text, code, text };
  } catch(e){
    return { ok:false, message:e.message };
  }
}

function createPendingRequest_(payload){
  const sh = ensureRequests_();
  const reqId = 'REQ-' + Utilities.getUuid().slice(0,8).toUpperCase();
  const row = [
    reqId, payload.created_at, payload.created_by_user_id, payload.squad_id,
    payload.type, payload.cliente, '', payload.quantita, payload.linea, (payload.note||''),
    'PENDIENTE', '', '', '',
    'N/A', 0, '',
    JSON.stringify(payload)
  ];
  sh.appendRow(row);
  return reqId;
}

/**
 * Endpoint principal llamado desde el front:
 * body = { type:'SCATOLA', cliente, linea, quantita, note? }
 * JEFE/CAPOTURNO/VICE => envío directo a Make (sin aprobación).
 */
function api_requestsCreateOrSend(body){
  try{
    const user = getCurrentUser_(); // de UserProperties (login)
    if (!user || !user.is_active) return { ok:false, message:'Utente non attivo.' };

    // VALIDACIONES
    const type = String(body && body.type || '').trim().toUpperCase();
    const cliente = (body && body.cliente || '').trim();
    const linea   = (body && body.linea   || '').trim();
    const quantita = parseInt(body && body.quantita, 10);
    const note    = (body && body.note    || '').trim();

    if (type !== 'SCATOLA') return { ok:false, message:'Tipo non valido.' };
    if (!cliente || !linea || !quantita || quantita <= 0) {
      return { ok:false, message:'Campi obbligatori mancanti o non validi.' };
    }

    // Payload enriquecido server-side
    const payload = {
      type: 'SCATOLA',
      cliente, linea, quantita, note,
      created_at: nowIso_(),
      created_by_user_id: user.user_id,
      created_by_email: user.email,
      squad_id: user.squad_id
    };

    // DECISIÓN POR ROL (R001/R002/R003 o nombres) → directo a Make
    if (isCapoOrJefe_(user.role_id)) {
      const sent = sendToMake_(payload);
      if (sent.ok) return { ok:true, message:'Inviato a Make.', make_status:'SENT', code: sent.code };
      return { ok:false, message:'Errore inviando a Make: ' + sent.message };
    }

    // OPERATORE → crea pendiente + notifica
    const reqId = createPendingRequest_(payload);
    const notified = notifyCapo_(user.squad_id, {
      request_id: reqId, cliente, linea, quantita
    }, user);
    const msg = notified.ok
      ? 'Richiesta creata. In attesa di approvazione.'
      : 'Richiesta creata. (Notifica al Capo non inviata.)';
    return { ok:true, request_id: reqId, status:'PENDIENTE', message: msg };

  } catch(err){
    return { ok:false, message:'Errore: ' + err.message };
  }
}
