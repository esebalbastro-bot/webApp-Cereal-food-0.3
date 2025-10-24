/* ===================== RICHIEDI CAPOTURNO / VICE ===================== */

/** (Opcional) Obtener contactos de la squad */
function RC_getSquadContacts_(squad_id){
  const sh = ensureSquads_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const ixId   = head.indexOf('squad_id');
  const ixCapoName  = head.indexOf('capo_name');
  const ixViceName  = head.indexOf('vice_name');
  const ixCapoEmail = head.indexOf('capo_email');
  const ixViceEmail = head.indexOf('vice_email');

  for (let r=1; r<data.length; r++){
    if (String(data[r][ixId]) === String(squad_id)){
      return {
        capo_name : (data[r][ixCapoName]  || '').toString().trim(),
        capo_email: (data[r][ixCapoEmail] || '').toString().trim(),
        vice_name : (data[r][ixViceName]  || '').toString().trim(),
        vice_email: (data[r][ixViceEmail] || '').toString().trim()
      };
    }
  }
  return { capo_name:'', capo_email:'', vice_name:'', vice_email:'' };
}

/**
 * API del botón "Richiedi capoturno"
 * body = { target: 'CAPOTURNO'|'VICE', linea:'', message:'' }
 * -> Registra en ASSISTENZE como PENDING. La burbuja lo mostrará al capoturno/vice correspondiente.
 */
function api_requestCapoturno(body){
  try{
    const u = getCurrentUser_();
    if (!u || !u.is_active) return { ok:false, message:'Utente non attivo.' };

    const targetRaw = (body && body.target || '').toString().trim().toUpperCase();
    const target = (targetRaw === 'VICE' || targetRaw === 'VICE_CAPOTURNO' || targetRaw === 'VICECAPOTURNO') ? 'VICE'
                  : (targetRaw === 'CAPO' || targetRaw === 'CAPOTURNO') ? 'CAPOTURNO'
                  : '';
    if (!target) return { ok:false, message:'Seleziona CAPOTURNO o VICE.' };

    const linea = (body && body.linea || '').toString().trim();
    const message = (body && body.message || '').toString().trim();
    if (!linea) return { ok:false, message:'Inserisci la linea.' };

    const id = createAssistenzaPending_(target, linea, message, u);
    return { ok:true, assist_id:id, message:'Richiesta registrata. Il capoturno/vice la vedrà nelle notifiche.' };
  } catch(e){
    return { ok:false, message:e.message };
  }
}
