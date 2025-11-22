(function(){
  var to = '/index.html';
  function parseMeta(){
    try{
      var m = document.querySelector('meta[name="oauth"]');
      if(!m) return null;
      var txt = m.getAttribute('content')||'';
      if(!txt) return null;
      var json = atob(txt);
      return JSON.parse(json);
    }catch(_){ return null; }
  }

  try{
    var o = window.__oauth || parseMeta() || {};
    if(o.accessToken) localStorage.setItem('accessToken', o.accessToken);
    if(o.refreshToken) localStorage.setItem('refreshToken', o.refreshToken);
    if(o.redirectTo && typeof o.redirectTo === 'string') to = o.redirectTo;
  }catch(e){ /* ignore */ }
  try{ delete window.__oauth; }catch(_){ try{ window.__oauth = undefined; }catch(__){} }
  setTimeout(function(){ location.replace(to); }, 250);
})();
