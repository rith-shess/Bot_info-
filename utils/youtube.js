// Accepts the usual ways people copy a YouTube link and returns one clean https URL,
// or null when it is not a YouTube link. Only youtube.com / youtu.be addresses are accepted.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,60}$/;
const HOSTS = ['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'];

function normalizeYouTubeUrl(input) {
  if (input === undefined || input === null) return null;
  let raw = String(input).trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

  let url;
  try {
    url = new URL(raw);
  } catch (e) {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const startAt = (url.searchParams.get('t') || url.searchParams.get('start') || '');
  const watchUrl = (id) => {
    let out = `https://www.youtube.com/watch?v=${id}`;
    if (/^\d+s?$/.test(startAt)) out += `&t=${parseInt(startAt, 10)}s`;
    return out;
  };

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || '';
    return VIDEO_ID.test(id) ? watchUrl(id) : null;
  }

  if (HOSTS.includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') {
      const id = url.searchParams.get('v') || '';
      return VIDEO_ID.test(id) ? watchUrl(id) : null;
    }
    if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
      return VIDEO_ID.test(parts[1] || '') ? watchUrl(parts[1]) : null;
    }
    if (parts[0] === 'playlist') {
      const list = url.searchParams.get('list') || '';
      return PLAYLIST_ID.test(list) ? `https://www.youtube.com/playlist?list=${list}` : null;
    }
  }
  return null;
}

module.exports = { normalizeYouTubeUrl };
