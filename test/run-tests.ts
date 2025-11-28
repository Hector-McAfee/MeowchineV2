import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { normalize, safeIconName, bossIconPath, ensureDir, fileFromBuffer } from '../src/util.ts';
import { save, load } from '../src/state/store.ts';
import { canonBossName, suggestSubmitDropsForBoss, computeChestRemainingForUser } from '../src/autocomplete/data.ts';

async function run() {
  let failed = 0;

  try {
    // normalize
    const in1 = '  Telos,  the Warden—';
    const exp1 = 'telos, the warden-';
    const got1 = normalize(in1);
    assert.strictEqual(got1, exp1, `normalize() expected ${exp1} but got ${got1}`);
    console.log('PASS normalize basic');
  } catch (err) {
    failed++; console.error('FAIL normalize', err);
  }

  try {
    // safeIconName
    const s = 'Telos, the Warden';
    const expectSafe = 'telos_the_warden';
    const gotSafe = safeIconName(s);
    assert.strictEqual(gotSafe, expectSafe, `safeIconName() expected ${expectSafe} but got ${gotSafe}`);
    console.log('PASS safeIconName');
  } catch (err) {
    failed++; console.error('FAIL safeIconName', err);
  }

  try {
    // bossIconPath should return a path string (file may or may not exist depending on assets)
    const p = bossIconPath('Telos, the Warden');
    assert.ok(typeof p === 'string' && p.endsWith('.png'), 'bossIconPath should return a .png path');
    console.log('PASS bossIconPath returns .png path');
  } catch (err) {
    failed++; console.error('FAIL bossIconPath', err);
  }

  try {
    // ensureDir creates a directory if missing
    const tmp = path.resolve(process.cwd(), 'tmp_test_dir_for_tests');
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
    ensureDir(tmp);
    assert.ok(fs.existsSync(tmp), 'ensureDir should create the directory');
    // cleanup
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('PASS ensureDir');
  } catch (err) {
    failed++; console.error('FAIL ensureDir', err);
  }

  try {
    // fileFromBuffer returns an Attachment-like object
    const buf = Buffer.from('hello world');
    const att = fileFromBuffer(buf, 'hello.txt');
    assert.ok(att && typeof att === 'object', 'fileFromBuffer should return an object');
    console.log('PASS fileFromBuffer');
  } catch (err) {
    failed++; console.error('FAIL fileFromBuffer', err);
  }

  // --- store/load tests ---
  const guildId = 'test-guild-1';
  const dataDir = path.resolve(process.cwd(), 'data');
  const filePath = path.join(dataDir, `${guildId}.json`);
  try {
    const state = {
      active: true,
      started: true,
      options: { boardSize: '3x3', dailyUpdates: false, chestVerify: false, allowPlayersCheckTeams: false, trackFirstLine: false, trackPlayerStats: false },
      teamToChannel: {},
      channelToTeam: {},
      tiles: {
        "1": { boss: 'Telos, the Warden', drops: { 'Vial': 1, 'Spike': 2 } },
        "2": { boss: 'Legiones', drops: { 'Shard': 1 } }
      },
      progress: {},
      pending: {},
      chestVerifiedUsers: {},
      placements: [],
      stats: [],
      channels: {}
    } as any;

    await save(guildId, state);
    const loaded = await load(guildId);
    assert.strictEqual(loaded.active, true, 'loaded.state.active should be true');
    assert.ok(loaded.tiles && loaded.tiles["1"], 'tile 1 should exist in loaded state');
    console.log('PASS store save/load');
  } catch (err) {
    failed++; console.error('FAIL store save/load', err);
  }

  // --- autocomplete helpers tests (use the saved guild state) ---
  try {
    // canonBossName basic
    const canon = canonBossName("ed1 something", { forChest: true });
    assert.strictEqual(canon, 'ED', 'canonBossName should collapse ED1->ED when forChest');
    console.log('PASS canonBossName forChest collapse');
  } catch (err) {
    failed++; console.error('FAIL canonBossName', err);
  }

  try {
    // suggestSubmitDropsForBoss should return drops assigned to Telos
    const fakeInteraction: any = {
      guildId,
      options: {
        getString: (k: string) => (k === 'boss' ? 'Telos, the Warden' : undefined),
        getFocused: () => ({ name: 'drop', value: '' })
      }
    };

    const drops = await suggestSubmitDropsForBoss(fakeInteraction as any);
    // expect at least 'Vial' and 'Spike'
    const names = drops.map((c: any) => c.value);
    assert.ok(names.includes('Vial') && names.includes('Spike'), `expected drops to include Vial and Spike, got ${names}`);
    console.log('PASS suggestSubmitDropsForBoss returns board drops');
  } catch (err) {
    failed++; console.error('FAIL suggestSubmitDropsForBoss', err);
  }

  try {
    // computeChestRemainingForUser with no required bosses should return []
    const remaining = await computeChestRemainingForUser(guildId, 'some-user');
    assert.ok(Array.isArray(remaining), 'computeChestRemainingForUser should return an array');
    console.log('PASS computeChestRemainingForUser basic');
  } catch (err) {
    failed++; console.error('FAIL computeChestRemainingForUser', err);
  }

  // cleanup test guild file
  try {
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
  } catch (e) {
    // ignore
  }

  if (failed > 0) {
    console.error(`${failed} tests failed`);
    process.exit(1);
  }

  console.log('All tests passed');
  process.exit(0);
}

run();
