import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyLanguageRedirect as redirect} from '../lib/legacy-language.mjs';
test('old language links preserve enquiry context and fragments', () => {
  assert.equal(String(redirect('https://example.com/contacto/?lang=en&unit=203#form')), 'https://example.com/en/contacto/?unit=203#form');
  assert.equal(String(redirect('https://example.com/en/proyecto/?lang=es')), 'https://example.com/proyecto/');
  assert.equal(String(redirect('https://example.com/en/?lang=en')), 'https://example.com/en/');
  assert.equal(redirect('https://example.com/en/proyecto/'), null);
  assert.equal(redirect('https://example.com/?lang=fr'), null);
});
