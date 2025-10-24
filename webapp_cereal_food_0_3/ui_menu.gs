/* ===================== UI ENTRY (doGet + fondo) ===================== */
function getBgDataUrl_() {
  try {
    const file = DriveApp.getFileById(BG_FILE_ID);
    const blob = file.getBlob();
    const mime = blob.getContentType(); // ej: image/jpeg
    const bytes = Utilities.base64Encode(blob.getBytes());
    return { url: 'data:' + mime + ';base64,' + bytes, mime, size: blob.getBytes().length };
  } catch (e) {
    return { url: '', mime: '', size: 0, error: e.message };
  }
}

/** doGet: usa Template para inyectar bgDataUrl */
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('index');
  const bg = getBgDataUrl_();
  t.bgDataUrl = bg.url;          // string data URL (o vacío si error)
  t.bgError   = bg.error || '';  // texto si hubo error
  t.bgMime    = bg.mime || '';
  t.bgSize    = bg.size || 0;
  return t.evaluate()
           .setTitle('Cereal Food – Etichette')
           .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
