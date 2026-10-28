const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = {name:100,email:254,company:160,phone:40,project:160,city:100,message:3000};
export function validateEnquiry(input) {
  if (!input || typeof input !== 'object' || !uuid.test(input.id || '') || input.consent !== true) return null;
  const row = {id:input.id.toLowerCase()};
  for (const [key,max] of Object.entries(fields)) {
    if (typeof input[key] !== 'string' || input[key].length > max) return null;
    row[key] = input[key].trim();
    if (key !== 'phone' && !row[key]) return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.message.length < 10) return null;
  row.email = row.email.toLowerCase();
  row.assets = ['unsure','models','plans','renders'].includes(input.assets) ? input.assets : 'unsure';
  row.source = ['demo','proforma','contact'].includes(input.source) ? input.source : 'contact';
  row.language = input.language === 'en' ? 'en' : 'es';
  row.demoUnit = /^\d{3,4}$/.test(input.demoUnit || '') ? input.demoUnit : '';
  row.demoType = ['estudio','suite','depa2','depa3'].includes(input.demoType) ? input.demoType : '';
  return row;
}
export const reference = id => 'ASL-' + id;
export function ownerAllowed(headers, localPreview = false) {
  const id = headers.get('oai-authenticated-user-id');
  const email = (headers.get('oai-authenticated-user-email') || '').toLowerCase();
  return Boolean(id && (email === 'alvarop3000@gmail.com' || (localPreview && id === 'local_seedy' && email === 'seedy@sites.test')));
}
export function escapeHTML(value) {return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export async function saveEnquiry(db, row, rateIdentity) {
  const old = await db.prepare('SELECT id FROM enquiries WHERE id = ?').bind(row.id).first();
  if (old) return {reference:reference(row.id)};
  const now = Date.now(), hour = Math.floor(now / 3600000);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rateIdentity + ':' + hour));
  const key = Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
  const limit = await db.prepare('INSERT INTO enquiry_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits = hits + 1 RETURNING hits').bind(key,(hour+2)*3600000).first();
  if (limit.hits > 5) return {limited:true};
  await db.batch([
    db.prepare('INSERT INTO enquiries (id,created_at,name,email,company,phone,project,city,assets,message,source,language,demo_unit,demo_type,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(row.id,now,row.name,row.email,row.company,row.phone,row.project,row.city,row.assets,row.message,row.source,row.language,row.demoUnit,row.demoType,now),
    db.prepare('DELETE FROM enquiry_limits WHERE expires_at < ?').bind(now),
  ]);
  return {reference:reference(row.id)};
}
