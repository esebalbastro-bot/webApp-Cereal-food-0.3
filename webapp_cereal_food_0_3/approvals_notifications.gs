/* ===================== NOTIFICHE + APPROVALS ===================== */
function notifyCapo_(squad_id, info, requester){
  try{
    const notifyUrl = getProp_('MAKE_NOTIFY_WEBHOOK_URL');
    if (notifyUrl) {
      const res = UrlFetchApp.fetch(notifyUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          kind: 'REQUEST_CREATED',
          squad_id: squad_id,
          request_id: info.request_id,
          cliente: info.cliente,
          linea: info.linea,
          quantita: info.quantita,
          requester_email: requester.email,
          requester_name: (requester.nome||'') + ' ' + (requester.cognome||'')
        }),
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      if (code >= 200 && code < 300) return { ok:true };
      return { ok:false, message:'Webhook notify risponde ' + code };
    }

    // Sin webhook: correo (si existe capo_email)
    const sh = ensureSquads_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId = head.indexOf('squad_id');
    const ixCapoEmail = head.indexOf('capo_email'); // puede ser -1 si no existe
    let capoEmail = '';
    if (ixCapoEmail >= 0){
      for (let i=1;i<data.length;i++){
        if (String(data[i][ixId]) === String(squad_id)){
          capoEmail = (data[i][ixCapoEmail]||'').toString().trim();
          break;
        }
      }
    }
    if (capoEmail) {
      GmailApp.sendEmail(
        capoEmail,
        'Nuova richiesta etichetta scatola',
        'Ciao,\n\nHai una nuova richiesta:\n' +
        '- Richiedente: ' + ((requester.nome||'') + ' ' + (requester.cognome||'')) + ' (' + requester.email + ')\n' +
        '- Cliente: ' + info.cliente + '\n' +
        '- Linea: '   + info.linea   + '\n' +
        '- Quantità: '+ info.quantita+ '\n' +
        '- ID: '      + info.request_id + '\n\n' +
        'Apri la WebApp per approvare o rifiutare.\n'
      );
      return { ok:true };
    }
    return { ok:false, message:'Nessun canale notify configurato.' };
  } catch(e){
    return { ok:false, message:e.message };
  }
}

/** Cuenta "PENDIENTE" para la squad del aprobador actual */
function api_countPendingForCapo(){
  try{
    const u = getCurrentUser_();
    if (!isCapoOrJefe_(u.role_id)) return { ok:true, count:0 }; // solo aprobadores
    const sh = ensureRequests_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixStatus  = head.indexOf('status');
    const ixSquad   = head.indexOf('squad_id');
    let count = 0;
    for (let r=1; r<data.length; r++){
      if (String(data[r][ixSquad]) === String(u.squad_id) &&
          String(data[r][ixStatus]||'').toUpperCase() === 'PENDIENTE'){
        count++;
      }
    }
    return { ok:true, count: count };
  } catch(e){
    return { ok:false, message:e.message, count:0 };
  }
}

/** Lista "PENDIENTE" para la squad del aprobador actual (para el modal) */
function api_listPendingForCapo(){
  try{
    const u = getCurrentUser_();
    if (!isCapoOrJefe_(u.role_id)) return { ok:true, items:[] };
    const sh = ensureRequests_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId      = head.indexOf('request_id');
    const ixAt      = head.indexOf('created_at');
    const ixBy      = head.indexOf('created_by_user_id');
    const ixSquad   = head.indexOf('squad_id');
    const ixType    = head.indexOf('type');
    const ixCliente = head.indexOf('cliente');
    const ixLinea   = head.indexOf('linea');
    const ixQty     = head.indexOf('quantita');
    const ixStatus  = head.indexOf('status');

    const items = [];
    for (let r=1; r<data.length; r++){
      const row = data[r];
      if (String(row[ixSquad]) !== String(u.squad_id)) continue;
      if (String(row[ixStatus]||'').toUpperCase() !== 'PENDIENTE') continue;
      items.push({
        request_id: row[ixId],
        created_at: row[ixAt],
        created_by_user_id: row[ixBy],
        squad_id: row[ixSquad],
        type: row[ixType],
        cliente: row[ixCliente],
        linea: row[ixLinea],
        quantita: row[ixQty]
      });
    }
    // ordenar por fecha desc
    items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    return { ok:true, items };
  } catch(e){
    return { ok:false, message:e.message, items:[] };
  }
}

/** Aprobar / Rechazar una solicitud pendiente de mi squad */
function api_approveRequest(request_id, approve, rejection_comment){
  try{
    const u = getCurrentUser_();
    if (!isCapoOrJefe_(u.role_id)) return { ok:false, message:'Permesso negato.' };

    const sh = ensureRequests_();
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const ixId      = head.indexOf('request_id');
    const ixAt      = head.indexOf('created_at');
    const ixBy      = head.indexOf('created_by_user_id');
    const ixSquad   = head.indexOf('squad_id');
    const ixType    = head.indexOf('type');
    const ixCliente = head.indexOf('cliente');
    const ixLinea   = head.indexOf('linea');
    const ixQty     = head.indexOf('quantita');
    const ixStatus  = head.indexOf('status');
    const ixApprBy  = head.indexOf('approved_by_user_id');
    const ixApprAt  = head.indexOf('approved_at');
    const ixReject  = head.indexOf('rejection_comment');
    const ixMakeSt  = head.indexOf('make_webhook_status');
    const ixMakeAtt = head.indexOf('make_webhook_attempts');
    const ixMakeErr = head.indexOf('make_webhook_last_error');
    const ixPayload = head.indexOf('payload_json');

    // localizar fila
    let rowIdx = -1;
    for (let r=1; r<data.length; r++){
      if (String(data[r][ixId]) === String(request_id)){
        rowIdx = r+1; break;
      }
    }
    if (rowIdx < 0) return { ok:false, message:'Richiesta non trovata.' };

    const row = sh.getRange(rowIdx, 1, 1, sh.getLastColumn()).getValues()[0];
    if (String(row[ixSquad]) !== String(u.squad_id)) return { ok:false, message:'Non appartiene alla tua squadra.' };
    if (String(row[ixStatus]||'').toUpperCase() !== 'PENDIENTE') return { ok:false, message:'La richiesta non è più in attesa.' };

    if (approve){
      // enviar a Make con el payload original
      let payload = {};
      try { payload = JSON.parse(row[ixPayload]||'{}'); } catch(_){}
      const sent = sendToMake_(payload);
      // persistir estado
      sh.getRange(rowIdx, ixStatus+1).setValue('APPROVATO');
      sh.getRange(rowIdx, ixApprBy+1).setValue(u.user_id);
      sh.getRange(rowIdx, ixApprAt+1).setValue(new Date());
      sh.getRange(rowIdx, ixReject+1).setValue('');
      sh.getRange(rowIdx, ixMakeSt+1).setValue(sent.ok ? 'SENT' : 'ERROR');
      sh.getRange(rowIdx, ixMakeAtt+1).setValue( Number(row[ixMakeAtt]||0) + 1 );
      sh.getRange(rowIdx, ixMakeErr+1).setValue(sent.ok ? '' : (sent.message||''));
      return sent.ok
        ? { ok:true, message:'Inviato a Make.' }
        : { ok:false, message:'Errore inviando a Make: ' + (sent.message||'') };
    } else {
      // rechazo
      sh.getRange(rowIdx, ixStatus+1).setValue('RIFIUTATO');
      sh.getRange(rowIdx, ixApprBy+1).setValue(u.user_id);
      sh.getRange(rowIdx, ixApprAt+1).setValue(new Date());
      sh.getRange(rowIdx, ixReject+1).setValue(String(rejection_comment||''));
      return { ok:true, message:'Richiesta rifiutata.' };
    }
  } catch(e){
    return { ok:false, message:e.message };
  }
}
