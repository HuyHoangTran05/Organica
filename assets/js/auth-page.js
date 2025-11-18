'use strict';

const apiBase = '';

function setStatus(msg, isError=false){
  const el = document.querySelector('#auth-status');
  if(!el) return; el.textContent = msg||''; el.className = 'auth-status' + (isError ? ' auth-error' : '');
}

function saveTokens({ accessToken, refreshToken }){
  try{ localStorage.setItem('accessToken', accessToken||''); localStorage.setItem('refreshToken', refreshToken||''); }catch(_){}
}

async function postJson(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body||{}) });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||('HTTP '+res.status));
  return data;
}

async function handleSignup(e){
  e.preventDefault();
  setStatus('Đang tạo tài khoản...');
  const name = document.querySelector('#name').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const role = (document.querySelector('input[name=role]:checked')||{}).value || 'user';
  const adminCode = document.querySelector('#adminCode') ? document.querySelector('#adminCode').value : '';
  try{
    const r = await postJson(apiBase + '/api/auth/signup', { name, email, password, role, adminCode });
    saveTokens(r);
    setStatus('Tạo tài khoản thành công! Chuyển về trang chủ...');
    setTimeout(()=>{ window.location.href = 'index.html'; }, 800);
  }catch(err){ setStatus(err.message, true); }
}

async function handleLogin(e){
  e.preventDefault();
  setStatus('Đang đăng nhập...');
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  try{
    const r = await postJson(apiBase + '/api/auth/login', { email, password });
    saveTokens(r);
    setStatus('Đăng nhập thành công! Chuyển về trang chủ...');
    setTimeout(()=>{ window.location.href = 'index.html'; }, 800);
  }catch(err){ setStatus(err.message, true); }
}

function bindTabs(){
  const signupTab = document.querySelector('#tab-signup');
  const loginTab = document.querySelector('#tab-login');
  const nameRow = document.querySelector('#row-name');
  const roleRow = document.querySelector('#row-role');
  const adminRow = document.querySelector('#row-admin-code');
  function activate(tab){
    if(tab === 'signup'){
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      if(nameRow) nameRow.style.display = '';
      if(roleRow) roleRow.style.display = '';
      if(adminRow) adminRow.style.display = 'none';
      const radios = document.querySelectorAll('input[name=role]');
      radios.forEach(r=> r.addEventListener('change', ()=>{
        const val = (document.querySelector('input[name=role]:checked')||{}).value;
        if(adminRow) adminRow.style.display = (val==='admin') ? '' : 'none';
      }));
      document.querySelector('#auth-form').onsubmit = handleSignup;
    } else {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      if(nameRow) nameRow.style.display = 'none';
      if(roleRow) roleRow.style.display = 'none';
      if(adminRow) adminRow.style.display = 'none';
      document.querySelector('#auth-form').onsubmit = handleLogin;
    }
    setStatus('');
  }
  signupTab.addEventListener('click', ()=>activate('signup'));
  loginTab.addEventListener('click', ()=>activate('login'));
  // default is login
  activate('login');
}

window.addEventListener('DOMContentLoaded', bindTabs);
