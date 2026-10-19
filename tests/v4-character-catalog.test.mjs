import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_SCHEMA_VERSION,
  characterCatalog,
  characters,
  plannedCharacters,
  characterAvailableAtHouse,
  hasCharacterTag
} from '../supabase/functions/dorath-p1-v4/characters-data.js';
import * as engineV4 from '../supabase/functions/dorath-p1-v4/engine.js';

test('V4 mantém os personagens atuais e prepara sete novos sem ativá-los antes da homologação',()=>{
  assert.equal(CHARACTER_SCHEMA_VERSION,2);
  assert.equal(characters.length,18);
  assert.equal(plannedCharacters.length,7);
  assert.equal(characterCatalog.length,25);
  assert.deepEqual(
    plannedCharacters.map(c=>c.id).sort(),
    ['ada','esposa-cam','esposa-jafe','esposa-noe','esposa-sem','naama','zila'].sort()
  );
  assert.ok(plannedCharacters.every(c=>c.enabled===false));
  assert.ok(plannedCharacters.every(c=>characterAvailableAtHouse(c,54)===false));
});

test('gating narrativo aceita desbloqueio por casa ou por fase sem alterar o motor',()=>{
  const noe=characters.find(c=>c.id==='noe');
  assert.equal(characterAvailableAtHouse(noe,39),false);
  assert.equal(characterAvailableAtHouse(noe,40),true);

  const ada={...plannedCharacters.find(c=>c.id==='ada'),enabled:true};
  const esposaNoe={...plannedCharacters.find(c=>c.id==='esposa-noe'),enabled:true};
  assert.equal(characterAvailableAtHouse(ada,24),false);
  assert.equal(characterAvailableAtHouse(ada,25),true);
  assert.equal(characterAvailableAtHouse(esposaNoe,39),false);
  assert.equal(characterAvailableAtHouse(esposaNoe,40),true);
});

test('metadados familiares e relacionais ficam disponíveis para sinergias futuras',()=>{
  const zila=plannedCharacters.find(c=>c.id==='zila');
  const esposaSem=plannedCharacters.find(c=>c.id==='esposa-sem');
  assert.equal(hasCharacterTag(zila,'linhagem-caim'),true);
  assert.equal(hasCharacterTag(esposaSem,'familia-noe'),true);
  assert.ok(zila.relationships.some(r=>r.type==='mother'&&r.target==='naama'));
  assert.ok(esposaSem.relationships.some(r=>r.type==='spouse'&&r.target==='sem'));
});

test('engine V4 continua importável após extensão do catálogo',()=>{
  assert.equal(typeof engineV4.newPlayer,'function');
  assert.equal(typeof engineV4.applyAction,'function');
  assert.equal(typeof engineV4.publicView,'function');
});
