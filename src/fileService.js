import { fileRequest } from './api';

export async function uploadFileAsset(token, file, category) {
  const presigned = await fileRequest('/files/presign-upload', {
    method: 'POST',
    token,
    body: {
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: file.size,
      category,
    },
  });

  await fetch(presigned.upload_url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  const completed = await fileRequest(`/files/${presigned.file_id}/complete`, {
    method: 'POST',
    token,
  });

  return completed;
}

export async function getDownloadUrl(token, fileId) {
  return fileRequest(`/files/${fileId}/download-url`, { token });
}
