// Anonymous first-party page-view and CTA counts. No cookies, IP addresses, or form values are collected.
if(!location.pathname.endsWith('/dashboard.html')){
  const sendInsight=(event,label='')=>{
    const body=JSON.stringify({event,path:location.pathname,label});
    if(navigator.sendBeacon)navigator.sendBeacon('/api/analytics',new Blob([body],{type:'application/json'}));
    else fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  };
  sendInsight('page_view');
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    const href=link.getAttribute('href')||'';
    const label=href.includes('wa.me')?'whatsapp':href.includes('contact.html')?'contact':href.includes('services.html')?'services':href.includes('/demos/')||href.includes('campaign-demos.html')?'demo':'';
    if(label)sendInsight('click',label);
  },{capture:true});
}
