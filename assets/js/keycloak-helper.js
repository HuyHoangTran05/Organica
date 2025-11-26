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
    if(originalLogin){
      // Instead of hiding completely (mất icon), turn it into a small profile badge
      originalLogin.style.display = 'flex';
      originalLogin.style.alignItems = 'center';
      originalLogin.style.justifyContent = 'center';
      originalLogin.style.minWidth = '40px';
      originalLogin.style.fontSize = '12px';
      originalLogin.style.fontWeight = '600';
      originalLogin.style.background = 'var(--emerald,#2ecc71)';
      originalLogin.style.color = '#fff';
      originalLogin.style.borderRadius = '50%';
      originalLogin.setAttribute('title', displayName);
      // Show first letter fallback if ionicon fails or for clarity
      const initial = (displayName||'U').charAt(0).toUpperCase();
      // If it still contains an ion-icon child, leave it; else inject initial.
      if(!originalLogin.querySelector('ion-icon')){
        originalLogin.textContent = initial;
      } else {
        // Keep icon but add visually hidden initial for a11y
        const span = document.createElement('span');
        span.textContent = initial;
        span.style.position='absolute';
        span.style.opacity='0';
        originalLogin.appendChild(span);
      }
    }
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
    // Giữ nguyên layout gốc: không chèn nhiều nút, chỉ để link login hiện có hoạt động.
    const originalLogin = loginAnchor();
    if(originalLogin){
      // Giữ icon đăng nhập gốc khi chưa đăng nhập
      originalLogin.href = 'login.html';
      originalLogin.style.display = 'flex';
    }
    // Không tạo widget mới nếu chưa đăng nhập để tránh phá bố cục.
  }

  async function fetchMeWithBearer(){
    const at = localStorage.getItem('accessToken');
    if(!at) return null;
    try{
      let r = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + at } });
      if(r.ok) return await r.json();
      if(r.status === 401){
        const rt = localStorage.getItem('refreshToken');
        if(rt){
          try{
            const rr = await fetch('/api/auth/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refreshToken: rt }) });
            if(rr.ok){ const j = await rr.json(); if(j.accessToken){ localStorage.setItem('accessToken', j.accessToken); if(j.refreshToken) localStorage.setItem('refreshToken', j.refreshToken); r = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + j.accessToken } }); if(r.ok) return await r.json(); }
            }
          }catch(_e){}
        }
      }
    }catch(_e){}
    return null;
  }

  async function init(){
    // Prefer JWT (Google/local) first so we don't show 401 in console before success
    const uJwt = await fetchMeWithBearer();
    if(uJwt){ renderLoggedIn(uJwt); return; }
    // Fallback to Keycloak cookie session
    try{
      const r = await fetch('/api/me', { credentials: 'include' });
      if(r.ok){ const u = await r.json(); renderLoggedIn(u); return; }
    }catch(_e){}
    renderLoggedOut();
  }

  init();
  // Auto update when tokens are added/removed in another tab
  window.addEventListener('storage', (e)=>{ if(e.key==='accessToken' || e.key==='refreshToken'){ init(); } });
})();
