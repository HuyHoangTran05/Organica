// Simple helper to integrate with Keycloak session-authenticated backend.
// 1. Tries /api/me to see if user logged in (session cookie with Keycloak).
// 2. If not logged in: rewrites login icon link to Keycloak authorization endpoint.
// 3. If logged in: replaces icon with username + logout link (session invalidation relies on Keycloak admin UI).
(function(){
  const realm = (window.KEYCLOAK_REALM || 'organica');
  const baseUrl = (window.KEYCLOAK_BASE_URL || (window.location.protocol + '//' + window.location.hostname + ':8080/'));
  const clientId = (window.KEYCLOAK_CLIENT_ID || 'organica-backend');

  function qs(sel){ return document.querySelector(sel); }
  function headerContainer(){ return qs('.header-action'); }
  function loginAnchor(){ return qs('.header-action a.header-action-btn[href*="login.html"]'); }

  function ensureWidgetContainer(){
    const parent = headerContainer();
    if(!parent) return null;
    let box = qs('.auth-widget');
    if(!box){
      box = document.createElement('div');
      box.className = 'auth-widget';
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      box.style.gap = '6px';
      parent.insertBefore(box, parent.firstChild); // keep original icons
    }
    return box;
  }

  function renderLoggedIn(user){
    const box = ensureWidgetContainer();
    if(!box) return;
    const displayName = (user.name || user.email || 'User');
    box.innerHTML = ''+
      '<div class="auth-user" style="background:var(--emerald,#2ecc71);color:#fff;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;font-size:12px;font-weight:600;">'
        + '<span style="margin-right:10px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+ displayName +'</span>'
        + '<button type="button" class="auth-btn auth-account" style="background:#1abc9c;border:0;color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;cursor:pointer;margin-right:6px;">Account</button>'
        + '<button type="button" class="auth-btn auth-logout" style="background:#e74c3c;border:0;color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;cursor:pointer;">Logout</button>'
      + '</div>';
    const originalLogin = loginAnchor();
    if(originalLogin){ originalLogin.style.display = 'none'; }
    const accountBtn = box.querySelector('.auth-account');
    const logoutBtn = box.querySelector('.auth-logout');
    // Prefer Keycloak account page if session cookie exists
    accountBtn.addEventListener('click', async () => {
      try{
        const r = await fetch('/api/me', { credentials: 'include' });
        if(r.ok){
          window.location.href = baseUrl.replace(/\/$/, '') + '/realms/' + realm + '/account';
          return;
        }
      }catch(_e){}
      // JWT local account: no dedicated account page
      alert('Logged in with local account. Account page not available.');
    });
    logoutBtn.addEventListener('click', async () => {
      // If Keycloak session cookie exists, use Keycloak logout
      try{
        const r = await fetch('/api/me', { credentials: 'include' });
        if(r.ok){
          window.location.href = '/api/auth/logout-keycloak?redirect=' + encodeURIComponent(window.location.origin + '/');
          return;
        }
      }catch(_e){}
      // Otherwise use JWT logout
      const rt = localStorage.getItem('refreshToken');
      try{ await fetch('/api/auth/logout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refreshToken: rt }) }); }catch(_e){}
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.replace('/');
    });
  }

  function renderLoggedOut(){
    const box = ensureWidgetContainer();
    if(!box) return;
    box.innerHTML = ''+
      '<div class="auth-actions" style="display:flex;gap:6px;">'
        + '<button type="button" class="auth-btn auth-login" style="background:#2ecc71;border:0;color:#fff;font-size:12px;padding:5px 12px;border-radius:18px;cursor:pointer;">Login</button>'
        + '<button type="button" class="auth-btn auth-signup" style="background:#3498db;border:0;color:#fff;font-size:12px;padding:5px 12px;border-radius:18px;cursor:pointer;">Sign Up</button>'
      + '</div>';
    const originalLogin = loginAnchor();
    if(originalLogin){ originalLogin.style.display = 'none'; }
    box.querySelector('.auth-login').addEventListener('click', () => {
      window.location.href = '/api/auth/keycloak-login';
    });
    box.querySelector('.auth-signup').addEventListener('click', () => {
      window.location.href = '/signup.html';
    });
  }

  async function init(){
    // 1) Try Keycloak cookie session
    try{
      const r = await fetch('/api/me', { credentials: 'include' });
      if(r.ok){ const u = await r.json(); renderLoggedIn(u); return; }
    }catch(_e){}
    // 2) Try JWT from localStorage
    const at = localStorage.getItem('accessToken');
    if(at){
      try{
        const r2 = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + at } });
        if(r2.ok){ const u2 = await r2.json(); renderLoggedIn(u2); return; }
      }catch(_e){}
    }
    // 3) Logged out
    renderLoggedOut();
  }

  init();
})();
