/* ===================== CLIENTI (desde Sheet externo) ===================== */
function RUN_ONCE__ConfigureExternalClienti(){
  PropertiesService.getScriptProperties().setProperty('EXT_CLIENTI_SHEET_ID',
    '1qUwypzlYJmZPjAMkLJrJVxp1XTgN2H3lJYtafXu-yMY'
  );
  PropertiesService.getScriptProperties().setProperty('EXT_CLIENTI_TAB_NAME', 'CLIENTES');
  Logger.log('OK: EXT_CLIENTI_SHEET_ID + EXT_CLIENTI_TAB_NAME configurados.');
}
function readExternalClienti_(){
  const props = PropertiesService.getScriptProperties();
  const extId  = (props.getProperty('EXT_CLIENTI_SHEET_ID')||'').trim();
  const extTab = (props.getProperty('EXT_CLIENTI_TAB_NAME')||'').trim();
  if (!extId) throw new Error('Falta EXT_CLIENTI_SHEET_ID');

  const ext = SpreadsheetApp.openById(extId);
  const sh  = extTab ? ext.getSheetByName(extTab) : ext.getSheets()[0];
  if (!sh) throw new Error('No se encontró la pestaña "'+extTab+'" en el Sheet externo.');

  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const head = data[0].map(h => String(h||'').trim().toLowerCase());
  const iIdCand   = [head.indexOf('cliente_id'), head.indexOf('id')].filter(i=>i>=0)[0];
  const iNameCand = [head.indexOf('cliente_name'), head.indexOf('cliente'), head.indexOf('name'), head.indexOf('nombre')].filter(i=>i>=0)[0];
  const iAct      = head.indexOf('is_active');

  const out = [];
  for (let r=1; r<data.length; r++){
    const row = data[r];
    const name = (iNameCand!=null) ? String(row[iNameCand]||'').trim() : String(row[0]||'').trim();
    if (!name) continue;
    const id   = (iIdCand!=null) ? String(row[iIdCand]||'').trim() : name;
    const act  = (iAct>=0) ? String(row[iAct]).toLowerCase() === 'true' : true;
    out.push({ id, name, active: act });
  }
  return out;
}
function syncClientiFromExternal_(){
  const src = readExternalClienti_();
  if (!src.length) throw new Error('No se encontraron clientes válidos en el Sheet externo.');

  const seen = new Map(); // nombre normalizado -> registro
  for (const c of src){
    const key = String(c.name||'').trim().toUpperCase();
    if (!key) continue;
    if (!seen.has(key)){
      seen.set(key, { id: c.id || c.name, name: c.name, active: (c.active !== false) });
    }
  }
  const list = Array.from(seen.values()).sort((a,b)=> a.name.localeCompare(b.name));

  const sh = ensureClienti_();
  // Limpia datos previos (deja headers)
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1, sh.getLastColumn()).clearContent();

  const now = new Date();
  const out = list.map(c => [c.id, c.name, c.active, now]);
  if (out.length) sh.getRange(2,1,out.length,4).setValues(out);

  Logger.log('CLIENTI sincronizados: ' + out.length);
  return { ok:true, count: out.length };
}
function listClienti(){
  const sh = ensureClienti_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const head = data[0];
  const iId   = head.indexOf('cliente_id');
  const iName = head.indexOf('cliente_name');
  const iAct  = head.indexOf('is_active');
  const out = [];
  for (let r=1; r<data.length; r++){
    const active = String(data[r][iAct]).toLowerCase() === 'true';
    if (!active) continue;
    const id = (data[r][iId]||'').toString().trim();
    const nm = (data[r][iName]||'').toString().trim();
    if (id && nm) out.push({ cliente_id: id, cliente_name: nm });
  }
  out.sort((a,b)=> a.cliente_name.localeCompare(b.cliente_name));
  return out;
}
