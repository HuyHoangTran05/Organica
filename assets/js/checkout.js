// Checkout form submit to create order
(function(){
  function fmt(n){ return `$${Number(n||0).toFixed(2)}`; }

  async function fetchCart(){
    const res = await fetch('/api/cart');
    return res.json();
  }

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
            await renderSummary();
          });
        });
      }
      const subEl = document.querySelector('.aside [data-side-panel="cart"] .subtotal .subtotal-value');
      if(subEl){ subEl.textContent = fmt(data.total||0); }
    }catch(e){ /* ignore */ }
  }

  async function renderSummary(){
    const data = await fetchCart();
    const list = document.querySelector('.order-summary .sum-list');
    if(!list) return;
    list.innerHTML = `
      ${ (data.items||[]).map(it => `
        <li data-id="${it.productId}">
          <span>${it.name} x <strong>${it.quantity}</strong></span>
          <span>
            <button class="qty" data-act="dec" aria-label="Decrease">-</button>
            <button class="qty" data-act="inc" aria-label="Increase">+</button>
            <button class="qty remove" data-act="rm" aria-label="Remove">×</button>
            ${fmt(it.price*it.quantity)}
          </span>
        </li>
      `).join('')}
      <li><span>Shipping</span><span>${fmt(data.shipping||0)}</span></li>
      <li><strong>Total</strong><strong>${fmt(data.total||0)}</strong></li>`;

    // bind qty and remove
    list.querySelectorAll('li[data-id]')?.forEach(row =>{
      const id = row.getAttribute('data-id');
      row.querySelector('[data-act="inc"]').addEventListener('click', async ()=>{
        const item = (data.items||[]).find(x=>String(x.productId)===String(id));
        const next = (item?.quantity||1)+1;
        await fetch('/api/cart/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productId:id, quantity: next}) });
        await renderSummary();
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', async ()=>{
        const item = (data.items||[]).find(x=>String(x.productId)===String(id));
        const next = Math.max(1, (item?.quantity||1)-1);
        await fetch('/api/cart/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productId:id, quantity: next}) });
        await renderSummary();
      });
      row.querySelector('[data-act="rm"]').addEventListener('click', async ()=>{
        await fetch(`/api/cart/remove/${id}`, { method:'DELETE' });
        await renderSummary();
      });
    });

    refreshHeader();
  }

  async function placeOrder(){
    const form = document.querySelector('.checkout-form');
    if(!form){ return; }
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      firstName: data['First name']||data['firstName']||'',
      lastName: data['Last name']||data['lastName']||'',
      email: data['Email']||data['email']||'',
      phone: data['Phone']||data['phone']||'',
      address: data['Address']||data['address']||'',
      city: data['City']||data['city']||'',
      zip: data['Zip']||data['zip']||''
    };
    try{
      const res = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok){ throw new Error(json.error||'Order failed'); }
      alert(`Đặt hàng thành công! Mã đơn: ${json.orderNumber}`);
      window.location.href = '/index.html';
    }catch(e){ alert('Không thể đặt hàng: '+ e.message); }
  }

  function init(){
    // Render order summary and bind controls
    renderSummary();
    // Bind place order button (since the button is not inside the form)
    const btn = document.querySelector('.order-summary .btn.btn-primary');
    if(btn){ btn.addEventListener('click', (e)=>{ e.preventDefault(); placeOrder(); }); }
    // Also allow form submit with Enter key
    const form = document.querySelector('.checkout-form');
    if(form){ form.addEventListener('submit', (e)=>{ e.preventDefault(); placeOrder(); }); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
