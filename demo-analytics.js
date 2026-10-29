(()=>{
  const KEY='crafte_demo_activity';
  const SESSION_KEY='crafte_demo_session_id';
  function uuid(){
    if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }
  let sessionId=sessionStorage.getItem(SESSION_KEY);
  if(!sessionId){sessionId=uuid();sessionStorage.setItem(SESSION_KEY,sessionId)}
  function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'[]')}catch{return[]}}
  function save(rows){sessionStorage.setItem(KEY,JSON.stringify(rows.slice(-250)))}
  function clean(v,max=180){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
  function record(type,extra={}){
    const rows=read();
    rows.push({session_id:sessionId,type,path:location.pathname+location.hash,at:new Date().toISOString(),...extra});
    save(rows);
  }
  window.CraftEDemoAnalytics={sessionId,record,getActivity:read};
  record('page_view');
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button');
    if(!el)return;
    record('click',{
      element:(el.tagName||'').toLowerCase()+(el.id?'#'+el.id:''),
      label:clean(el.getAttribute('aria-label')||el.textContent),
      href:el.getAttribute('href')||null
    });
  },{capture:true});
})();