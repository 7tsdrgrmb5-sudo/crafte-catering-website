(()=>{
  const U='https://ozjctdmdwoutsebkjcpn.supabase.co';
  const K='sb_publishable_tERnQU70mt-6imXPumOiUg_EDTYsQpH';
  const DISMISS_KEY='crafte_contact_prompt_dismissed';
  const SUBMIT_KEY='crafte_contact_prompt_submitted';
  function isSpanish(){return document.documentElement.lang.toLowerCase().startsWith('es')}
  function t(){
    return isSpanish()?{
      eyebrow:'¿Planeando un evento?',
      title:'¿Quieres que CraftE se comunique contigo?',
      copy:'Déjanos tu información y podemos comunicarnos contigo sobre tu evento. Sin presión — también puedes seguir navegando o usar la cotización instantánea cuando quieras.',
      first:'Nombre',last:'Apellido',phone:'Teléfono',best:'Mejor forma de contactarte',
      text:'Texto',call:'Llamada',email:'Correo electrónico',event:'Tipo de evento',
      eventPh:'Cumpleaños, boda, etc.',date:'Fecha del evento (opcional)',
      anything:'¿Algo que quieras contarnos?',anythingPh:'Cantidad de invitados, ciudad, preguntas o cualquier otro detalle.',
      consent:'Me gustaría que CraftE Catering se comunique conmigo sobre mi evento.',
      submit:'Sí, Contáctenme',skip:'No gracias, seguir navegando',
      needContact:'Ingresa un correo electrónico o número de teléfono.',
      sending:'Enviando…',success:'¡Gracias! CraftE recibió tu solicitud y puede comunicarse contigo sobre tu evento.',
      sent:'Solicitud Enviada ✓',failure:'No pudimos enviar tu solicitud.'
    }:{
      eyebrow:'Planning an event?',title:'Want CraftE to contact you?',
      copy:"Leave your information and we can follow up about your event. No pressure — you can still browse or use the instant quote whenever you're ready.",
      first:'First name',last:'Last name',phone:'Phone',best:'Best way to reach you',
      text:'Text',call:'Call',email:'Email',event:'Event type',eventPh:'Birthday, wedding, etc.',
      date:'Event date (optional)',anything:"Anything you'd like us to know?",anythingPh:'Guest count, city, questions, or anything else.',
      consent:"I’d like CraftE Catering to contact me about my event inquiry.",
      submit:'Yes, Contact Me',skip:'No thanks, keep browsing',
      needContact:'Please enter an email or phone number.',sending:'Sending…',
      success:'Thank you! CraftE received your request and can follow up about your event.',
      sent:'Request Sent ✓',failure:'Unable to send your request.'
    };
  }

  const now=Date.now();
  const dismissed=Number(localStorage.getItem(DISMISS_KEY)||0);
  const submitted=Number(localStorage.getItem(SUBMIT_KEY)||0);
  if((submitted && now-submitted<30*86400000)||(dismissed && now-dismissed<7*86400000)) return;

  let clickCount=0, shown=false;
  function show(){
    if(shown)return; shown=true;
    const ES=isSpanish(),T=t();
    const wrap=document.createElement('div');
    wrap.className='contact-prompt-backdrop';
    wrap.innerHTML=`
      <div class="contact-prompt-card" role="dialog" aria-modal="true" aria-labelledby="contactPromptTitle">
        <button class="contact-prompt-close" type="button" aria-label="${ES?'Cerrar':'Close'}">×</button>
        <p class="eyebrow">${T.eyebrow}</p>
        <h2 id="contactPromptTitle">${T.title}</h2>
        <p class="contact-prompt-copy">${T.copy}</p>
        <form id="contactPromptForm">
          <div class="contact-prompt-grid">
            <label>${T.first}<input name="first_name" autocomplete="given-name" required></label>
            <label>${T.last}<input name="last_name" autocomplete="family-name"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>${T.email}<input name="email" type="email" autocomplete="email"></label>
            <label>${T.phone}<input name="phone" type="tel" autocomplete="tel"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>${T.best}
              <select name="preferred_contact">
                <option value="text">${T.text}</option>
                <option value="phone">${T.call}</option>
                <option value="email">${T.email}</option>
              </select>
            </label>
            <label>${T.event}<input name="event_type" placeholder="${T.eventPh}"></label>
          </div>
          <label>${T.date}<input name="event_date" type="date"></label>
          <label>${T.anything}<textarea name="message" rows="3" placeholder="${T.anythingPh}"></textarea></label>
          <input name="website" tabindex="-1" autocomplete="off" class="contact-honeypot" aria-hidden="true">
          <label class="contact-consent"><input name="consent" type="checkbox" required> ${T.consent}</label>
          <button class="btn btn-gold full" type="submit" id="contactPromptSubmit">${T.submit}</button>
          <button class="contact-prompt-skip" type="button">${T.skip}</button>
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
      if(!email&&!phone){status.textContent=T.needContact;return}
      const button=wrap.querySelector('#contactPromptSubmit');
      button.disabled=true;button.textContent=T.sending;status.textContent='';
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
        website:String(fd.get('website')||''),
        language:isSpanish()?'es':'en'
      };
      try{
        const r=await fetch(U+'/functions/v1/capture-contact',{
          method:'POST',headers:{'Content-Type':'application/json','apikey':K},
          body:JSON.stringify(payload)
        });
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||T.failure);
        localStorage.setItem(SUBMIT_KEY,String(Date.now()));
        status.textContent=T.success;
        button.textContent=T.sent;
        window.CraftEAnalytics?.send?.('contact_requested',{label:isSpanish()?'Solicitó contacto de CraftE':'Requested CraftE follow-up',metadata:{language:isSpanish()?'es':'en'}});
        setTimeout(()=>{wrap.classList.remove('open');setTimeout(()=>wrap.remove(),200)},1800);
      }catch(err){
        status.textContent=T.failure;
        button.disabled=false;button.textContent=T.submit;
      }
    });
  }

  window.addEventListener('crafte-language-change',()=>{
    const existing=document.querySelector('.contact-prompt-backdrop');
    if(existing){existing.remove();shown=false;show();}
  });
  setTimeout(show,20000);
  document.addEventListener('click',e=>{
    if(shown)return;
    const target=e.target.closest('a,button');
    if(!target)return;
    if(target.closest('.contact-prompt-card'))return;
    clickCount++;
    if(clickCount>=3)setTimeout(show,700);
  },{capture:true});
})();