// Privacy notice for the enquiry form (Ecuador's Ley Orgánica de Protección de Datos Personales).
// Keep it in step with lib/enquiries.mjs: what the form stores, the rate-limit hash and its expiry.
import { t } from '../lib/html.mjs';

const UPDATED = ['8 de noviembre de 2026', '8 November 2026'];

const SECTIONS = [
  ['Quién responde por tus datos', 'Who is responsible for your data',
    'tnkoo Software Lab, estudio dirigido por Alvaro Paz en Quito, Ecuador. Contacto: <a href="mailto:info@tnkoo.com">info@tnkoo.com</a>.',
    'tnkoo Software Lab, a studio led by Alvaro Paz in Quito, Ecuador. Contact: <a href="mailto:info@tnkoo.com">info@tnkoo.com</a>.'],
  ['Qué datos recogemos', 'What we collect',
    'Solo lo que escribes en el formulario de contacto: nombre, correo, empresa, teléfono (opcional), proyecto, ciudad, materiales disponibles y tu mensaje. Si llegas desde la demo, también la unidad de ejemplo que elegiste. Guardamos el idioma, la página de origen y la fecha en que diste tu consentimiento.',
    'Only what you type into the contact form: name, email, company, phone (optional), project, city, available assets and your message. If you arrive from the demo, also the sample unit you chose. We store the language, the page you came from and the date you gave consent.'],
  ['Para qué los usamos', 'Why we use it',
    'Para responder tu consulta y preparar una propuesta. No enviamos publicidad, no vendemos ni cedemos tus datos y no los usamos para otros fines. La base legal es tu consentimiento, que puedes retirar cuando quieras.',
    'To answer your enquiry and prepare a proposal. We do not send marketing, sell or share your data, or use it for anything else. The legal basis is your consent, which you can withdraw at any time.'],
  ['Protección contra abusos', 'Abuse protection',
    'Para limitar envíos repetidos guardamos una huella irreversible (hash) de tu dirección IP combinada con la hora. No guardamos la IP en sí y esa huella caduca a las dos horas.',
    'To limit repeated submissions we store an irreversible fingerprint (hash) of your IP address combined with the hour. We do not store the IP itself, and the fingerprint expires after two hours.'],
  ['Dónde se guardan y por cuánto tiempo', 'Where it is stored and for how long',
    'El sitio y su base de datos funcionan sobre la infraestructura de Cloudflare, por lo que tus datos pueden tratarse fuera de Ecuador. Conservamos cada consulta hasta 24 meses desde el último contacto, salvo que pidas eliminarla antes o que se convierta en un contrato.',
    'The site and its database run on Cloudflare infrastructure, so your data may be processed outside Ecuador. We keep each enquiry for up to 24 months after the last contact, unless you ask us to delete it sooner or it becomes a contract.'],
  ['Cookies y medición', 'Cookies and analytics',
    'Este sitio no usa cookies, herramientas de analítica ni píxeles publicitarios. Las tipografías se sirven desde nuestro propio dominio.',
    'This site uses no cookies, analytics tools or advertising pixels. Fonts are served from our own domain.'],
  ['Tus derechos', 'Your rights',
    'Puedes pedir acceso, rectificación, actualización, eliminación, oposición, portabilidad o suspensión del tratamiento de tus datos escribiendo a <a href="mailto:info@tnkoo.com">info@tnkoo.com</a>. Si no quedas conforme con nuestra respuesta, puedes acudir a la Superintendencia de Protección de Datos Personales.',
    'You can ask for access, correction, updating, deletion, objection, portability or suspension of processing by emailing <a href="mailto:info@tnkoo.com">info@tnkoo.com</a>. If you are not satisfied with our reply, you can contact Ecuador’s Superintendencia de Protección de Datos Personales.'],
];

export function privacyBody() {
  const sections = SECTIONS.map(([h, hEn, p, pEn]) => `<section>${t(h, hEn, 'h2')}${t(p, pEn, 'p')}</section>`).join('');
  return `<main id="main" class="text-page privacy-page"><span class="eyebrow">${t('PRIVACIDAD', 'PRIVACY')}</span><h1>${t('Tus datos,<br><em>solo para responderte.</em>', 'Your data,<br><em>only to answer you.</em>')}</h1>${sections}<p class="small">${t('Última actualización: ' + UPDATED[0], 'Last updated: ' + UPDATED[1])}</p></main>`;
}

export function notFoundBody() {
  return `<main id="main" class="text-page not-found"><span class="eyebrow">404</span><h1>${t('Esta página<br><em>no existe.</em>', 'This page<br><em>does not exist.</em>')}</h1><p>${t('Puede que el enlace haya cambiado. Sigue desde el inicio o entra directo a la demo.', 'The link may have changed. Start from the home page or go straight to the demo.')}</p><div class="hero-actions"><a class="button" href="/">${t('Ir al inicio', 'Go to the home page')} ↗</a><a class="text-button" href="/proyecto/">${t('Explorar la demo', 'Explore the demo')} →</a></div></main>`;
}
