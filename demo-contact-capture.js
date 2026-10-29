(()=>{
  if(!document.body || !document.getElementById('quoteForm')) return;
  const DISMISS='crafte_demo_contact_dismissed';
  let shown=false, clicks=0;

  function show(){
    if(shown)return; shown=true;
    const wrap=document.createElement('div');
    wrap.className='contact-prompt-backdrop';
    wrap.innerHTML=`
      <div class="contact-prompt-card" role="dialog" aria-modal="true" aria-labelledby="demoContactPromptTitle">
        <button class="contact-prompt-close" type="button" aria-label="Close">×</button>
        <div style="margin:0 0 14px;padding:8px 10px;border-radius:10px;background:#d4af37;color:#050505;font-weight:900;text-align:center;font-size:.78rem">DEMO ONLY — NOTHING IS SENT TO THE LIVE CRM</div>
        <p class="eyebrow">Planning an event?</p>
        <h2 id="demoContactPromptTitle">Want CraftE to contact you?</h2>
        <p class="contact-prompt-copy">Leave your information and we can follow up about your event. No pressure — you can still browse or use the instant quote whenever you're ready.</p>
        <form id="demoContactPromptForm">
          <div class="contact-prompt-grid">
            <label>First name<input name="first_name" autocomplete="off" required placeholder="Jessica"></label>
            <label>Last name<input name="last_name" autocomplete="off" placeholder="Martinez"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>Email<input name="email" type="email" autocomplete="off" placeholder="jessica@example.com"></label>
            <label>Phone<input name="phone" type="tel" autocomplete="off" placeholder="(555) 555-0123"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>Best way to reach you
              <select name="preferred_contact">
                <option value="text">Text</option>
                <option value="phone">Call</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label>Event type<input name="event_type" placeholder="Birthday, wedding, etc."></label>
          </div>
          <label>Event date (optional)<input name="event_date" type="date"></label>
          <label>Anything you'd like us to know?<textarea name="message" rows="3" placeholder="Guest count, city, questions, or anything else."></textarea></label>
          <label class="contact-consent"><input name="consent" type="checkbox" required> I’d like CraftE Catering to contact me about my event inquiry.</label>
          <button class="btn btn-gold full" type="submit" id="demoContactSubmit">Yes, Contact Me</button>
          <button class="contact-prompt-skip" type="button">No thanks, keep browsing</button>
          <p class="quote-status" id="demoContactStatus" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add('open'));

    const close=()=>{
      sessionStorage.setItem(DISMISS,'1');
      wrap.classList.remove('open');
      setTimeout(()=>wrap.remove(),200);
    };
    wrap.querySelector('.contact-prompt-close').onclick=close;
    wrap.querySelector('.contact-prompt-skip').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});

    wrap.querySelector('#demoContactPromptForm').addEventListener('submit',e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      const email=String(fd.get('email')||'').trim();
      const phone=String(fd.get('phone')||'').trim();
      const status=wrap.querySelector('#demoContactStatus');
      if(!email&&!phone){status.textContent='Please enter an email or phone number.';return}
      const record={
        first_name:String(fd.get('first_name')||'').trim(),
        last_name:String(fd.get('last_name')||'').trim(),
        email,phone,
        preferred_contact:String(fd.get('preferred_contact')||'text'),
        event_type:String(fd.get('event_type')||'').trim(),
        event_date:String(fd.get('event_date')||'').trim()||null,
        message:String(fd.get('message')||'').trim(),
        consent:true,
        consent_at:new Date().toISOString(),
        session_id:window.CraftEDemoAnalytics?.sessionId||null
      };
      sessionStorage.setItem('crafte_demo_contact_request',JSON.stringify(record));
      window.CraftEDemoAnalytics?.record?.('contact_requested',{label:'Demo contact request submitted'});
      const button=wrap.querySelector('#demoContactSubmit');
      button.disabled=true;button.textContent='Demo Request Sent ✓';
      status.textContent='Demo captured locally in this browser. Nothing was sent to CraftE or the live CRM.';
      setTimeout(()=>{wrap.classList.remove('open');setTimeout(()=>wrap.remove(),200)},2200);
    });
  }

  // Faster in demo so it is easy to film/show.
  if(!sessionStorage.getItem(DISMISS)) setTimeout(show,6000);
  document.addEventListener('click',e=>{
    if(shown)return;
    if(e.target.closest('.contact-prompt-card'))return;
    if(e.target.closest('a,button')){
      clicks++;
      if(clicks>=2)setTimeout(show,350);
    }
  },{capture:true});
})();