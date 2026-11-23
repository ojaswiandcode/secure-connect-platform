// Minimal cookie parser (no extra library needed)
const parseCookies = (header = '') => {
  const cookies = {};
  header.split(';').forEach((pair) => {
    const index = pair.indexOf('=');
    if (index < 0) return;
    const key = pair.slice(0, index).trim();
    try {
      cookies[key] = decodeURIComponent(pair.slice(index + 1).trim());
    } catch {
      /* ignore malformed cookie values */
    }
  });
  return cookies;
};

module.exports = { parseCookies };
