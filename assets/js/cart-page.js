// Dynamic cart page renderer
(function(){
  async function fetchCart(){
    const res = await fetch('/api/cart');
    return res.json();
  }

  function fmt(n){ return `$${Number(n||0).toFixed(2)}`; }

  async function refreshHeader(){
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
            await fetch(`/api/cart/remove/${btn.getAttribute('data-remove-id')}`, { method: 'DELETE' });
            await render();
          });
        });
      }
      const subEl = document.querySelector('.aside [data-side-panel="cart"] .subtotal .subtotal-value');
      if(subEl){ subEl.textContent = fmt(data.total||0); }
    }catch(e){ /* ignore */ }
  }

  async function render(){
    const data = await fetchCart();
    const list = document.querySelector('.cart-list');
    if(!list) return;
    // Render cart rows (use divs for best compatibility with existing styles)
    list.innerHTML = (data.items||[]).map(it => `
      <div class="cart-item" data-id="${it.productId}">
        <img src="${it.image}" alt="${it.name}" width="70" height="70">
        <div class="ci-info"><p class="ci-title">${it.name}</p><p class="ci-price">${fmt(it.price)}</p></div>
        <div class="ci-qty">
          <button class="btn" aria-label="Decrease" data-act="dec">-</button>
          <input type="number" value="${it.quantity}" min="1" class="qty-input">
          <button class="btn" aria-label="Increase" data-act="inc">+</button>
        </div>
        <button class="item-close-btn" aria-label="Remove"><ion-icon name="close-outline"></ion-icon></button>
      </div>`).join('');

    // Update summary (Subtotal/Shipping/Total)
    const sumList = document.querySelector('.cart-summary .sum-list');
    if(sumList){
      const li = sumList.querySelectorAll('li');
      // Expect structure: 1: Subtotal, 2: Shipping, 3: Total
      if(li[0]){ li[0].querySelector('span:last-child').textContent = fmt(data.subtotal||0); }
      if(li[1]){ li[1].querySelector('span:last-child').textContent = fmt(data.shipping||0); }
      if(li[2]){ li[2].querySelector('strong:last-child').textContent = fmt(data.total||0); }
    }

    // bind qty controls and remove
    list.querySelectorAll('.cart-item').forEach(row => {
      const id = row.getAttribute('data-id');
      const input = row.querySelector('.qty-input');
      const dec = row.querySelector('[data-act="dec"]');
      const inc = row.querySelector('[data-act="inc"]');
      const remove = row.querySelector('.item-close-btn');
      const send = async (qty)=>{
        const q = Math.max(1, parseInt(qty,10)||1);
        input.value = q;
        await fetch('/api/cart/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productId: id, quantity: q}) });
        await render();
      };
      inc.addEventListener('click', ()=> send((parseInt(input.value,10)||1)+1));
      dec.addEventListener('click', ()=> {
        const cur = parseInt(input.value,10)||1;
        if(cur <= 1) { input.value = 1; return; }
        send(cur-1);
      });
      input.addEventListener('change', ()=> send(parseInt(input.value,10)||1));
      remove.addEventListener('click', async ()=>{ await fetch(`/api/cart/remove/${id}`, { method:'DELETE' }); await render(); });
    });

    refreshHeader();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }
})();
