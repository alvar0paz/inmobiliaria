import { env } from 'cloudflare:workers';
import { validateEnquiry, saveEnquiry } from '../../../lib/enquiries.mjs';
const json = (body: object, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'origin'},403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'format'},415);
  if (Number(request.headers.get('content-length')) > 16000) return json({error:'size'},413);
  let input;
  try {
    const reader = request.body?.getReader(); if (!reader) return json({error:'body'},400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const {done,value} = await reader.read(); if (done) break; bytes += value.length; if (bytes > 16000) {await reader.cancel(); return json({error:'size'},413);} chunks.push(value); }
    const buffer = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) {buffer.set(chunk,offset); offset += chunk.length;}
    input = JSON.parse(new TextDecoder().decode(buffer));
  } catch {return json({error:'invalid'},400);}
  if (input?.website) return json({error:'invalid'},400);
  const row = validateEnquiry(input); if (!row) return json({error:'validation'},400);
  if (!env.DB) return json({error:'unavailable'},503);
  try {
    const result = await saveEnquiry(env.DB, row, request.headers.get('cf-connecting-ip') || row.email);
    if (result.limited) return json({error:'rate'},429);
    return json(result,201);
  } catch {return json({error:'unavailable'},503);}
}
