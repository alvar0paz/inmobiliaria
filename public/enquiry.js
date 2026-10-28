(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const query = new URLSearchParams(location.search), context = document.querySelector('#enquiry-context');
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'es';
  const say = (es, en) => language() === 'en' ? en : es;
  const types = {estudio: ['Estudio','Studio'], suite: ['Suite','Suite'], depa2: ['2 dormitorios','2 bedrooms'], depa3: ['3 dormitorios','3 bedrooms']};
  const unit = /^\d{3,4}$/.test(query.get('unit') || '') ? query.get('unit') : null;
  function showContext() {
    if (!unit) return;
    context.hidden = false;
    const type = types[query.get('type')];
    context.textContent = say('Tu referencia en la demo: Residencia 01 · Unidad ', 'Your demo reference: Residencia 01 · Unit ') + unit + (type ? ' · ' + type[language() === 'en' ? 1 : 0] : '') + say('. Proyecto ficticio; tu consulta es sobre nuestro servicio web.', '. Fictional project; your enquiry concerns our website service.');
  }
  showContext(); document.addEventListener('demo:language', showContext);
  let key = crypto.randomUUID(), pending = false, completed = false;
  const button = document.querySelector('#enquiry-submit'), status = document.querySelector('#enquiry-status');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || completed || !form.reportValidity()) return;
    pending = true; button.disabled = true; form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'pending'; status.textContent = say('Enviando tu consulta…','Sending your enquiry…');
    const fields = Object.fromEntries(new FormData(form));
    const payload = {...fields, consent: fields.consent === 'on', id: key, language: language(), source: unit ? 'demo' : query.get('source') === 'proforma' ? 'proforma' : 'contact', demoUnit: unit || '', demoType: types[query.get('type')] ? query.get('type') : ''};
    try {
      const response = await fetch('/api/enquiries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal:AbortSignal.timeout(20000)});
      const result = await response.json();
      if (!response.ok || !result.reference) throw new Error(response.status === 429 ? 'rate' : 'failed');
      completed = true;
      status.dataset.state = 'success';
      status.textContent = say('Consulta recibida. Referencia: ', 'Enquiry received. Reference: ') + result.reference + say('. Revisaremos los datos para contactarte. No necesitas volver a enviarla.', '. We will review your details and contact you. You do not need to send it again.');
      form.querySelectorAll('input,select,textarea').forEach(e => e.disabled = true);
      button.textContent = say('Consulta recibida ✓','Enquiry received ✓');
      status.focus();
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.message === 'rate' ? say('Has enviado varias consultas. Inténtalo en una hora o escríbenos por correo.', 'You have sent several enquiries. Try in an hour or contact us by email.') : say('No pudimos confirmar el envío. Conservamos lo que escribiste: vuelve a intentarlo o escribe a alvaroipazr@gmail.com.', 'We could not confirm delivery. Your entries are preserved: retry or email alvaroipazr@gmail.com.');
      button.disabled = false; status.focus();
    } finally { pending = false; form.removeAttribute('aria-busy'); }
  });
})();
