// Sends files only to this copy's own server. It never calls TONK's live backend.
export function upload(pathname, blob, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.handleUploadUrl || './api/upload', location.href)
    url.searchParams.set('pathname', pathname)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Content-Type', options.contentType || blob.type || 'application/octet-stream')
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) options.onUploadProgress?.({ percentage: event.loaded / event.total * 100 })
    }
    xhr.onerror = () => reject(new Error('Upload failed. Please try again.'))
    xhr.onload = () => {
      let result
      try { result = JSON.parse(xhr.responseText) } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && result?.url) resolve(result)
      else reject(new Error(result?.error || 'Uploads are unavailable on this host.'))
    }
    xhr.send(blob)
  })
}
