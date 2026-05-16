export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 8 * 60;

export function formatAudioLimit(bytes = MAX_AUDIO_BYTES) {
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;
}

export function formatDurationLimit(seconds = MAX_RECORDING_SECONDS) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
}
