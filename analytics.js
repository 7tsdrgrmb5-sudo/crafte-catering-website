(()=>{
  const U='https://ozjctdmdwoutsebkjcpn.supabase.co';
  const K='sb_publishable_tERnQU70mt-6imXPumOiUg_EDTYsQpH';
  const SESSION_KEY='crafte_visitor_session_id';
  const ATTR_KEY='crafte_visit_attribution';

  function uuid(){
    if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);
    });
  }
  let sessionId=sessionStorage.getItem(SESSION_KEY);
  if(!sessionId){sessionId=uuid();sessionStorage.setItem(SESSION_KEY,sessionId)}

  const params=new URLSearchParams(location.search);
  const ref=document.referrer||'';
  let safeRef=ref;
  try{const ru=new URL(ref);safeRef=ru.origin+ru.pathname}catch{}
  function sourceFrom(){
    const utm=(params.get('utm_source')||'').trim().toLowerCase();
    if(utm) return utm;
    if(params.get('fbclid')) return 'facebook';
    try{
      const h=new URL(ref).hostname.toLowerCase();
      if(h.includes('instagram')) return 'instagram';
      if(h.includes('facebook')||h.includes('fb.com')) return 'facebook';
      if(h.includes('tiktok')) return 'tiktok';
      if(h.includes('google')) return 'google';
      if(h.includes('bing')) return 'bing';
      if(h) return h.replace(/^www\./,'');
    }catch{}
    return 'direct';
  }
  let attr;
  try{attr=JSON.parse(sessionStorage.getItem(ATTR_KEY)||'null')}catch{}
  if(!attr){
    attr={
      source:sourceFrom(),
      medium:params.get('utm_medium')||null,
      campaign:params.get('utm_campaign')||null,
      content:params.get('utm_content')||null,
      term:params.get('utm_term')||null,
      referrer:safeRef||null
    };
    sessionStorage.setItem(ATTR_KEY,JSON.stringify(attr));
  }

  function device(){
    const ua=navigator.userAgent||'';
    return /Mobi|Android|iPhone|iPad/i.test(ua)?'mobile':'desktop';
  }
  function browser(){
    const ua=navigator.userAgent||'';
    if(/Edg\//.test(ua)) return 'Edge';
    if(/Chrome\//.test(ua)) return 'Chrome';
    if(/Safari\//.test(ua)&&!/Chrome\//.test(ua)) return 'Safari';
    if(/Firefox\//.test(ua)) return 'Firefox';
    return 'Other';
  }
  function cleanText(v,max=180){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
  function safeUrl(raw){
    try{
      const u=new URL(raw,location.origin);
      ['token','session_id','code','access_token','refresh_token'].forEach(k=>u.searchParams.delete(k));
      return u.origin===location.origin ? u.pathname+(u.search||'')+(u.hash||'') : u.origin+u.pathname;
    }catch{return null}
  }
  function send(eventType,extra={}){
    const body={
      session_id:sessionId,event_type:eventType,
      path:safeUrl(location.href),
      referrer:attr.referrer,source:attr.source,medium:attr.medium,campaign:attr.campaign,content:attr.content,term:attr.term,
      device_type:device(),browser:browser(),...extra
    };
    fetch(U+'/functions/v1/track-event',{
      method:'POST',headers:{'Content-Type':'application/json','apikey':K},
      body:JSON.stringify(body),keepalive:true
    }).catch(()=>{});
  }

  window.CraftEAnalytics={sessionId,source:attr.source,send};
  send('page_view');

  let quoteStarted=false;
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button');
    if(!el)return;
    send('click',{
      element:(el.tagName||'').toLowerCase()+(el.id?'#'+el.id:''),
      label:cleanText(el.getAttribute('aria-label')||el.textContent),
      href:safeUrl(el.href||el.getAttribute('href')||'')
    });
  },{capture:true});

  const quoteForm=document.getElementById('quoteForm');
  if(quoteForm){
    const mark=()=>{
      if(quoteStarted)return; quoteStarted=true;
      send('quote_started',{element:'form#quoteForm',label:'Quote form started'});
    };
    quoteForm.addEventListener('focusin',mark,{once:true});
    quoteForm.addEventListener('click',mark,{once:true});
  }
})();