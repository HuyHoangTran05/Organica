(function(){
  // helper fetch: uses localStorage accessToken if present, else cookie
  async function api(url, opts){
    opts = opts || {};
    opts.headers = opts.headers || {};
    const at = localStorage.getItem('accessToken');
    if(at) opts.headers['Authorization'] = 'Bearer ' + at;
    if(!opts.headers['Content-Type'] && opts.body && typeof opts.body === 'object'){
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(url, opts);
  }

  function $(sel){ return document.querySelector(sel); }
  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function makeCell(text){ const td = document.createElement('td'); td.textContent = text==null? '' : String(text); return td; }
  function makeImageCell(url){
    const td = document.createElement('td');
    if(url){
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.objectFit = 'cover';
      img.loading = 'lazy';
      td.appendChild(img);
    }
    return td;
  }
  function makeBtn(label, cls, action, id){
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.setAttribute('data-action', action);
    b.setAttribute('data-id', id);
    return b;
  }

  // Tabs
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.getAttribute('data-tab');
    const panel = document.getElementById('tab-'+id);
    if(panel) panel.classList.add('active');
  }));

  async function ensureAdmin(){
    try{
      const at = localStorage.getItem('accessToken');
      let r = await api('/api/me', at ? { headers: { 'Authorization':'Bearer '+at } } : {});
      if(r.status === 401){ window.location.href = '/login.html'; return null; }
      const u = await r.json();
      if(!(u.roles||[]).includes('admin')){ $('#admin-status').textContent = '403 - Bạn không có quyền admin'; return null; }
      $('#admin-status').textContent = 'Xin chào ' + (u.name||u.email||'admin');
      return u;
    }catch(e){ $('#admin-status').textContent = 'Không truy cập được thông tin. Vui lòng đăng nhập lại.'; return null; }
  }

  // Products
  async function loadProducts(){
    const q = $('#search-products').value || '';
    const url = '/api/admin/products' + (q? ('?q=' + encodeURIComponent(q)) : '');
    const r = await api(url);
    if(!r.ok){ return; }
    const data = await r.json();
    const tbody = $('#table-products tbody');
    tbody.innerHTML = '';
    (data.items||[]).forEach(p => {
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(p.name||''));
      tr.appendChild(makeCell(p.slug||''));
      tr.appendChild(makeCell(p.categorySlug||''));
      tr.appendChild(makeCell(Number(p.price||0).toFixed(2)));
      tr.appendChild(makeCell(p.compareAt!=null ? Number(p.compareAt).toFixed(2) : ''));
      tr.appendChild(makeCell(p.status||''));
      tr.appendChild(makeImageCell(p.image||''));
      const actions = document.createElement('td');
      actions.appendChild(makeBtn('Edit','btn-secondary','edit',p._id));
      const gap = document.createTextNode(' ');
      actions.appendChild(gap);
      actions.appendChild(makeBtn('Delete','btn-danger','del',p._id));
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  }

  async function createProduct(e){
    e.preventDefault();
    const f = e.target;
    const body = {
      name: f.name.value.trim(),
      slug: f.slug.value.trim(),
      price: Number(f.price.value||0),
      compareAt: f.compareAt.value ? Number(f.compareAt.value) : undefined,
      image: f.image.value.trim(),
      categorySlug: f.categorySlug.value.trim()
    };
    $('#product-form-status').textContent = 'Saving…';
    const r = await api('/api/admin/products', { method:'POST', body });
    if(!r.ok){ $('#product-form-status').textContent = 'Create failed'; return; }
    f.reset();
    $('#product-form-status').textContent = 'Created';
    loadProducts();
  }

  $('#form-product')?.addEventListener('submit', createProduct);
  $('#btn-reload-products')?.addEventListener('click', loadProducts);
  $('#search-products')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); loadProducts(); }});
  $('#table-products')?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if(action==='del'){
      if(!confirm('Delete this product?')) return;
      const r = await api('/api/admin/products/' + id, { method: 'DELETE' });
      if(r.ok) loadProducts();
    } else if(action==='edit'){
      const price = prompt('New price?'); if(price==null) return;
      const r = await api('/api/admin/products/' + id, { method:'PATCH', body: { price: Number(price) } });
      if(r.ok) loadProducts();
    }
  });

  // Categories
  async function loadCategories(){
    const q = $('#search-categories').value || '';
    const url = '/api/admin/categories' + (q? ('?q=' + encodeURIComponent(q)) : '');
    const r = await api(url);
    if(!r.ok){ return; }
    const rows = await r.json();
    const tbody = $('#table-categories tbody');
    tbody.innerHTML='';
    rows.forEach(c => {
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(c.name||''));
      tr.appendChild(makeCell(c.slug||''));
      tr.appendChild(makeCell(c.sort_order||0));
      const actions = document.createElement('td');
      actions.appendChild(makeBtn('Edit','btn-secondary','edit',c._id));
      const gap = document.createTextNode(' ');
      actions.appendChild(gap);
      actions.appendChild(makeBtn('Delete','btn-danger','del',c._id));
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  }

  async function createCategory(e){
    e.preventDefault();
    const f = e.target;
    const body = { name: f.name.value.trim(), slug: f.slug.value.trim(), sort_order: Number(f.sort_order.value||0) };
    $('#category-form-status').textContent = 'Saving…';
    const r = await api('/api/admin/categories', { method: 'POST', body });
    if(!r.ok){ $('#category-form-status').textContent = 'Create failed'; return; }
    f.reset();
    $('#category-form-status').textContent = 'Created';
    loadCategories();
  }

  $('#form-category')?.addEventListener('submit', createCategory);
  $('#btn-reload-categories')?.addEventListener('click', loadCategories);
  $('#search-categories')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); loadCategories(); }});
  $('#table-categories')?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if(action==='del'){
      if(!confirm('Delete this category?')) return;
      const r = await api('/api/admin/categories/' + id, { method: 'DELETE' });
      if(r.ok) loadCategories();
    } else if(action==='edit'){
      const name = prompt('New name? (empty to skip)');
      const sort = prompt('New sort_order? (empty to skip)');
      const body = {};
      if(name!=null && name!=='') body.name = name;
      if(sort!=null && sort!=='') body.sort_order = Number(sort);
      if(Object.keys(body).length){
        const r = await api('/api/admin/categories/' + id, { method:'PATCH', body });
        if(r.ok) loadCategories();
      }
    }
  });

  // Users
  async function loadUsers(){
    const q = $('#search-users').value || '';
    const url = '/api/admin/users' + (q? ('?q=' + encodeURIComponent(q)) : '');
    const r = await api(url);
    if(!r.ok){ return; }
    const data = await r.json();
    const tbody = $('#table-users tbody');
    tbody.innerHTML = '';
    (data.items||[]).forEach(u => {
      const roles = (u.roles||[]).join(', ');
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(u.email||''));
      tr.appendChild(makeCell(u.name||''));
      tr.appendChild(makeCell(roles));
      const actions = document.createElement('td');
      actions.appendChild(makeBtn('Set Role','btn-secondary','role',u._id));
      const gap = document.createTextNode(' ');
      actions.appendChild(gap);
      actions.appendChild(makeBtn('Delete','btn-danger','del',u._id));
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  }

  $('#btn-reload-users')?.addEventListener('click', loadUsers);
  $('#search-users')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); loadUsers(); }});
  $('#table-users')?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if(action==='del'){
      if(!confirm('Delete this user?')) return;
      const r = await api('/api/admin/users/' + id, { method:'DELETE' });
      if(r.ok) loadUsers();
    } else if(action==='role'){
      const role = prompt('Enter roles (comma separated), e.g. admin or user');
      if(role==null) return;
      const roles = role.split(',').map(s=>s.trim()).filter(Boolean);
      const r = await api('/api/admin/users/' + id, { method:'PATCH', body: { roles } });
      if(r.ok) loadUsers();
    }
  });

  // init
  ensureAdmin().then(u => { if(!u) return; loadProducts(); loadCategories(); loadUsers(); });
})();
