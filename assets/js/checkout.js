// Checkout form submit to create order
(function(){
  async function onSubmit(ev){
    ev.preventDefault();
    const form = ev.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      firstName: data['firstName']||data['First name']||data['First name']||data['First name']||data['First name'],
      lastName: data['lastName']||data['Last name']||'',
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
    const form = document.querySelector('.checkout-form');
    if(form){ form.addEventListener('submit', onSubmit); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
