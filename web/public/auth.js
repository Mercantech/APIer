(() => {
  const AUTH = {
    issuer: "https://auth.mercantec.tech",
    clientId: "apier-web",
    audience: "mercantec-apps",
    redirectUri: () => `${window.location.origin}/auth/callback`,
    authorizeUrl: "https://auth.mercantec.tech/oauth/authorize",
    tokenUrl: "https://auth.mercantec.tech/oauth/token",
  };

  const SK = {
    access: "apier_access_token",
    refresh: "apier_refresh_token",
    expires: "apier_expires_at",
    profile: "apier_profile",
    apiKey: "apier_student_api_key",
    pkceVerifier: "apier_pkce_verifier",
    oauthState: "apier_oauth_state",
    returnTo: "apier_return_to",
  };

  function b64url(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function randomString(len = 64) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return b64url(arr);
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data);
  }

  async function beginLogin(returnTo) {
    const verifier = randomString(64);
    const state = randomString(32);
    const challenge = b64url(await sha256(verifier));
    sessionStorage.setItem(SK.pkceVerifier, verifier);
    sessionStorage.setItem(SK.oauthState, state);
    const dest =
      typeof returnTo === "string" && returnTo.startsWith("/")
        ? returnTo
        : `${window.location.pathname}${window.location.search}` || "/";
    sessionStorage.setItem(SK.returnTo, dest);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: AUTH.clientId,
      redirect_uri: AUTH.redirectUri(),
      scope: "openid profile email offline_access",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    window.location.href = `${AUTH.authorizeUrl}?${params}`;
  }

  async function exchangeCode(code, state) {
    const expected = sessionStorage.getItem(SK.oauthState);
    const verifier = sessionStorage.getItem(SK.pkceVerifier);
    sessionStorage.removeItem(SK.oauthState);
    sessionStorage.removeItem(SK.pkceVerifier);

    if (!expected || expected !== state) {
      throw new Error("Ugyldig OAuth state");
    }
    if (!verifier) {
      throw new Error("Mangler PKCE verifier");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: AUTH.redirectUri(),
      client_id: AUTH.clientId,
      code_verifier: verifier,
    });

    const res = await fetch(AUTH.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Token-fejl: ${res.status} ${t}`);
    }
    const json = await res.json();
    storeTokens(json);
    return json;
  }

  function storeTokens(json) {
    sessionStorage.setItem(SK.access, json.access_token);
    if (json.refresh_token) {
      sessionStorage.setItem(SK.refresh, json.refresh_token);
    }
    const expiresAt = Date.now() + (json.expires_in || 900) * 1000;
    sessionStorage.setItem(SK.expires, String(expiresAt));
    try {
      const payload = JSON.parse(atob(json.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      sessionStorage.setItem(
        SK.profile,
        JSON.stringify({
          sub: payload.sub,
          name: payload.name || payload.email || "Bruger",
          email: payload.email || "",
        })
      );
    } catch {
      sessionStorage.setItem(SK.profile, JSON.stringify({ name: "Bruger" }));
    }
  }

  function logoutLocal() {
    sessionStorage.removeItem(SK.access);
    sessionStorage.removeItem(SK.refresh);
    sessionStorage.removeItem(SK.expires);
    sessionStorage.removeItem(SK.profile);
    // API-nøglen beholder vi i session indtil brugeren sletter den eksplicit
  }

  function getProfile() {
    try {
      return JSON.parse(sessionStorage.getItem(SK.profile) || "null");
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!sessionStorage.getItem(SK.access);
  }

  function getAccessToken() {
    return sessionStorage.getItem(SK.access);
  }

  function getStoredApiKey() {
    return sessionStorage.getItem(SK.apiKey);
  }

  function setStoredApiKey(key) {
    if (key) sessionStorage.setItem(SK.apiKey, key);
    else sessionStorage.removeItem(SK.apiKey);
  }

  async function refreshIfNeeded() {
    const expires = Number(sessionStorage.getItem(SK.expires) || 0);
    if (Date.now() < expires - 30_000) return getAccessToken();

    const refresh = sessionStorage.getItem(SK.refresh);
    if (!refresh) {
      logoutLocal();
      return null;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: AUTH.clientId,
    });

    const res = await fetch(AUTH.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      logoutLocal();
      return null;
    }
    const json = await res.json();
    storeTokens(json);
    return json.access_token;
  }

  async function apiFetch(path, options = {}) {
    const token = await refreshIfNeeded();
    if (!token) throw new Error("Ikke logget ind");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      const again = await refreshIfNeeded();
      if (!again) throw new Error("Session udløbet");
      headers.set("Authorization", `Bearer ${again}`);
      res = await fetch(path, { ...options, headers });
    }
    return res;
  }

  function consumeReturnTo() {
    const dest = sessionStorage.getItem(SK.returnTo) || "/";
    sessionStorage.removeItem(SK.returnTo);
    return dest.startsWith("/") ? dest : "/";
  }

  window.ApierAuth = {
    AUTH,
    SK,
    beginLogin,
    exchangeCode,
    logoutLocal,
    getProfile,
    isLoggedIn,
    getAccessToken,
    getStoredApiKey,
    setStoredApiKey,
    refreshIfNeeded,
    apiFetch,
    consumeReturnTo,
  };
})();
