export type MediaProvider = 'spotify' | 'youtube' | 'vimeo' | 'file' | 'unknown';

const SPOTIFY_PATH =
  /(?:open\.)?spotify\.com\/(?:embed\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/i;
const SPOTIFY_URI = /^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)$/i;

const YOUTUBE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i;

const VIMEO = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i;

export function detectMediaProvider(url: string): MediaProvider {
  if (!url) return 'unknown';
  if (SPOTIFY_PATH.test(url) || SPOTIFY_URI.test(url)) return 'spotify';
  if (YOUTUBE.test(url)) return 'youtube';
  if (VIMEO.test(url)) return 'vimeo';
  if (AUDIO_EXT.test(url) || VIDEO_EXT.test(url) || /res\.cloudinary\.com/i.test(url)) return 'file';
  if (/^https?:\/\//i.test(url)) return 'file';
  return 'unknown';
}

export function toSpotifyEmbedUrl(url: string): string | null {
  const path = url.match(SPOTIFY_PATH);
  if (path) {
    const [, type, id] = path;
    return `https://open.spotify.com/embed/${type}/${id}`;
  }
  const uri = url.match(SPOTIFY_URI);
  if (uri) {
    const [, type, id] = uri;
    return `https://open.spotify.com/embed/${type}/${id}`;
  }
  return null;
}

export function spotifyEmbedHeight(url: string): number {
  const match = url.match(SPOTIFY_PATH) || url.match(SPOTIFY_URI);
  const type = match?.[1]?.toLowerCase();
  if (type === 'track' || type === 'episode') return 152;
  return 352;
}

export function isAudioUrl(url: string): boolean {
  return AUDIO_EXT.test(url) || /\/video\/upload\/.*\.(mp3|wav|ogg|m4a)/i.test(url);
}

export function mediaPlaceholder(type: 'audio' | 'video' | 'playlist'): string {
  if (type === 'audio') return 'Spotify track/album URL, or audio file URL';
  if (type === 'playlist') return 'Spotify playlist URL';
  return 'YouTube / Vimeo URL, or video file URL';
}
