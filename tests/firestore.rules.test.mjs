import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import 'firebase/compat/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-smartmonitor',
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

after(async () => {
  await environment?.cleanup();
});

test('Firestore denies reads and writes from unauthenticated clients', async () => {
  const database = environment.unauthenticatedContext().firestore();
  const reference = database.doc('users/test-user');

  await assertFails(reference.get());
  await assertFails(reference.set({ email: 'test@example.com' }));
});

test('Firestore denies reads and writes from authenticated clients', async () => {
  const database = environment.authenticatedContext('test-user').firestore();
  const reference = database.doc('users/test-user');

  await assertFails(reference.get());
  await assertFails(reference.set({ email: 'test@example.com' }));
});

test('privileged backend access bypasses Firestore Security Rules', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const reference = context.firestore().doc('users/backend-test');
    await assertSucceeds(reference.set({ email: 'backend@example.com' }));
    const result = await assertSucceeds(reference.get());
    assert.equal(result.data()?.email, 'backend@example.com');
  });
});
