/* ====== Notificaciones combinadas V2 (con SID y filtro por target) ====== */

function NAV2_countScatola_(u){
  const sh = ensureRequests_();
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const head = sh.getRange(1,1,1,lastCol).getValues()[0];
  const ixStatus = head.indexOf('status');
  const ixSquad  = head.indexOf('squad_id');
  const ixTarget = head.indexOf('approver_target'); // puede no existir

  let count = 0;
  for (let r=2; r<=sh.getLastRow(); r++){
    const row = sh.getRange(r,1,1,head.length).getValues()[0];
    if (String(row[ixSquad]) !== String(u.squad_id)) continue;
    if (String(row[ixStatus]||'').toUpperCase() !== 'PENDIENTE') continue;
    // Filtro por target (si hay columna)
    if (ixTarget >= 0){
      const tgt = String(row[ixTarget]||'').toUpperCase();
      if (tgt && !AC_isApproverForTarget_(u, tgt)) continue;
    }
    count++;
  }
  return count;
}

function NAV2_listScatola_(u){
  const sh = ensureRequests_();
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const head = sh.getRange(1,1,1,lastCol).getValues()[0];

  const ixId      = head.indexOf('request_id');
  const ixAt      = head.indexOf('created_at');
  const ixBy      = head.indexOf('created_by_user_id');
  const ixSquad   = head.indexOf('squad_id');
  const ixType    = head.indexOf('type');
  const ixCliente = head.indexOf('cliente');
  const ixLinea   = head.indexOf('linea');
  const ixQty     = head.indexOf('quantita');
  const ixStatus  = head.indexOf('status');
  const ixTarget  = head.indexOf('approver_target'); // -1 si no existe

  const items = [];
  for (let r=2; r<=sh.getLastRow(); r++){
    const row = sh.getRange(r,1,1,head.length).getValues()[0];
    if (String(row[ixSquad]) !== String(u.squad_id)) continue;
    if (String(row[ixStatus]||'').toUpperCase() !== 'PENDIENTE') continue;
    if (ixTarget >= 0){
      const tgt = String(row[ixTarget]||'').toUpperCase();
      if (tgt && !AC_isApproverForTarget_(u, tgt)) continue;
    }
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

/* Conteo/listado V2: usan SID para user correcto */
function api_countNotificationsForCapoV2(sid){
  try{
    const u = SES_getUserBySid_(sid);
    if (!isCapoOrJefe_(u.role_id)) return { ok:true, total:0, requests:0, assistenze:0 };
    const req = NAV2_countScatola_(u);
    const ass = api_countAssistenzeForCapo().count || 0;
    return { ok:true, total: req + ass, requests: req, assistenze: ass };
  } catch(e){
    return { ok:false, message:e.message, total:0, requests:0, assistenze:0 };
  }
}

function api_listNotificationsForCapoV2(sid){
  try{
    const u = SES_getUserBySid_(sid);
    if (!isCapoOrJefe_(u.role_id)) return { ok:true, items:[] };
    const listReq = NAV2_listScatola_(u);
    const listAss = api_listAssistenzeForCapo().items || [];
    const items = listReq.concat(listAss).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    return { ok:true, items };
  } catch(e){
    return { ok:false, message:e.message, items:[] };
  }
}
