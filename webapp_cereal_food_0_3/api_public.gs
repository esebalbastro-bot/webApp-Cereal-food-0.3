/* =========================== API PÚBLICA PARA EL FRONT =========================== */
// Lista para dropdown de capoturni en “Richiedi accesso”
function listCapoturni() {
  const sh = ensureSquads_();
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const iId = head.indexOf('squad_id');
  const iName = head.indexOf('squad_name');
  const iCapo = head.indexOf('capo_name');
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] && data[i][iName]) {
      out.push({ squad_id: data[i][iId], squad_name: data[i][iName], capo_name: data[i][iCapo] || '' });
    }
  }
  return out;
}
