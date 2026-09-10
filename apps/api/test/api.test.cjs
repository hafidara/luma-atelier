const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createApp } = require('../dist/app');
const { StorageService } = require('../dist/storage/storage.service');

test('Luma API contract and persistence', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'luma-api-test-'));
  process.env.DATA_DIR = directory;
  let app;
  let base;
  async function start() {
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  }
  async function request(path, body) {
    const response = await fetch(`${base}/api/${path}`, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  const valid = { productId: 'luma', email: ' test@example.com ', colour: 'sage', quantity: 2 };
  try {
    await start();
    await t.test('seed product and exactly two pages of three orders', async () => {
      const product = await request('products');
      assert.equal(product.status, 200);
      assert.equal(product.body[0].priceCents, 4900);
      const first = await request('orders');
      assert.deepEqual(first.body.items.map(order => order.id), [1006, 1005, 1004]);
      assert.equal(first.body.total, 6);
      assert.equal(first.body.page, 1);
      assert.equal(first.body.pageSize, 3);
      const second = await request('orders?page=2&pageSize=99');
      assert.deepEqual(second.body.items.map(order => order.id), [1003, 1002, 1001]);
      assert.deepEqual((await request('orders?page=3')).body.items, []);
    });
    await t.test('reject malformed pages', async () => {
      for (const page of ['', '0', '-1', '1.5', 'abc', '1e2', '01', '9007199254740992', '1&page=2']) {
        const result = await request(`orders?page=${page}`);
        assert.equal(result.status, 400, page);
        assert.equal(typeof result.body.error, 'string');
      }
    });
    await t.test('reject invalid orders without persisting them', async () => {
      for (const change of [
        { email: 'invalid' }, { email: ' ' }, { email: 12 },
        { quantity: 0 }, { quantity: 6 }, { quantity: 1.5 }, { quantity: '2' },
        { quantity: null }, { productId: 'unknown' }, { colour: 'blue' },
      ]) {
        const result = await request('orders', { ...valid, ...change });
        assert.equal(result.status, 400, JSON.stringify(change));
        assert.deepEqual(Object.keys(result.body), ['error']);
      }
      assert.equal((await request('orders')).body.total, 6);
    });
    await t.test('trim email, ignore client prices, calculate total and persist before success', async () => {
      const result = await request('orders', { ...valid, unitPriceCents: 1, totalCents: 1 });
      assert.equal(result.status, 201);
      assert.equal(result.body.id, 1007);
      assert.equal(result.body.email, 'test@example.com');
      assert.equal(result.body.unitPriceCents, 4900);
      assert.equal(result.body.totalCents, 9800);
      assert.ok(Number.isFinite(Date.parse(result.body.createdAt)));
      const saved = JSON.parse(await readFile(join(directory, 'orders.json'), 'utf8'));
      assert.deepEqual(saved.find(order => order.id === 1007), result.body);
      assert.equal((await request('orders')).body.items[0].id, 1007);
    });
    await t.test('overlapping submissions retain every order with unique IDs; repeated emails allowed', async () => {
      const results = await Promise.all(Array.from({ length: 12 }, () => request('orders', valid)));
      assert.ok(results.every(result => result.status === 201));
      assert.equal(new Set(results.map(result => result.body.id)).size, 12);
      const saved = JSON.parse(await readFile(join(directory, 'orders.json'), 'utf8'));
      assert.equal(saved.length, 19);
      assert.equal(new Set(saved.map(order => order.id)).size, 19);
    });
    await t.test('restart preserves data and starts IDs above the persisted maximum', async () => {
      await app.close();
      await start();
      assert.equal((await request('orders')).body.total, 19);
      assert.equal((await request('orders', valid)).body.id, 1020);
    });
    await t.test('equal timestamps sort by numeric ID descending', async () => {
      const path = join(directory, 'orders.json');
      const saved = JSON.parse(await readFile(path, 'utf8'));
      await writeFile(path, JSON.stringify(saved.map(order => ({ ...order, createdAt: '2026-01-01T00:00:00.000Z' }))));
      assert.deepEqual((await request('orders')).body.items.map(order => order.id), [1020, 1019, 1018]);
    });
    await t.test('storage errors return safe errors, preserve file and allow recovery', async () => {
      const path = join(directory, 'orders.json');
      const saved = await readFile(path, 'utf8');
      await writeFile(path, 'invalid json');
      const result = await request('orders', valid);
      assert.equal(result.status, 500);
      assert.deepEqual(Object.keys(result.body), ['error']);
      assert.equal(await readFile(path, 'utf8'), 'invalid json');
      await writeFile(path, saved);
      assert.equal((await request('orders', valid)).status, 201);
    });
    await t.test('failed atomic publication preserves original and queue recovers', async () => {
      const storage = app.get(StorageService);
      const saved = await readFile(join(directory, 'orders.json'), 'utf8');
      await assert.rejects(storage.updateOrders(current => {
        const circular = [...current];
        circular.push(circular);
        return { orders: circular, result: null };
      }));
      assert.equal(await readFile(join(directory, 'orders.json'), 'utf8'), saved);
      assert.equal((await request('orders', valid)).status, 201);
    });
  } finally {
    if (app) await app.close();
    delete process.env.DATA_DIR;
    await rm(directory, { recursive: true, force: true });
  }
});
