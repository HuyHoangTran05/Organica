// Dynamic cart page renderer
(function(){
  async function fetchCart(){
    const res = await fetch('/api/cart');
    return res.json();
  }

  function fmt(n){ return `$${Number(n||0).toFixed(2)}`; }

  async function render(){
    const data = await fetchCart();
    const list = document.querySelector('.cart-list');
    if(!list) return;
    list.innerHTML = (data.items||[]).map(it => `
      <li class="cart-item" data-id="${it.productId}">
        <figure class="item-banner"><img src="${it.image}" width="90" height="90" alt="${it.name}"></figure>
        <div class="item-info">
          <h4 class="h4 item-title"><a href="./product-details.html">${it.name}</a></h4>
          <p class="item-price">${fmt(it.price)}</p>
        </div>
        <div class="qty">
          <button class="qty-btn" data-act="dec">-</button>
          <input class="qty-input" type="number" min="1" value="${it.quantity}">
          <button class="qty-btn" data-act="inc">+</button>
        </div>
        <div class="item-total">${fmt(it.lineTotal)}</div>
        <button class="remove-btn" aria-label="Remove"><ion-icon name="trash-outline"></ion-icon></button>
      </li>`).join('');
    const sub = document.querySelector('.cart-summary .summary-value');
    if(sub){ sub.textContent = fmt(data.total||0); }

    // bind qty
    list.querySelectorAll('.cart-item').forEach(row => {
      const id = row.getAttribute('data-id');
      const input = row.querySelector('.qty-input');
      const dec = row.querySelector('[data-act="dec"]');
      const inc = row.querySelector('[data-act="inc"]');
      const remove = row.querySelector('.remove-btn');
      const send = async (qty)=>{
        await fetch('/api/cart/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productId: id, quantity: qty}) });
        render();
      };
      inc.addEventListener('click', ()=> send((parseInt(input.value,10)||1)+1));
      dec.addEventListener('click', ()=> send((parseInt(input.value,10)||1)-1));
      input.addEventListener('change', ()=> send(parseInt(input.value,10)||1));
      remove.addEventListener('click', async ()=>{ await fetch(`/api/cart/remove/${id}`, { method:'DELETE' }); render(); });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }
})();
