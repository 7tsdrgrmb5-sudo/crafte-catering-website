import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SUPABASE_URL = 'https://ozjctdmdwoutsebkjcpn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tERnQU70mt-6imXPumOiUg_EDTYsQpH';
const SITE_BASE = location.origin + location.pathname.replace(/\/crm\.html.*$/, '');
const CRM_URL = SITE_BASE + '/crm.html';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(cents)||0)/100);
const fmtDate = value => value ? new Date(value + (String(value).length===10?'T12:00:00':'')).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtDateTime = value => value ? new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '—';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const statusBadge = status => '<span class="status-badge '+esc(status)+'">'+esc(String(status||'').replaceAll('_',' '))+'</span>';

const state = {
  session:null, staff:null,
  leads:[], quotes:[], quoteItems:[], bookings:[], payments:[], eventDetails:[],
  shoppingLists:[], shoppingItems:[], pricingRules:[], packageOptions:[],
  visitorSessions:[], visitorEvents:[]
};

function showOnly(view){
  ['authView','activationView','appView'].forEach(id => $(id).hidden = id !== view);
}
function setStatus(id,msg){ $(id).textContent = msg || ''; }

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let idleTimer = null;
let lastMoveReset = 0;
function clearIdleTimer(){ if(idleTimer){clearTimeout(idleTimer);idleTimer=null;} }
function resetIdleTimer(){
  if(!state.session) return;
  clearIdleTimer();
  idleTimer=setTimeout(async()=>{
    sessionStorage.setItem('crafte_idle_logout','1');
    clearIdleTimer();
    state.session=null; state.staff=null;
    await supabase.auth.signOut({scope:'local'});
    showOnly('authView');
    showAuthForm('signInForm');
    setStatus('authStatus','For your security, you were signed out after 5 minutes of inactivity.');
  },IDLE_TIMEOUT_MS);
}
['pointerdown','keydown','touchstart','wheel','scroll'].forEach(ev=>window.addEventListener(ev,resetIdleTimer,{passive:true}));
window.addEventListener('mousemove',()=>{
  const now=Date.now(); if(now-lastMoveReset>10000){lastMoveReset=now;resetIdleTimer();}
},{passive:true});

function showAuthForm(id){
  ['signInForm','signUpForm','forgotPasswordForm','forgotUsernamePanel','newPasswordForm'].forEach(x=>{ if($(x)) $(x).hidden=x!==id; });
  const tabs=document.querySelector('.auth-tabs');
  if(tabs) tabs.hidden=!['signInForm','signUpForm'].includes(id);
  document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',(id==='signInForm'&&x.dataset.authTab==='signin')||(id==='signUpForm'&&x.dataset.authTab==='signup')));
}

document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click',()=>{
  showAuthForm(btn.dataset.authTab==='signin'?'signInForm':'signUpForm');
  setStatus('authStatus','');
}));

$('signInForm').addEventListener('submit',async e=>{
  e.preventDefault(); setStatus('authStatus','Signing in…');
  const fd=new FormData(e.currentTarget);
  const {error}=await supabase.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
  if(error){setStatus('authStatus',error.message);return}
  await boot();
});

$('signUpForm').addEventListener('submit',async e=>{
  e.preventDefault(); setStatus('authStatus','Creating your account…');
  const fd=new FormData(e.currentTarget);
  localStorage.setItem('crafte_staff_display_name',String(fd.get('display_name')||''));
  const {data,error}=await supabase.auth.signUp({
    email:fd.get('email'),
    password:fd.get('password'),
    options:{emailRedirectTo:CRM_URL}
  });
  if(error){setStatus('authStatus',error.message);return}
  if(data.session){await boot();return}
  setStatus('authStatus','Account created. Check your email to confirm it, then return here and sign in.');
});

$('forgotPassword').addEventListener('click',()=>{
  const current=$('signInForm').querySelector('[name="email"]').value.trim();
  $('forgotPasswordForm').querySelector('[name="email"]').value=current;
  showAuthForm('forgotPasswordForm'); setStatus('authStatus','');
});
$('forgotUsername').addEventListener('click',()=>{showAuthForm('forgotUsernamePanel');setStatus('authStatus','');});
$('backToSignInFromReset').addEventListener('click',()=>{showAuthForm('signInForm');setStatus('authStatus','');});
$('backToSignInFromUsername').addEventListener('click',()=>{showAuthForm('signInForm');setStatus('authStatus','');});

$('forgotPasswordForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=String(new FormData(e.currentTarget).get('email')||'').trim();
  if(!email)return;
  setStatus('authStatus','Sending secure reset link…');
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:CRM_URL});
  setStatus('authStatus',error?error.message:'If that email belongs to a CraftE staff account, a secure password-reset link has been sent. Check Inbox, Junk, and Spam.');
});

$('newPasswordForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const password=String(fd.get('password')||'');
  const confirm=String(fd.get('confirm_password')||'');
  if(password!==confirm){setStatus('authStatus','The passwords do not match.');return}
  setStatus('authStatus','Updating password…');
  const {error}=await supabase.auth.updateUser({password});
  if(error){setStatus('authStatus',error.message);return}
  await supabase.auth.signOut({scope:'local'});
  state.session=null; state.staff=null; clearIdleTimer();
  showOnly('authView'); showAuthForm('signInForm');
  setStatus('authStatus','Password updated successfully. Sign in with your new password.');
});

$('resendConfirmation').addEventListener('click',async ()=>{
  const email=$('signInForm').querySelector('[name="email"]').value.trim();
  if(!email){setStatus('authStatus','Enter your email first, then click resend.');return}
  setStatus('authStatus','Sending a new confirmation email…');
  const {error}=await supabase.auth.resend({
    type:'signup',
    email,
    options:{emailRedirectTo:CRM_URL}
  });
  setStatus('authStatus',error?error.message:'Confirmation email sent. Check Inbox, Junk, and Spam.');
});

$('activationForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){showOnly('authView');return}
  setStatus('activationStatus','Activating owner access…');
  const res=await fetch(SUPABASE_URL+'/functions/v1/activate-crm',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+session.access_token},
    body:JSON.stringify({code:fd.get('code'),display_name:fd.get('display_name')||localStorage.getItem('crafte_staff_display_name')||''})
  });
  const result=await res.json();
  if(!res.ok){setStatus('activationStatus',result.error||'Unable to activate access.');return}
  setStatus('activationStatus','Access activated.');
  await boot();
});

$('activationLogout').addEventListener('click',()=>supabase.auth.signOut({scope:'local'}).then(()=>boot()));
$('logoutButton').addEventListener('click',()=>supabase.auth.signOut({scope:'local'}).then(()=>boot()));
$('refreshButton').addEventListener('click',loadData);

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchSection(btn.dataset.section)));
document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>switchSection(btn.dataset.go)));

$('leadFilter').addEventListener('change',renderLeads);
$('closeDrawer').addEventListener('click',closeDrawer);
$('drawerBackdrop').addEventListener('click',closeDrawer);

function switchSection(name){
  const titles={dashboard:'Business Dashboard',leads:'Leads & Quotes',bookings:'Bookings & Event Prep',analytics:'Website Activity',pricing:'Pricing Engine'};
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===name));
  document.querySelectorAll('.crm-section').forEach(x=>x.classList.remove('active'));
  $(name+'Section').classList.add('active');
  $('sectionTitle').textContent=titles[name]||'CraftE CRM';
}

async function boot(){
  const {data:{session}}=await supabase.auth.getSession();
  state.session=session;
  if(!session){clearIdleTimer();state.staff=null;showOnly('authView');showAuthForm('signInForm');return}
  resetIdleTimer();

  const {data:staff,error}=await supabase.from('staff_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
  if(error && error.code!=='PGRST116'){setStatus('authStatus',error.message);showOnly('authView');return}
  if(!staff?.active){
    $('activationForm').querySelector('[name="display_name"]').value=localStorage.getItem('crafte_staff_display_name')||'';
    showOnly('activationView');return
  }

  state.staff=staff;
  $('staffName').textContent=staff.display_name||session.user.email||'CraftE Staff';
  $('staffRole').textContent=staff.role;
  showOnly('appView');
  await loadData();
}

async function loadData(){
  setStatus('crmStatus','Refreshing CraftE data…');
  const queries=[
    supabase.from('leads').select('*').order('created_at',{ascending:false}),
    supabase.from('quotes').select('*').order('created_at',{ascending:false}),
    supabase.from('quote_items').select('*').order('sort_order'),
    supabase.from('bookings').select('*').order('created_at',{ascending:false}),
    supabase.from('payments').select('*').order('created_at',{ascending:false}),
    supabase.from('event_details').select('*'),
    supabase.from('shopping_lists').select('*').order('version',{ascending:false}),
    supabase.from('shopping_list_items').select('*').order('sort_order'),
    supabase.from('pricing_rules').select('*').eq('active',true).order('rule_code'),
    supabase.from('package_options').select('*').eq('active',true).order('sort_order'),
    supabase.from('visitor_sessions').select('*').order('last_seen_at',{ascending:false}).limit(500),
    supabase.from('visitor_events').select('*').order('created_at',{ascending:false}).limit(3000)
  ];
  const results=await Promise.all(queries);
  const error=results.find(r=>r.error)?.error;
  if(error){setStatus('crmStatus',error.message);return}

  [state.leads,state.quotes,state.quoteItems,state.bookings,state.payments,state.eventDetails,state.shoppingLists,state.shoppingItems,state.pricingRules,state.packageOptions,state.visitorSessions,state.visitorEvents]=results.map(r=>r.data||[]);
  setStatus('crmStatus','');
  renderAll();
}

function quoteForLead(id){return state.quotes.find(q=>q.lead_id===id)}
function bookingForLead(id){return state.bookings.find(b=>b.lead_id===id)}
function leadForBooking(b){return state.leads.find(l=>l.id===b.lead_id)}
function quoteForBooking(b){return state.quotes.find(q=>q.id===b.quote_id)}
function paymentForBooking(id){return state.payments.find(p=>p.booking_id===id&&p.payment_type==='retainer'&&p.status==='succeeded')}

function renderAll(){renderDashboard();renderLeads();renderBookings();renderAnalytics();renderPricing()}

function renderDashboard(){
  const realLeadIds=new Set(state.leads.filter(l=>l.source!=='demo').map(l=>l.id));
  const activeLeads=state.leads.filter(l=>l.source!=='demo'&&!['declined','completed','lost'].includes(l.status)).length;
  const awaiting=state.quotes.filter(q=>realLeadIds.has(q.lead_id)&&['sent','viewed'].includes(q.status)).length;
  const booked=state.bookings.filter(b=>realLeadIds.has(b.lead_id)&&['booked','event_prep'].includes(b.status)).length;
  const bookedRevenue=state.bookings.filter(b=>realLeadIds.has(b.lead_id)&&['booked','event_prep','completed'].includes(b.status)).reduce((sum,b)=>sum+(quoteForBooking(b)?.total_cents||0),0);
  const outstanding=state.bookings.filter(b=>realLeadIds.has(b.lead_id)&&['booked','event_prep'].includes(b.status)).reduce((sum,b)=>sum+(b.remaining_balance_cents||0),0);

  $('metricGrid').innerHTML=[
    ['Active Leads',activeLeads,'in pipeline'],['Awaiting Decision',awaiting,'open quotes'],['Booked Events',booked,'active bookings'],['Booked Revenue',money(bookedRevenue),'all booked'],['Outstanding',money(outstanding),'remaining balances']
  ].map(x=>'<div class="metric-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join('');

  const groups=[
    ['New',state.leads.filter(l=>l.source!=='demo'&&l.status==='new').length],
    ['Quoted',state.leads.filter(l=>l.source!=='demo'&&l.status==='quoted').length],
    ['Accepted',state.leads.filter(l=>l.source!=='demo'&&l.status==='accepted').length],
    ['Booked',state.leads.filter(l=>l.source!=='demo'&&['booked','event_prep'].includes(l.status)).length]
  ];
  $('pipelineSummary').innerHTML=groups.map(x=>'<div class="pipeline-pill"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join('');

  const today=new Date();today.setHours(0,0,0,0);
  const upcoming=state.bookings.map(b=>({b,l:leadForBooking(b)})).filter(x=>x.l?.event_date&&new Date(x.l.event_date+'T12:00:00')>=today&&!['cancelled','completed'].includes(x.b.status)).sort((a,b)=>a.l.event_date.localeCompare(b.l.event_date)).slice(0,6);
  $('upcomingEvents').innerHTML=upcoming.length?upcoming.map(x=>'<div class="compact-item"><div><strong>'+esc(x.l.first_name+' '+(x.l.last_name||''))+'</strong><span>'+esc(x.l.event_type)+' • '+esc(x.l.venue_city||'')+'</span></div><div><strong>'+fmtDate(x.l.event_date)+'</strong><span>'+esc(x.b.status.replaceAll('_',' '))+'</span></div></div>').join(''):'<div class="empty">No upcoming booked events yet.</div>';

  $('recentLeadsBody').innerHTML=state.leads.slice(0,8).map(leadRow).join('');
  bindRowButtons();
}

function leadRow(l){
  const q=quoteForLead(l.id);
  const demo=l.source==='demo'?'<span class="status-badge demo">DEMO</span> ':'';
  return '<tr><td><strong>'+demo+esc(l.first_name+' '+(l.last_name||''))+'</strong><span class="subtle">'+esc(l.email)+'</span></td><td>'+esc(l.event_type)+'</td><td>'+fmtDate(l.event_date)+'</td><td>'+esc(l.guest_count||'—')+'</td><td>'+esc(l.package_interest||'—')+'</td><td>'+(q?money(q.total_cents):'—')+'</td><td>'+statusBadge(l.status)+'</td><td><button class="row-action" data-open-lead="'+esc(l.id)+'">View</button></td></tr>';
}

function renderLeads(){
  const filter=$('leadFilter').value;
  const rows=filter==='all'?state.leads:state.leads.filter(l=>l.status===filter);
  $('leadsBody').innerHTML=rows.length?rows.map(leadRow).join(''):'<tr><td colspan="8" class="empty">No leads match this filter.</td></tr>';
  bindRowButtons();
}

function renderBookings(){
  $('bookingsBody').innerHTML=state.bookings.length?state.bookings.map(b=>{
    const l=leadForBooking(b),q=quoteForBooking(b),p=paymentForBooking(b.id);
    const demo=l?.source==='demo'?'<span class="status-badge demo">DEMO</span> ':'';
    return '<tr><td><strong>'+demo+'#'+esc(b.booking_number)+'</strong><span class="subtle">'+esc(l?.event_type||'')+'</span></td><td>'+esc((l?.first_name||'')+' '+(l?.last_name||''))+'</td><td>'+fmtDate(l?.event_date)+'</td><td>'+money(q?.total_cents||0)+'</td><td>'+(p?money(p.amount_cents):money(b.retainer_paid_cents||0))+'</td><td>'+money(b.remaining_balance_cents||0)+'</td><td>'+statusBadge(b.status)+'</td><td><button class="row-action" data-open-booking="'+esc(b.id)+'">Open</button></td></tr>';
  }).join(''):'<tr><td colspan="8" class="empty">No bookings yet.</td></tr>';
  bindRowButtons();
}


function renderAnalytics(){
  const sessions=state.visitorSessions||[];
  const totalViews=sessions.reduce((n,s)=>n+Number(s.page_view_count||0),0);
  const totalClicks=sessions.reduce((n,s)=>n+Number(s.click_count||0),0);
  const identified=sessions.filter(s=>s.lead_id).length;
  $('analyticsMetricGrid').innerHTML=[
    ['Visitors',sessions.length,'tracked sessions'],
    ['Page Views',totalViews,'website views'],
    ['Clicks',totalClicks,'tracked button/link clicks'],
    ['Identified Leads',identified,'sessions linked after quote submit']
  ].map(x=>'<div class="metric-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join('');

  const counts={};
  sessions.forEach(s=>{const key=s.source||'direct';counts[key]=(counts[key]||0)+1});
  const sources=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  $('trafficSources').innerHTML=sources.length?sources.map(([name,count])=>'<div class="pipeline-pill"><strong>'+count+'</strong><span>'+esc(name)+'</span></div>').join(''):'<div class="empty">No website activity recorded yet.</div>';

  $('visitorSessionsBody').innerHTML=sessions.length?sessions.map(s=>{
    const lead=state.leads.find(l=>l.id===s.lead_id);
    const who=lead?'<strong>'+esc(lead.first_name+' '+(lead.last_name||''))+'</strong><span class="subtle">'+esc(lead.email)+'</span>':'<strong>Anonymous visitor</strong><span class="subtle">Not yet submitted</span>';
    return '<tr><td>'+who+'</td><td><strong>'+esc(s.source||'direct')+'</strong><span class="subtle">'+esc(s.medium||'')+'</span></td><td>'+esc(s.landing_path||'—')+'</td><td>'+esc(s.page_view_count||0)+'</td><td>'+esc(s.click_count||0)+'</td><td>'+fmtDateTime(s.last_seen_at)+'</td><td><button class="row-action" data-open-visit="'+esc(s.id)+'">View Journey</button></td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty">No website sessions yet.</td></tr>';
  bindRowButtons();
}

function openVisitor(id){
  const s=state.visitorSessions.find(x=>x.id===id);if(!s)return;
  const lead=state.leads.find(l=>l.id===s.lead_id);
  const events=state.visitorEvents.filter(e=>e.session_id===id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const html=`
    <div class="detail-grid">
      <div class="detail-box"><span>Visitor</span><strong>${lead?esc(lead.first_name+' '+(lead.last_name||'')):'Anonymous'}</strong></div>
      <div class="detail-box"><span>Source</span><strong>${esc(s.source||'direct')}</strong></div>
      <div class="detail-box"><span>Medium</span><strong>${esc(s.medium||'—')}</strong></div>
      <div class="detail-box"><span>Campaign</span><strong>${esc(s.campaign||'—')}</strong></div>
      <div class="detail-box"><span>Device</span><strong>${esc((s.device_type||'—')+' • '+(s.browser||'—'))}</strong></div>
      <div class="detail-box"><span>First Seen</span><strong>${fmtDateTime(s.first_seen_at)}</strong></div>
      <div class="detail-box"><span>Landing</span><strong>${esc(s.landing_path||'—')}</strong></div>
      <div class="detail-box"><span>Referrer</span><strong>${esc(s.referrer||'Direct / unavailable')}</strong></div>
    </div>
    ${lead?'<div class="drawer-section"><h3>Converted Lead</h3><p class="muted">'+esc(lead.email)+(lead.phone?' • '+esc(lead.phone):'')+'</p><button class="gold-button small" id="openVisitLead">Open Lead</button></div>':''}
    <div class="drawer-section"><h3>Click & Page Journey</h3>
      <div class="journey-list">
      ${events.length?events.map(e=>'<div class="journey-item"><div><strong>'+esc(e.event_type.replaceAll('_',' '))+'</strong><span>'+esc(e.label||e.path||'Website activity')+'</span></div><small>'+fmtDateTime(e.created_at)+'</small></div>').join(''):'<div class="empty">No events recorded for this session.</div>'}
      </div>
    </div>
  `;
  openDrawer('Website Session',lead?'Linked to Lead #'+lead.lead_number:'Anonymous Visitor',html);
  if($('openVisitLead')) $('openVisitLead').onclick=()=>openLead(lead.id);
}

function renderPricing(){
  const friendlyRule = r => {
    let amount=r.amount_cents!=null?money(r.amount_cents):'';
    if(r.rule_type==='percentage') amount=(r.config?.percent||0)+'%';
    if(r.rule_code.startsWith('SERVICE_AREA_')&&r.max_value!=null) amount+=(amount?' • ':'')+r.min_value+'–'+r.max_value+' mi';
    return '<div class="price-rule"><div><strong>'+esc(r.rule_name)+'</strong><small>'+esc(r.rule_code)+'</small></div><div class="amount">'+esc(amount||r.rule_type)+'</div></div>';
  };
  $('pricingRules').innerHTML=state.pricingRules.map(friendlyRule).join('');
  $('packageOptions').innerHTML=state.packageOptions.map(o=>'<div class="price-rule"><div><strong>'+esc(o.option_name)+'</strong><small>'+esc(o.category)+' • '+(o.customer_selectable?'Customer selectable':'Core service')+'</small></div><div class="amount">'+(o.price_cents?money(o.price_cents):'Included')+'</div></div>').join('');
}

function bindRowButtons(){
  document.querySelectorAll('[data-open-lead]').forEach(b=>b.onclick=()=>openLead(b.dataset.openLead));
  document.querySelectorAll('[data-open-booking]').forEach(b=>b.onclick=()=>openBooking(b.dataset.openBooking));
  document.querySelectorAll('[data-open-visit]').forEach(b=>b.onclick=()=>openVisitor(b.dataset.openVisit));
}

function openDrawer(eyebrow,title,html){
  $('drawerEyebrow').textContent=eyebrow;$('drawerTitle').textContent=title;$('drawerContent').innerHTML=html;
  $('drawerBackdrop').hidden=false;$('recordDrawer').classList.add('open');$('recordDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){
  $('recordDrawer').classList.remove('open');$('recordDrawer').setAttribute('aria-hidden','true');$('drawerBackdrop').hidden=true;
}

function openLead(id){
  const l=state.leads.find(x=>x.id===id);if(!l)return;
  const q=quoteForLead(id),b=bookingForLead(id),items=q?state.quoteItems.filter(i=>i.quote_id===q.id):[];
  const quoteLink=q?SITE_BASE+'/quote.html?token='+q.public_token:'';
  const visit=state.visitorSessions.find(s=>s.lead_id===l.id);
  const journey=visit?state.visitorEvents.filter(e=>e.session_id===visit.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)):[];
  const html=`
    <div class="detail-grid">
      <div class="detail-box"><span>Email</span><strong>${esc(l.email)}</strong></div>
      <div class="detail-box"><span>Phone</span><strong>${esc(l.phone||'—')}</strong></div>
      <div class="detail-box"><span>Event</span><strong>${esc(l.event_type)}</strong></div>
      <div class="detail-box"><span>Date</span><strong>${fmtDate(l.event_date)}</strong></div>
      <div class="detail-box"><span>Venue</span><strong>${esc([l.venue_name,l.venue_city,l.venue_state].filter(Boolean).join(' • '))}</strong></div>
      <div class="detail-box"><span>Guests</span><strong>${esc(l.guest_count||'—')} total / ${esc(l.drinking_guest_count??'—')} drinking</strong></div>
      <div class="detail-box"><span>Package</span><strong>${esc(l.package_interest||'—')}</strong></div>
      <div class="detail-box"><span>Source</span><strong>${esc(visit?.source||l.source||'website')}</strong></div>
      <div class="detail-box"><span>Status</span><strong>${esc(l.status.replaceAll('_',' '))}</strong></div>
    </div>
    ${l.event_notes?'<div class="drawer-section"><h3>Notes</h3><p class="muted">'+esc(l.event_notes)+'</p></div>':''}
    ${visit?`<div class="drawer-section"><h3>Website Journey</h3>
      <p class="muted">First touch: ${esc(visit.source||'direct')}${visit.referrer?' • '+esc(visit.referrer):''}</p>
      <div class="journey-list">${journey.slice(-12).map(e=>'<div class="journey-item"><div><strong>'+esc(e.event_type.replaceAll('_',' '))+'</strong><span>'+esc(e.label||e.path||'Website activity')+'</span></div><small>'+fmtDateTime(e.created_at)+'</small></div>').join('')}</div>
    </div>`:''}
    ${q?`<div class="drawer-section"><h3>Quote CE-${q.quote_number} • ${money(q.total_cents)}</h3>
      ${items.map(i=>'<div class="quote-item-row"><span>'+esc(i.description)+'</span><strong>'+money(i.line_total_cents)+'</strong></div>').join('')}
      <div class="quote-item-row"><span>30% retainer</span><strong>${money(q.retainer_cents)}</strong></div>
      <div class="quote-item-row"><span>Remaining balance</span><strong>${money(q.balance_cents)}</strong></div>
      <div class="copy-link">${esc(quoteLink)}</div>
      <div class="drawer-actions"><button class="outline-button" id="copyQuoteLink">Copy Quote Link</button>${b?'<button class="gold-button small" id="openRelatedBooking">Open Booking</button>':''}</div>
    </div>`:''}
    <div class="drawer-section"><h3>Update Lead Status</h3><div class="drawer-form">
      <select id="leadStatusSelect">
        ${['new','quoted','accepted','declined','booked','event_prep','completed','lost'].map(s=>'<option value="'+s+'" '+(l.status===s?'selected':'')+'>'+s.replaceAll('_',' ')+'</option>').join('')}
      </select>
      <button class="outline-button" id="saveLeadStatus">Save Status</button>
    </div></div>
  `;
  openDrawer(l.source==='demo'?'Demo Lead #'+l.lead_number:'Lead #'+l.lead_number,l.first_name+' '+(l.last_name||''),html);
  if($('copyQuoteLink')) $('copyQuoteLink').onclick=()=>navigator.clipboard.writeText(quoteLink);
  if($('openRelatedBooking')) $('openRelatedBooking').onclick=()=>openBooking(b.id);
  $('saveLeadStatus').onclick=async()=>{
    const status=$('leadStatusSelect').value;
    const {error}=await supabase.from('leads').update({status,updated_at:new Date().toISOString()}).eq('id',l.id);
    if(error){alert(error.message);return} await loadData();openLead(l.id);
  };
}

function openBooking(id){
  const b=state.bookings.find(x=>x.id===id);if(!b)return;
  const l=leadForBooking(b),q=quoteForBooking(b),ed=state.eventDetails.find(x=>x.booking_id===id);
  let list=state.shoppingLists.find(x=>x.booking_id===id);
  const items=list?state.shoppingItems.filter(x=>x.shopping_list_id===list.id):[];
  const shareLink=list?SITE_BASE+'/shopping-list.html?token='+list.public_token:'';

  const sig=(ed?.signature_cocktails||[]).map(x=>typeof x==='string'?x:(x.name||'')).filter(Boolean).join(', ');
  const mocks=(ed?.mocktails||[]).map(x=>typeof x==='string'?x:(x.name||'')).filter(Boolean).join(', ');

  const html=`
    <div class="detail-grid">
      <div class="detail-box"><span>Booking</span><strong>#${esc(b.booking_number)}</strong></div>
      <div class="detail-box"><span>Status</span><strong>${esc(b.status.replaceAll('_',' '))}</strong></div>
      <div class="detail-box"><span>Client</span><strong>${esc((l?.first_name||'')+' '+(l?.last_name||''))}</strong></div>
      <div class="detail-box"><span>Event Date</span><strong>${fmtDate(l?.event_date)}</strong></div>
      <div class="detail-box"><span>Event Total</span><strong>${money(q?.total_cents||0)}</strong></div>
      <div class="detail-box"><span>Retainer Paid</span><strong>${money(b.retainer_paid_cents||0)}</strong></div>
      <div class="detail-box"><span>Remaining</span><strong>${money(b.remaining_balance_cents||0)}</strong></div>
      <div class="detail-box"><span>Guests</span><strong>${esc(l?.guest_count||'—')}</strong></div>
    </div>

    <div class="drawer-section"><h3>Event Prep</h3>
      <form id="eventDetailsForm" class="drawer-form">
        <div class="form-two">
          <label>Final guest count<input name="final_guest_count" type="number" min="1" value="${esc(ed?.final_guest_count||l?.guest_count||'')}" /></label>
          <label>Final drinking guests<input name="final_drinking_guest_count" type="number" min="0" value="${esc(ed?.final_drinking_guest_count??l?.drinking_guest_count??'')}" /></label>
        </div>
        <div class="form-two">
          <label>Theme<input name="theme" value="${esc(ed?.theme||'')}" /></label>
          <label>Color palette<input name="color_palette" value="${esc(ed?.color_palette||'')}" /></label>
        </div>
        <label>Signature cocktails<input name="signature_cocktails" value="${esc(sig)}" placeholder="Margarita, Paloma, Old Fashioned" /></label>
        <label>Mocktails<input name="mocktails" value="${esc(mocks)}" placeholder="Optional mocktail names" /></label>
        <label>Venue rules<textarea name="venue_rules" rows="2">${esc(ed?.venue_rules||'')}</textarea></label>
        <label>Access / setup instructions<textarea name="access_instructions" rows="2">${esc(ed?.access_instructions||'')}</textarea></label>
        <div class="form-two">
          <label>On-site contact<input name="onsite_contact_name" value="${esc(ed?.onsite_contact_name||'')}" /></label>
          <label>Contact phone<input name="onsite_contact_phone" value="${esc(ed?.onsite_contact_phone||'')}" /></label>
        </div>
        <label>Additional notes<textarea name="additional_notes" rows="3">${esc(ed?.additional_notes||'')}</textarea></label>
        <button class="gold-button small" type="submit">Save Event Details</button>
      </form>
    </div>

    <div class="drawer-section"><h3>Client Shopping List</h3>
      ${list?`
        <div class="copy-link">${esc(shareLink)}</div>
        <div class="drawer-actions"><button class="outline-button" id="copyShoppingLink">Copy Client Link</button><button class="outline-button" id="markListReady">Mark Ready</button><button class="outline-button" id="markListSent">Mark Sent</button></div>
        <div id="shoppingRows">${items.length?items.map(i=>'<div class="shopping-row"><div><strong>'+esc(i.item_name)+'</strong><span class="subtle">'+esc(i.category)+(i.notes?' • '+esc(i.notes):'')+'</span></div><div><strong>'+esc(i.quantity??'')+' '+esc(i.unit||'')+'</strong> <button class="delete-mini" data-delete-shopping="'+esc(i.id)+'">×</button></div></div>').join(''):'<div class="empty">No shopping items yet.</div>'}</div>
        <form id="shoppingItemForm" class="shopping-add">
          <input name="item_name" required placeholder="Item e.g. Tequila" />
          <input name="quantity" type="number" min="0" step=".25" placeholder="Qty" />
          <input name="unit" placeholder="bottles" />
          <select name="category"><option>alcohol</option><option>mixer</option><option>juice</option><option>syrup</option><option>garnish</option><option>ice</option><option>other</option></select>
          <button class="gold-button small" type="submit">Add</button>
        </form>
      `:'<p class="muted">Create a private client shopping list after the menu is finalized.</p><button class="gold-button small" id="createShoppingList">Create Shopping List</button>'}
    </div>
  `;

  openDrawer('Booking #'+b.booking_number,(l?.first_name||'Client')+' • '+(l?.event_type||'Event'),html);

  $('eventDetailsForm').onsubmit=async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    const payload={
      booking_id:b.id,
      final_guest_count:fd.get('final_guest_count')?Number(fd.get('final_guest_count')):null,
      final_drinking_guest_count:fd.get('final_drinking_guest_count')?Number(fd.get('final_drinking_guest_count')):null,
      theme:fd.get('theme')||null,color_palette:fd.get('color_palette')||null,
      signature_cocktails:String(fd.get('signature_cocktails')||'').split(',').map(x=>x.trim()).filter(Boolean),
      mocktails:String(fd.get('mocktails')||'').split(',').map(x=>x.trim()).filter(Boolean),
      venue_rules:fd.get('venue_rules')||null,access_instructions:fd.get('access_instructions')||null,
      onsite_contact_name:fd.get('onsite_contact_name')||null,onsite_contact_phone:fd.get('onsite_contact_phone')||null,
      additional_notes:fd.get('additional_notes')||null,updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from('event_details').upsert(payload,{onConflict:'booking_id'});
    if(error){alert(error.message);return}
    await supabase.from('bookings').update({status:'event_prep',updated_at:new Date().toISOString()}).eq('id',b.id);
    await supabase.from('leads').update({status:'event_prep',updated_at:new Date().toISOString()}).eq('id',b.lead_id);
    await loadData();openBooking(b.id);
  };

  if(!list&&$('createShoppingList')) $('createShoppingList').onclick=async()=>{
    const {error}=await supabase.from('shopping_lists').insert({booking_id:b.id,status:'draft',version:1,generated_at:new Date().toISOString()});
    if(error){alert(error.message);return}await loadData();openBooking(b.id);
  };

  if(list){
    $('copyShoppingLink').onclick=()=>navigator.clipboard.writeText(shareLink);
    $('markListReady').onclick=()=>updateListStatus(list.id,'ready');
    $('markListSent').onclick=()=>updateListStatus(list.id,'sent');
    $('shoppingItemForm').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget);
      const {error}=await supabase.from('shopping_list_items').insert({
        shopping_list_id:list.id,category:fd.get('category'),item_name:fd.get('item_name'),
        quantity:fd.get('quantity')?Number(fd.get('quantity')):null,unit:fd.get('unit')||null,
        client_supplied:true,sort_order:items.length
      });
      if(error){alert(error.message);return}await loadData();openBooking(b.id);
    };
    document.querySelectorAll('[data-delete-shopping]').forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Remove this shopping-list item?'))return;
      const {error}=await supabase.from('shopping_list_items').delete().eq('id',btn.dataset.deleteShopping);
      if(error){alert(error.message);return}await loadData();openBooking(b.id);
    });
  }
}

async function updateListStatus(id,status){
  const patch={status,updated_at:new Date().toISOString()};
  if(status==='ready') patch.generated_at=new Date().toISOString();
  if(status==='sent') patch.sent_at=new Date().toISOString();
  const {error}=await supabase.from('shopping_lists').update(patch).eq('id',id);
  if(error){alert(error.message);return}
  await loadData();
  const list=state.shoppingLists.find(x=>x.id===id);if(list)openBooking(list.booking_id);
}

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){
    state.session=session;
    showOnly('authView');
    showAuthForm('newPasswordForm');
    setStatus('authStatus','Password recovery verified. Choose your new password.');
    return;
  }
  setTimeout(boot,0);
});
boot();
