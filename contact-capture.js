(()=>{
  const U='https://ozjctdmdwoutsebkjcpn.supabase.co';
  const K='sb_publishable_tERnQU70mt-6imXPumOiUg_EDTYsQpH';
  const DISMISS_KEY='crafte_contact_prompt_dismissed';
  const SUBMIT_KEY='crafte_contact_prompt_submitted';
  const now=Date.now();
  const dismissed=Number(localStorage.getItem(DISMISS_KEY)||0);
  const submitted=Number(localStorage.getItem(SUBMIT_KEY)||0);
  if((submitted && now-submitted<30*86400000)||(dismissed && now-dismissed<7*86400000)) return;

  let clickCount=0, shown=false;
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function show(){
    if(shown)return; shown=true;
    const wrap=document.createElement('div');
    wrap.className='contact-prompt-backdrop';
    wrap.innerHTML=`
      <div class="contact-prompt-card" role="dialog" aria-modal="true" aria-labelledby="contactPromptTitle">
        <button class="contact-prompt-close" type="button" aria-label="Close">×</button>
        <p class="eyebrow">Planning an event?</p>
        <h2 id="contactPromptTitle">Want CraftE to contact you?</h2>
        <p class="contact-prompt-copy">Leave your information and we can follow up about your event. No pressure — you can still browse or use the instant quote whenever you're ready.</p>
        <form id="contactPromptForm">
          <div class="contact-prompt-grid">
            <label>First name<input name="first_name" autocomplete="given-name" required></label>
            <label>Last name<input name="last_name" autocomplete="family-name"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>Email<input name="email" type="email" autocomplete="email"></label>
            <label>Phone<input name="phone" type="tel" autocomplete="tel"></label>
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
          <input name="website" tabindex="-1" autocomplete="off" class="contact-honeypot" aria-hidden="true">
          <label class="contact-consent"><input name="consent" type="checkbox" required> I’d like CraftE Catering to contact me about my event inquiry.</label>
          <button class="btn btn-gold full" type="submit" id="contactPromptSubmit">Yes, Contact Me</button>
          <button class="contact-prompt-skip" type="button">No thanks, keep browsing</button>
          <p class="quote-status" id="contactPromptStatus" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add('open'));

    const close=()=>{
      localStorage.setItem(DISMISS_KEY,String(Date.now()));
      wrap.classList.remove('open');
      setTimeout(()=>wrap.remove(),200);
    };
    wrap.querySelector('.contact-prompt-close').onclick=close;
    wrap.querySelector('.contact-prompt-skip').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});

    wrap.querySelector('#contactPromptForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget);
      const email=String(fd.get('email')||'').trim();
      const phone=String(fd.get('phone')||'').trim();
      const status=wrap.querySelector('#contactPromptStatus');
      if(!email&&!phone){status.textContent='Please enter an email or phone number.';return}
      const button=wrap.querySelector('#contactPromptSubmit');
      button.disabled=true;button.textContent='Sending…';status.textContent='';
      const payload={
        session_id:window.CraftEAnalytics?.sessionId||null,
        first_name:String(fd.get('first_name')||'').trim(),
        last_name:String(fd.get('last_name')||'').trim(),
        email,phone,
        preferred_contact:String(fd.get('preferred_contact')||'text'),
        event_type:String(fd.get('event_type')||'').trim(),
        event_date:String(fd.get('event_date')||'').trim()||null,
        message:String(fd.get('message')||'').trim(),
        consent:fd.get('consent')==='on',
        website:String(fd.get('website')||'')
      };
      try{
        const r=await fetch(U+'/functions/v1/capture-contact',{
          method:'POST',headers:{'Content-Type':'application/json','apikey':K},
          body:JSON.stringify(payload)
        });
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||'Unable to send your request.');
        localStorage.setItem(SUBMIT_KEY,String(Date.now()));
        status.textContent='Thank you! CraftE received your request and can follow up about your event.';
        button.textContent='Request Sent ✓';
        window.CraftEAnalytics?.send?.('contact_requested',{label:'Requested CraftE follow-up'});
        setTimeout(()=>{wrap.classList.remove('open');setTimeout(()=>wrap.remove(),200)},1800);
      }catch(err){
        status.textContent=err.message||'Unable to send your request.';
        button.disabled=false;button.textContent='Yes, Contact Me';
      }
    });
  }

  setTimeout(show,20000);
  document.addEventListener('click',e=>{
    if(shown)return;
    const target=e.target.closest('a,button');
    if(!target)return;
    if(target.closest('.contact-prompt-card'))return;
    clickCount++;
    if(clickCount>=3) setTimeout(show,700);
  },{capture:true});
})();