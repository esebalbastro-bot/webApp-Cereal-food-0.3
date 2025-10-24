/* ===================== AGREGADOR DE NOTIFICACIONES ===================== */

/** Conteo SCATOLA pendientes para mi squad (igual lógica que api_countPendingForCapo) */
function NA_countScatola_(u){
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
  return count;
}

/** Lista SCATOLA pendientes (mapeadas como ítems de tipo SCATOLA) */
function NA_listScatola_(u){
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
      type: 'SCATOLA',
      request_id: row[ixId],
      created_at: row[ixAt],
      created_by_user_id: row[ixBy],
      squad_id: row[ixSquad],
      cliente: row[ixCliente],
      linea: row[ixLinea],
      quantita: row[ixQty]
    });
  }
  items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  return items;
}

/** Conteo combinado: SCATOLA + ASSISTENZE */
function api_countNotificationsForCapo(){
  try{
    const u = getCurrentUser_();
    if (!isCapoOrJefe_(u.role_id)) {
      // Operatori non ven visualizzano notificaciones
      return { ok:true, total:0, requests:0, assistenze:0 };
    }
    const requests = NA_countScatola_(u);
    const ass = (api_countAssistenzeForCapo().count) || 0;
    return { ok:true, total: (requests + ass), requests, assistenze: ass };
  } catch(e){
    return { ok:false, message:e.message, total:0, requests:0, assistenze:0 };
  }
}

/** Listado combinado para el modal */
function api_listNotificationsForCapo(){
  try{
    const u = getCurrentUser_();
    if (!isCapoOrJefe_(u.role_id)) return { ok:true, items:[] };

    const listReq = NA_listScatola_(u);
    const listAss = (api_listAssistenzeForCapo().items) || [];

    const items = listReq.concat(listAss).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    return { ok:true, items };
  } catch(e){
    return { ok:false, message:e.message, items:[] };
  }
}
