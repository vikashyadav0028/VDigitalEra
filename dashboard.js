const loginCard=document.querySelector('#loginCard');
const dashboardView=document.querySelector('#dashboardView');
const loginForm=document.querySelector('#loginForm');
const loginStatus=document.querySelector('#loginStatus');
const dashboardStatus=document.querySelector('#dashboardStatus');
const number=value=>Number(value||0).toLocaleString('en-IN');
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateLabel=value=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(value));

async function loadDashboard(){
  const response=await fetch('/api/admin/overview',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){dashboardView.classList.add('hidden');loginCard.classList.remove('hidden');return false}
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Could not load dashboard.');
  loginCard.classList.add('hidden');dashboardView.classList.remove('hidden');
  document.querySelector('#visitMetric').textContent=number(data.summary.visits_30d);
  document.querySelector('#clickMetric').textContent=number(data.summary.clicks_30d);
  document.querySelector('#enquiryMetric').textContent=number(data.summary.enquiries_30d);
  document.querySelector('#allEnquiries').textContent=`${number(data.summary.enquiries_all)} all time`;
  drawActivity(data.daily||[]);drawClicks(data.clicks||[]);drawEnquiries(data.enquiries||[]);
  return true;
}

function drawActivity(rows){
  const chart=document.querySelector('#activityChart');
  const byDate=new Map(rows.map(row=>[row.day instanceof Date?row.day.toISOString().slice(0,10):String(row.day).slice(0,10),row]));
  const today=new Date();const days=[];
  for(let offset=13;offset>=0;offset--){const date=new Date(today);date.setDate(today.getDate()-offset);const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');days.push({key,date,row:byDate.get(key)||{visits:0,clicks:0}})}
  const max=Math.max(1,...days.flatMap(day=>[Number(day.row.visits),Number(day.row.clicks)]));
  chart.innerHTML=days.map(day=>`<div class="day-column" title="${day.date.toLocaleDateString('en-IN')}: ${number(day.row.visits)} visits, ${number(day.row.clicks)} clicks"><div class="bars"><i class="bar" style="height:${Math.max(2,Number(day.row.visits)/max*100)}%"></i><i class="bar click" style="height:${Math.max(2,Number(day.row.clicks)/max*100)}%"></i></div><span class="day-label">${day.date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>`).join('');
}

function drawClicks(rows){
  const box=document.querySelector('#clickBreakdown');
  const labels=['whatsapp','contact','services','demo'];
  const counts=new Map(rows.map(row=>[row.label,Number(row.total)]));
  const max=Math.max(1,...labels.map(label=>counts.get(label)||0));
  box.innerHTML=labels.map(label=>{const count=counts.get(label)||0;return `<div class="click-row"><span class="click-name">${label}</span><div class="click-track"><div class="click-fill" style="width:${count/max*100}%"></div></div><span class="click-total">${number(count)}</span></div>`}).join('');
}

function drawEnquiries(rows){
  const box=document.querySelector('#enquiryList');
  document.querySelector('#inboxCount').textContent=`${number(rows.length)}${rows.length===100?'+':''} enquiries`;
  if(!rows.length){box.innerHTML='<div class="empty-state">No enquiries yet. New submissions from your contact form will appear here.</div>';return}
  box.innerHTML=rows.map(lead=>`<details class="enquiry"><summary><span><span class="lead-name">${safe(lead.name)}</span><span class="lead-meta">${safe(dateLabel(lead.created_at))}${lead.business?` · ${safe(lead.business)}`:''}</span></span><span class="lead-service">${safe(lead.service)}</span></summary><div class="lead-detail"><p><strong>Email:</strong> <a href="mailto:${safe(lead.email)}">${safe(lead.email)}</a></p>${lead.phone?`<p><strong>Phone:</strong> <a href="tel:${safe(lead.phone)}">${safe(lead.phone)}</a></p>`:''}${lead.budget?`<p><strong>Budget:</strong> ${safe(lead.budget)}</p>`:''}<p><strong>Message:</strong><br>${safe(lead.message).replace(/\n/g,'<br>')}</p></div></details>`).join('');
}

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=loginForm.querySelector('button');button.disabled=true;loginStatus.classList.remove('error');loginStatus.textContent='Signing in…';
  try{const response=await fetch('/api/admin/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:new FormData(loginForm).get('password')})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Sign in failed.');loginForm.reset();await loadDashboard()}
  catch(error){loginStatus.textContent=error.message;loginStatus.classList.add('error')}
  finally{button.disabled=false}
});

document.querySelector('#logoutButton').addEventListener('click',async()=>{
  await fetch('/api/admin/session',{method:'DELETE',credentials:'same-origin'});dashboardView.classList.add('hidden');loginCard.classList.remove('hidden');loginStatus.textContent='You have signed out.';
});

loadDashboard().catch(error=>{dashboardStatus.textContent=error.message;dashboardStatus.classList.remove('hidden');});
