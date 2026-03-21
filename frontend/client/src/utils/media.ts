export const isVideo = (url?: string): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export const isGif = (url?: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.gif');
};
