/** Turns a getUserMedia error into a clear sentence for the user. device is "Camera" or "Microphone". */
export function explainMediaError(err, device) {
  const name = err && err.name
  const lower = device.toLowerCase()
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return `${device} permission was denied. Allow it in your browser's site settings, then try again.`
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return `No ${lower} was found on this device.`
  if (name === 'NotReadableError' || name === 'AbortError') return `The ${lower} is being used by another app. Close it and try again.`
  return `The ${lower} could not be started.`
}
