// Signup page logic extracted to external file to avoid inline-script CSP issues.
(function(){
  const form = document.getElementById('signupForm');
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  const pwInput = document.getElementById('password');
  const lenSpan = document.querySelector('[data-pw-len]');
  const letterSpan = document.querySelector('[data-pw-letter]');
  const digitSpan = document.querySelector('[data-pw-digit]');

  function showError(msg){ errorBox.textContent = msg; errorBox.style.display = 'block'; }
  function hideBoxes(){ errorBox.style.display='none'; successBox.style.display='none'; }

  if(pwInput){
    pwInput.addEventListener('input', () => {
      const v = pwInput.value;
      const okLen = v.length >= 8;
      const okLetter = /[A-Za-z]/.test(v);
      const okDigit = /[0-9]/.test(v);
      if(lenSpan){ lenSpan.textContent = (okLen ? '✓' : '✗') + ' ≥8 ký tự'; lenSpan.style.color = okLen ? '#2ecc71' : '#e74c3c'; }
      if(letterSpan){ letterSpan.textContent = (okLetter ? '✓' : '✗') + ' chữ cái'; letterSpan.style.color = okLetter ? '#2ecc71' : '#e74c3c'; }
      if(digitSpan){ digitSpan.textContent = (okDigit ? '✓' : '✗') + ' số'; digitSpan.style.color = okDigit ? '#2ecc71' : '#e74c3c'; }
    });
  }

  if(form){
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideBoxes();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const confirm = form.confirm.value;
      const role = form.role.value;
      const adminCode = form.adminCode.value.trim();

      const hasLetter = /[A-Za-z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      if(password.length < 8 || !hasLetter || !hasDigit){
        return showError('Mật khẩu yếu: cần ≥8 ký tự, gồm chữ & số.');
      }
      if(password !== confirm){
        return showError('Passwords do not match');
      }
      try{
        const r = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, adminCode })
        });
        const ct = r.headers.get('content-type') || '';
        let data;
        if(ct.includes('application/json')){ data = await r.json(); }
        else { const text = await r.text(); throw new Error('Unexpected response (HTML): ' + text.slice(0,180)); }
        if(!r.ok){
          if(data && data.code === 'EMAIL_EXISTS' && role === 'admin' && adminCode){
            try{
              const p = await fetch('/api/auth/promote-admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, adminCode }) });
              const pj = await p.json().catch(()=>({}));
              if(p.ok && pj && pj.ok){
                const loginRes = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
                const loginJson = await loginRes.json().catch(()=>({}));
                if(loginRes.ok && loginJson && loginJson.accessToken){
                  localStorage.setItem('accessToken', loginJson.accessToken);
                  if(loginJson.refreshToken){ localStorage.setItem('refreshToken', loginJson.refreshToken); }
                  const toast = document.getElementById('toast');
                  if(toast){ toast.textContent = 'Promoted to admin'; toast.classList.add('show'); }
                  setTimeout(()=>{ window.location.href='/index.html'; }, 800);
                  return;
                }
              }
            }catch(_e){}
          }
          throw new Error((data && (data.error || data.code)) || 'Signup failed');
        }
        successBox.textContent='Account created. Redirecting...'; successBox.style.display='block';
        if(data.accessToken){ localStorage.setItem('accessToken', data.accessToken); }
        if(data.refreshToken){ localStorage.setItem('refreshToken', data.refreshToken); }
        const toast = document.getElementById('toast');
        if(toast){ toast.textContent = 'Account created'; toast.classList.add('show'); }
        setTimeout(()=>{ window.location.href='/index.html'; }, 1200);
      }catch(err){
        showError(err.message || 'Signup failed');
        if(/EMAIL_EXISTS|already in use/i.test(err.message) && role === 'admin' && adminCode){
          const tip = document.createElement('div');
          tip.style.marginTop = '8px'; tip.style.fontSize = '12px'; tip.style.color = '#555';
          tip.textContent = 'Email đã tồn tại. Có thể dùng Admin Code để nâng cấp qua /api/auth/promote-admin.';
          errorBox.appendChild(tip);
        }
      }
    });
  }
})();
