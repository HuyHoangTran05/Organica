// Render wishlist page and bind actions
(function(){
  function authHeaders(extra){
    const h = Object.assign({}, extra||{});
    try{ const at = localStorage.getItem('accessToken'); if(at) h['Authorization'] = 'Bearer ' + at; }catch(_){ }
    return h;
  }
  async function authFetch(url, options){
    const opts = Object.assign({}, options||{});
    opts.headers = authHeaders(opts.headers);
    const res = await fetch(url, opts);
    if(res.status === 401){ window.location.href = '/login.html'; throw new Error('Unauthorized'); }
    return res;
  }
  function fmt(n){ return `$${Number(n||0).toFixed(2)}`; }

  async function fetchWishlist(){
    const res = await authFetch('/api/wishlist');
    return res.json();
  }

  async function fetchCart(){
    const res = await authFetch('/api/cart');
    return res.json();
  }

  async function refreshHeaderWishlist(){
    try{
      const data = await fetchWishlist();
      const badge = document.querySelector('[data-panel-btn="whishlist"] .btn-badge');
      if(badge){ badge.textContent = String(data.items?.length||0).padStart(2,'0'); }
      const panel = document.querySelector('.aside [data-side-panel="whishlist"] .panel-list');
      if(panel){
        panel.innerHTML = (data.items||[]).map(it => `
          <li class="panel-item">
            <a href="./product-details.html" class="panel-card">
              <figure class="item-banner"><img src="${it.image}" width="46" height="46" loading="lazy" alt="${it.name}"></figure>
              <div><p class="item-title">${it.name}</p><span class="item-value">${fmt(it.price)}</span></div>
              <button class="item-close-btn" aria-label="Remove item" data-wl-remove-id="${it.productId}"><ion-icon name="close-outline"></ion-icon></button>
            </a>
          </li>`).join('');
        panel.querySelectorAll('[data-wl-remove-id]')?.forEach(btn=>{
          btn.addEventListener('click', async (ev)=>{
            ev.preventDefault();
            const id = btn.getAttribute('data-wl-remove-id');
            await authFetch(`/api/wishlist/remove/${id}`, { method: 'DELETE' });
            await render();
          });
        });
      }
    }catch(e){}
  }

  async function render(){
    const data = await fetchWishlist();
    const list = document.querySelector('.wishlist-list');
    if(!list) return;
    if(!data.items || !data.items.length){
      list.innerHTML = '<p>Your wishlist is empty.</p>';
    } else {
      list.innerHTML = (data.items||[]).map(it=>`
        <div class="wishlist-item" data-id="${it.productId}">
          <figure class="item-banner"><img src="${it.image}" width="90" height="90" loading="lazy" alt="${it.name}"></figure>
          <div class="item-meta">
            <h3 class="h4 item-title"><a href="./product-details.html">${it.name}</a></h3>
            <p class="item-price">${fmt(it.price)}</p>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary" data-act="addcart"><span class="span">Add to Cart</span></button>
            <button class="icon-btn" data-act="remove" aria-label="Remove"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
        </div>`).join('');
    }

    // bind actions
    list.querySelectorAll('.wishlist-item').forEach(row=>{
      const id = row.getAttribute('data-id');
      row.querySelector('[data-act="addcart"]').addEventListener('click', async ()=>{
        await authFetch('/api/cart/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productId:id, quantity: 1 }) });
        await refreshHeaderCart();
      });
      row.querySelector('[data-act="remove"]').addEventListener('click', async ()=>{
        await authFetch(`/api/wishlist/remove/${id}`, { method:'DELETE' });
        await render();
      });
    });

    refreshHeaderWishlist();
  }

  async function refreshHeaderCart(){
    try{
      const data = await fetchCart();
      const badge = document.querySelector('[data-panel-btn="cart"] .btn-badge');
      if(badge){ badge.textContent = String(data.items?.length||0).padStart(2,'0'); }
      const panel = document.querySelector('.aside [data-side-panel="cart"] .panel-list');
      if(panel){
        panel.innerHTML = (data.items||[]).map(it => `
          <li class="panel-item">
            <a href="./product-details.html" class="panel-card">
              <figure class="item-banner"><img src="${it.image}" width="46" height="46" loading="lazy" alt="${it.name}"></figure>
              <div><p class="item-title">${it.name}</p><span class="item-value">${fmt(it.price)}x${it.quantity}</span></div>
              <button class="item-close-btn" aria-label="Remove item" data-remove-id="${it.productId}"><ion-icon name="close-outline"></ion-icon></button>
            </a>
          </li>`).join('');
        panel.querySelectorAll('[data-remove-id]')?.forEach(btn=>{
          btn.addEventListener('click', async (ev)=>{
            ev.preventDefault();
            const id = btn.getAttribute('data-remove-id');
            await authFetch(`/api/cart/remove/${id}`, { method: 'DELETE' });
            await refreshHeaderCart();
          });
        });
      }
      const subEl = document.querySelector('.aside [data-side-panel="cart"] .subtotal .subtotal-value');
      if(subEl){
        const cart = await fetchCart();
        subEl.textContent = fmt(cart.total||0);
      }
    }catch(e){}
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }
})();