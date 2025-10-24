/* ===================== CONFIG & ROLES ===================== */
const DB_NAME   = 'CF_WEBAPP_DB';
const PROP_DB_ID = 'CF_DB_SPREADSHEET_ID';
const BG_FILE_ID = '11oYH1C5lRSOWWPafm30bDaLqKXsfvGDv'; // imagen de fondo (Drive)

/** ISO-8601 ahora */
function nowIso_(){ return new Date().toISOString(); }

/** Script Properties (trim) */
function getProp_(key){
  return (PropertiesService.getScriptProperties().getProperty(key) || '').trim();
}

/** Roles CAPO/JEFE normalizados — acepta códigos (R001/R002/R003) o nombres (JEFE/CAPOTURNO/VICE) */
function isCapoOrJefe_(role){
  const r = String(role || '').trim().toUpperCase();
  return r === 'JEFE' || r === 'CAPOTURNO' || r === 'VICE' || r === 'VICE_CAPOTURNO' || r === 'R001' || r === 'R002' || r === 'R003';
}
