// Fetch products from API and render into homepage sections
(function(){
  function authHeaders(extra){
    const h = Object.assign({}, extra||{});
    try{
      const at = localStorage.getItem('accessToken');
      if(at) h['Authorization'] = 'Bearer ' + at;
    }catch(_){ }
    return h;
  }
  async function authFetch(url, options){
    const opts = Object.assign({}, options||{});
    opts.headers = authHeaders(opts.headers);
    const res = await fetch(url, opts);
    if(res.status === 401){ window.location.href = '/login.html'; throw new Error('Unauthorized'); }
    return res;
  }
  const PRODUCTS_API = '/api/products';
  const TOP_API = '/api/top-products';

  function fmtPrice(n){ try { return `$${Number(n).toFixed(2)}`; } catch { return '$0.00'; } }

  function createProductCard(p){
    const del = p.compareAt ? `<del class="del">${fmtPrice(p.compareAt)}</del>` : '';
    return `
      <li>
        <div class="product-card">
          <figure class="card-banner">
            <img src="${p.image}" width="189" height="189" loading="lazy" alt="${p.name}">
            <div class="btn-wrapper">
              <button class="product-btn btn-add-to-wishlist" aria-label="Add to Whishlist" data-product-id="${p.id}">
                <ion-icon name="heart-outline"></ion-icon>
                <div class="tooltip">Add to Whishlist</div>
              </button>
              <button class="product-btn" aria-label="Quick View">
                <ion-icon name="eye-outline"></ion-icon>
                <div class="tooltip">Quick View</div>
              </button>
            </div>
          </figure>
          <div class="rating-wrapper">
            <ion-icon name="star"></ion-icon>
            <ion-icon name="star"></ion-icon>
            <ion-icon name="star"></ion-icon>
            <ion-icon name="star"></ion-icon>
            <ion-icon name="star"></ion-icon>
          </div>
          <h3 class="h4 card-title"><a href="./product-details.html">${p.name}</a></h3>
          <div class="price-wrapper">${del}<data class="price" value="${p.price}">${fmtPrice(p.price)}</data></div>
          <button class="btn btn-primary btn-add-to-cart" data-product-id="${p.id}">Add to Cart</button>
        </div>
      </li>`;
  }

  function createTopCard(p){
    const del = p.compareAt ? `<del class="del">${fmtPrice(p.compareAt)}</del>` : '';
    return `
      <li class="top-product-item">
        <div class="product-card top-product-card">
          <figure class="card-banner">
            <img src="${p.image}" width="100" height="100" loading="lazy" alt="${p.name}">
            <div class="btn-wrapper">
              <button class="product-btn btn-add-to-wishlist" aria-label="Add to Whishlist" data-product-id="${p.id}">
                <ion-icon name="heart-outline"></ion-icon>
                <div class="tooltip">Add to Whishlist</div>
              </button>
              <button class="product-btn" aria-label="Quick View">
                <ion-icon name="eye-outline"></ion-icon>
                <div class="tooltip">Quick View</div>
              </button>
            </div>
          </figure>
          <div class="card-content">
            <div class="rating-wrapper">
              <ion-icon name="star"></ion-icon>
              <ion-icon name="star"></ion-icon>
              <ion-icon name="star"></ion-icon>
              <ion-icon name="star"></ion-icon>
              <ion-icon name="star"></ion-icon>
            </div>
            <h3 class="h4 card-title"><a href="./product-details.html">${p.name}</a></h3>
            <div class="price-wrapper">${del}<data class="price" value="${p.price}">${fmtPrice(p.price)}</data></div>
            <button class="btn btn-primary btn-add-to-cart" data-product-id="${p.id}">Add to Cart</button>
          </div>
        </div>
      </li>`;
  }

  async function refreshHeaderCart(){
    try{
      const res = await authFetch('/api/cart');
      const data = await res.json();
      const badge = document.querySelector('[data-panel-btn="cart"] .btn-badge');
      if(badge){ badge.textContent = String(data.items?.length||0).padStart(2,'0'); }
      const panel = document.querySelector('.aside [data-side-panel="cart"] .panel-list');
      if(panel){
        panel.innerHTML = (data.items||[]).map(it => `
          <li class="panel-item">
            <a href="./product-details.html" class="panel-card">
              <figure class="item-banner"><img src="${it.image}" width="46" height="46" loading="lazy" alt="${it.name}"></figure>
              <div><p class="item-title">${it.name}</p><span class="item-value">${fmtPrice(it.price)}x${it.quantity}</span></div>
              <button class="item-close-btn" aria-label="Remove item" data-remove-id="${it.productId}"><ion-icon name="close-outline"></ion-icon></button>
            </a>
          </li>`).join('');
        // bind remove
        panel.querySelectorAll('[data-remove-id]')?.forEach(btn=>{
          btn.addEventListener('click', async (ev)=>{
            ev.preventDefault();
            const id = btn.getAttribute('data-remove-id');
            await authFetch(`/api/cart/remove/${id}`, { method: 'DELETE' });
            refreshHeaderCart();
          });
        });
      }
      const subEl = document.querySelector('.aside [data-side-panel="cart"] .subtotal .subtotal-value');
      if(subEl){ subEl.textContent = fmtPrice(data.total||0); }
    }catch(e){ console.error('cart refresh failed', e); }
  }

  async function refreshHeaderWishlist(){
    try{
      const res = await authFetch('/api/wishlist');
      const data = await res.json();
      const badge = document.querySelector('[data-panel-btn="whishlist"] .btn-badge');
      if(badge){ badge.textContent = String(data.items?.length||0).padStart(2,'0'); }
      const panel = document.querySelector('.aside [data-side-panel="whishlist"] .panel-list');
      if(panel){
        panel.innerHTML = (data.items||[]).map(it => `
          <li class="panel-item">
            <a href="./product-details.html" class="panel-card">
              <figure class="item-banner"><img src="${it.image}" width="46" height="46" loading="lazy" alt="${it.name}"></figure>
              <div><p class="item-title">${it.name}</p><span class="item-value">${fmtPrice(it.price)}</span></div>
              <button class="item-close-btn" aria-label="Remove item" data-wl-remove-id="${it.productId}"><ion-icon name="close-outline"></ion-icon></button>
            </a>
          </li>`).join('');
        panel.querySelectorAll('[data-wl-remove-id]')?.forEach(btn=>{
          btn.addEventListener('click', async (ev)=>{
            ev.preventDefault();
            const id = btn.getAttribute('data-wl-remove-id');
            await authFetch(`/api/wishlist/remove/${id}`, { method: 'DELETE' });
            refreshHeaderWishlist();
          });
        });
      }
    }catch(e){ console.error('wishlist refresh failed', e); }
  }

  async function fetchAndRender(category){
    const url = new URL(PRODUCTS_API, window.location.origin);
    if(category){ url.searchParams.set('category', category); }
    url.searchParams.set('limit', '24');
    const prodRes = await fetch(url);
    const products = await prodRes.json();
    const grid = document.querySelector('.section.product .grid-list');
    if(grid && Array.isArray(products)){
      grid.innerHTML = products.map(createProductCard).join('');
    }
  }

  async function load(){
    try{
      // initial: use active filter button if present
      const activeBtn = document.querySelector('.filter-list .filter-btn.active');
      const txtToSlug = (t)=>{
        const key = (t||'').trim().toLowerCase();
        if(key.includes('fresh vegetables')) return 'fresh-vegetables';
        if(key.includes('fish') || key.includes('meat')) return 'fish-meat';
        if(key.includes('healthy') || key.includes('fruit')) return 'healthy-fruit';
        if(key.includes('dairy')) return 'dairy-products';
        return '';
      };
      const activeSlug = activeBtn ? txtToSlug(activeBtn.querySelector('.filter-text')?.textContent||'') : '';

      // parallel fetch: products (with category) + top products
      const [_, topRes] = await Promise.all([
        fetchAndRender(activeSlug), fetch(TOP_API)
      ]);
      const top = await topRes.json();
      const topList = document.querySelector('.section.top-product .top-product-list');
      if(topList && Array.isArray(top)){
        topList.innerHTML = top.map(createTopCard).join('');
      }

      // bind add-to-cart on both lists
      const bindCartButtons = () => {
        document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-product-id');
            await authFetch('/api/cart/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productId: id, quantity: 1 }) });
            refreshHeaderCart();
          });
        });
      };
      bindCartButtons();

      // bind add-to-wishlist
      const bindWishlistButtons = () => {
        document.querySelectorAll('.btn-add-to-wishlist').forEach(btn => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-product-id');
            await authFetch('/api/wishlist/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productId: id }) });
            refreshHeaderWishlist();
          });
        });
      };
      bindWishlistButtons();

      // wire filter buttons
      const btns = Array.from(document.querySelectorAll('.filter-list .filter-btn'));
      btns.forEach(btn => {
        btn.addEventListener('click', async () => {
          btns.forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const label = btn.querySelector('.filter-text')?.textContent || '';
          const slug = txtToSlug(label);
          await fetchAndRender(slug);
          const topRes2 = await fetch(TOP_API); // keep trendy list refreshed if needed
          const top2 = await topRes2.json();
          const topList2 = document.querySelector('.section.top-product .top-product-list');
          if(topList2 && Array.isArray(top2)){
            topList2.innerHTML = top2.map(createTopCard).join('');
          }
      bindCartButtons();
      bindWishlistButtons();
        });
      });

      // initial refresh cart & wishlist
      refreshHeaderCart();
      refreshHeaderWishlist();
    }catch(err){ console.error('Failed to load products', err); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', load);
  } else { load(); }
})();
