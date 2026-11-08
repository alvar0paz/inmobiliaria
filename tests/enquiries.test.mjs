import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {validateEnquiry,saveEnquiry,ownerAllowed,escapeHTML,reference} from '../lib/enquiries.mjs';
const input = () => ({id:crypto.randomUUID(),name:'Prueba QA',email:'qa@example.com',company:'Test company',phone:'',project:'Test project',city:'Quito',message:'A local validation enquiry.',assets:'plans',source:'demo',language:'es',demoUnit:'702',demoType:'suite',consent:true});
function fixture() {
 const sqlite=new DatabaseSync(':memory:'); sqlite.exec(readFileSync(new URL('../drizzle/0000_keen_tempest.sql',import.meta.url),'utf8'));
 return {prepare(sql){return {bind(...values){return {async first(){return sqlite.prepare(sql).get(...values)},async run(){return sqlite.prepare(sql).run(...values)}}}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))},sqlite};
}
test('rejects missing consent, malformed identity, oversized input and invalid email',()=>{
 for(const patch of [{consent:false},{id:'not-an-id'},{email:'bad'},{name:'x'.repeat(101)},{message:'short'},{company:''}])assert.equal(validateEnquiry({...input(),...patch}),null);
 const r=validateEnquiry(input()); assert.equal(r.demoUnit,'702'); assert.equal(r.demoType,'suite');
});
test('persists a lead with consent and context, and retries do not duplicate it',async()=>{
 const db=fixture(),r=validateEnquiry(input());const a=await saveEnquiry(db,r,'test-ip'),b=await saveEnquiry(db,r,'test-ip');assert.equal(a.reference,b.reference);
 const rows=db.sqlite.prepare('SELECT * FROM enquiries').all(); assert.equal(rows.length,1);assert.equal(rows[0].demo_unit,'702');assert.equal(rows[0].email,'qa@example.com');assert.ok(rows[0].consent_at>0);db.sqlite.close();
});
test('limits repeated anonymous submissions while preserving existing reference retries',async()=>{
 const db=fixture(),rows=Array.from({length:6},()=>validateEnquiry(input()));for(let i=0;i<5;i++)assert.ok((await saveEnquiry(db,rows[i],'test-ip')).reference);
 assert.equal((await saveEnquiry(db,rows[5],'test-ip')).limited,true);assert.ok((await saveEnquiry(db,rows[0],'test-ip')).reference);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM enquiries').get().n,5);db.sqlite.close();
});
test('private inbox only admits authenticated owner; local preview exception is explicit',()=>{
 assert.equal(ownerAllowed(new Headers()),false);
 assert.equal(ownerAllowed(new Headers({'oai-authenticated-user-id':'other','oai-authenticated-user-email':'other@example.com'})),false);
 assert.equal(ownerAllowed(new Headers({'oai-authenticated-user-email':'alvarop3000@gmail.com'})),false);
 assert.equal(ownerAllowed(new Headers({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'alvarop3000@gmail.com'})),true);
 const h=new Headers({'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'});assert.equal(ownerAllowed(h),false);assert.equal(ownerAllowed(h,true),true);
 assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
test('references are short enough to read over the phone and stable for the same enquiry',()=>{
 const id='3f9a21c7-0b4e-4c2d-9a1e-5b6c7d8e9f00';
 assert.equal(reference(id),'ASL-3F9A-21C7');
 assert.equal(reference(id),reference(id.toUpperCase().toLowerCase()));
});
test('inbox owner can be configured without code changes',()=>{
 const h=new Headers({'oai-authenticated-user-id':'u1','oai-authenticated-user-email':'Ventas@Example.com'});
 assert.equal(ownerAllowed(h),false); assert.equal(ownerAllowed(h,false,'ventas@example.com'),true);
});
