function getOriginFromUrl(url) {
  if (typeof url !== 'string' || !url) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed.origin;
}

function isOriginEnabled(disabledOrigins, origin) {
  if (!origin) {
    return false;
  }

  if (!disabledOrigins || typeof disabledOrigins !== 'object') {
    return true;
  }

  return disabledOrigins[origin] !== true;
}

function toggleOriginState(disabledOrigins, origin) {
  const next = { ...(disabledOrigins && typeof disabledOrigins === 'object' ? disabledOrigins : {}) };

  if (isOriginEnabled(next, origin)) {
    next[origin] = true;
    return { enabled: false, disabledOrigins: next };
  }

  delete next[origin];
  return { enabled: true, disabledOrigins: next };
}

module.exports = {
  getOriginFromUrl,
  isOriginEnabled,
  toggleOriginState,
};
