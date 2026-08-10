const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file
const MAX_TOTAL_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB combined, base64-inflated

function currentAttachmentsTotalBytes(state, excludeDocType) {
  return state.attachments.filter((a) => a.documentType !== excludeDocType).reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Returns { ok: true } on success (mutates state.attachments), or { ok: false, message: {th,en} }.
async function handleDocUpload(state, documentType, file) {
  if (!file) return { ok: false, message: { th: 'ไม่พบไฟล์', en: 'No file selected.' } };

  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: { th: 'ไฟล์ใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 2 MB', en: 'File too large. Please use a file under 2 MB.' } };
  }

  const estimatedInflated = Math.ceil(file.size * 1.37); // base64 overhead
  const otherTotal = currentAttachmentsTotalBytes(state, documentType);
  if (otherTotal + estimatedInflated > MAX_TOTAL_BASE64_BYTES) {
    return { ok: false, message: { th: 'ขนาดไฟล์รวมเกิน 8 MB กรุณาลดขนาดไฟล์บางไฟล์', en: 'Combined attachments exceed 8 MB. Please shrink one or more files.' } };
  }

  const base64Data = await fileToBase64(file);
  const existingIndex = state.attachments.findIndex((a) => a.documentType === documentType);
  const record = {
    documentType,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    base64Data,
  };
  if (existingIndex >= 0) state.attachments[existingIndex] = record;
  else state.attachments.push(record);

  return { ok: true };
}

function removeAttachment(state, documentType) {
  state.attachments = state.attachments.filter((a) => a.documentType !== documentType);
}
