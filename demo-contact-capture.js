(()=>{
  if(!document.body || !document.getElementById('quoteForm')) return;
  function demoContactSpanish(){return document.documentElement.lang.toLowerCase().startsWith('es')}
  function demoContactText(){
    return demoContactSpanish()?{
      demo:'DEMO SOLAMENTE — NADA SE ENVÍA AL CRM REAL',
      eyebrow:'¿Planeando un evento?',title:'¿Quieres que CraftE se comunique contigo?',
      copy:'Déjanos tu información y podemos comunicarnos contigo sobre tu evento. Sin presión — también puedes seguir navegando o usar la cotización instantánea cuando quieras.',
      first:'Nombre',last:'Apellido',phone:'Teléfono',best:'Mejor forma de contactarte',text:'Texto',call:'Llamada',email:'Correo electrónico',
      event:'Tipo de evento',eventPh:'Cumpleaños, boda, etc.',date:'Fecha del evento (opcional)',
      anything:'¿Algo que quieras contarnos?',anythingPh:'Cantidad de invitados, ciudad, preguntas o cualquier otro detalle.',
      consent:'Me gustaría que CraftE Catering se comunique conmigo sobre mi evento.',
      submit:'Sí, Contáctenme',skip:'No gracias, seguir navegando',
      need:'Ingresa un correo electrónico o número de teléfono.',
      sent:'Solicitud Demo Enviada ✓',success:'La solicitud demo se guardó solamente en este navegador. Nada fue enviado a CraftE ni al CRM real.',
      launcher:'DEMO: Mostrar Pop-Up de Contacto'
    }:{
      demo:'DEMO ONLY — NOTHING IS SENT TO THE LIVE CRM',
      eyebrow:'Planning an event?',title:'Want CraftE to contact you?',
      copy:"Leave your information and we can follow up about your event. No pressure — you can still browse or use the instant quote whenever you're ready.",
      first:'First name',last:'Last name',phone:'Phone',best:'Best way to reach you',text:'Text',call:'Call',email:'Email',
      event:'Event type',eventPh:'Birthday, wedding, etc.',date:'Event date (optional)',
      anything:"Anything you'd like us to know?",anythingPh:'Guest count, city, questions, or anything else.',
      consent:"I’d like CraftE Catering to contact me about my event inquiry.",
      submit:'Yes, Contact Me',skip:'No thanks, keep browsing',
      need:'Please enter an email or phone number.',
      sent:'Demo Request Sent ✓',success:'Demo captured locally in this browser. Nothing was sent to CraftE or the live CRM.',
      launcher:'DEMO: Show Contact Pop-Up'
    };
  }

  const DISMISS='crafte_demo_contact_dismissed';
  let shown=false, clicks=0;

  const launcher=document.createElement('button');
  launcher.type='button';
  launcher.textContent=demoContactText().launcher;
  launcher.setAttribute('aria-label',demoContactText().launcher);
  launcher.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9998;border:1px solid #d4af37;background:#0b0b0b;color:#f1cc75;padding:11px 14px;border-radius:999px;font:700 12px Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);cursor:pointer';
  document.body.appendChild(launcher);

  function show(){
    if(shown)return; shown=true;
    const ES=demoContactSpanish(),T=demoContactText();
    const wrap=document.createElement('div');
    wrap.className='contact-prompt-backdrop';
    wrap.innerHTML=`
      <div class="contact-prompt-card" role="dialog" aria-modal="true" aria-labelledby="demoContactPromptTitle">
        <button class="contact-prompt-close" type="button" aria-label="${ES?'Cerrar':'Close'}">×</button>
        <div style="margin:0 0 14px;padding:8px 10px;border-radius:10px;background:#d4af37;color:#050505;font-weight:900;text-align:center;font-size:.78rem">${T.demo}</div>
        <p class="eyebrow">${T.eyebrow}</p>
        <h2 id="demoContactPromptTitle">${T.title}</h2>
        <p class="contact-prompt-copy">${T.copy}</p>
        <form id="demoContactPromptForm">
          <div class="contact-prompt-grid">
            <label>${T.first}<input name="first_name" autocomplete="off" required placeholder="${ES?'Jessica':'Jessica'}"></label>
            <label>${T.last}<input name="last_name" autocomplete="off" placeholder="Martinez"></label>
          </div>
          <div class="contact-prompt-grid">
            <label>${T.email}<input name="email" type="email" autocomplete="off" placeholder="jessica@example.com"></label>
            <label>${T.phone}<input name="phone" type="tel" autocomplete="off" placeholder="(555) 555-0123"></label>
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
          <label class="contact-consent"><input name="consent" type="checkbox" required> ${T.consent}</label>
          <button class="btn btn-gold full" type="submit" id="demoContactSubmit">${T.submit}</button>
          <button class="contact-prompt-skip" type="button">${T.skip}</button>
          <p class="quote-status" id="demoContactStatus" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add('open'));

    const close=()=>{
      sessionStorage.setItem(DISMISS,'1');
      wrap.classList.remove('open');
      setTimeout(()=>{wrap.remove();shown=false;},200);
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
      if(!email&&!phone){status.textContent=T.need;return}
      const record={
        first_name:String(fd.get('first_name')||'').trim(),
        last_name:String(fd.get('last_name')||'').trim(),
        email,phone,
        preferred_contact:String(fd.get('preferred_contact')||'text'),
        event_type:String(fd.get('event_type')||'').trim(),
        event_date:String(fd.get('event_date')||'').trim()||null,
        message:String(fd.get('message')||'').trim(),
        language:demoContactSpanish()?'es':'en',
        consent:true,consent_at:new Date().toISOString(),
        session_id:window.CraftEDemoAnalytics?.sessionId||null
      };
      sessionStorage.setItem('crafte_demo_contact_request',JSON.stringify(record));
      window.CraftEDemoAnalytics?.record?.('contact_requested',{label:ES?'Solicitud demo de contacto':'Demo contact request submitted',language:record.language});
      const button=wrap.querySelector('#demoContactSubmit');
      button.disabled=true;button.textContent=T.sent;
      status.textContent=T.success;
      setTimeout(()=>{wrap.classList.remove('open');setTimeout(()=>{wrap.remove();shown=false;},200)},2200);
    });
  }

  window.addEventListener('crafte-language-change',()=>{
    launcher.textContent=demoContactText().launcher;
    launcher.setAttribute('aria-label',demoContactText().launcher);
    const existing=document.querySelector('.contact-prompt-backdrop');
    if(existing){existing.remove();shown=false;show();}
  });
  launcher.addEventListener('click',show);
  sessionStorage.removeItem(DISMISS);
  setTimeout(show,6000);
  document.addEventListener('click',e=>{
    if(shown)return;
    if(e.target.closest('.contact-prompt-card'))return;
    if(e.target.closest('a,button')){
      clicks++;
      if(clicks>=2)setTimeout(show,350);
    }
  },{capture:true});
})();