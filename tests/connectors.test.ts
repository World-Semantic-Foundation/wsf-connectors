/**
 * WSF Connector Adapter Tests
 *
 * Covers the adapter registry, namespace mapping, and the four built-in
 * adapters (OpenDEA, Schema.org, SKOS, TM Forum) per ADR-WSF-25.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTER_REGISTRY,
  createAdapter,
  listAdapters,
  mapExternalToWsf,
  DEFAULT_NAMESPACE_MAPPINGS,
  type ConnectorAdapter,
  type ConnectorConfig,
} from '../core/ConnectorAdapter.js';
// Importing the adapter modules registers their factories.
import '../adapters/opendea/OpenDEAConnector.js';
import '../adapters/schema-org/SchemaOrgConnector.js';
import '../adapters/skos/SKOSConnector.js';
import type { Concept } from '@wsf/semantic-engine';
import '../adapters/tm-forum/TMForumConnector.js';

const base_config: ConnectorConfig = { endpoint: 'https://example.test/' };

async function collect<T>(iter: AsyncIterableIterator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

describe('Adapter registry', () => {
  test('registers all four built-in adapters', () => {
    const ids = listAdapters();
    assert.ok(ids.includes('opendea'), 'opendea registered');
    assert.ok(ids.includes('schema-org'), 'schema-org registered');
    assert.ok(ids.includes('skos'), 'skos registered');
    assert.ok(ids.includes('tm-forum'), 'tm-forum registered');
    assert.equal(ids.length, 4);
  });

  test('createAdapter throws for an unknown adapter id', async () => {
    await assert.rejects(() => createAdapter('does-not-exist', base_config), /not registered/);
  });

  test('createAdapter resolves the registry entry', async () => {
    const adapter = await createAdapter('opendea', base_config);
    assert.equal(adapter.id, 'opendea');
  });
});

describe('Namespace mapping (mapExternalToWsf)', () => {
  test('maps the four external prefixes to WSF namespaces', () => {
    assert.equal(mapExternalToWsf('opendea:Capability'), 'wsf-opendea:Capability');
    assert.equal(mapExternalToWsf('schema:Organization'), 'wsf-schema:Organization');
    assert.equal(mapExternalToWsf('skos:Concept'), 'wsf-skos:Concept');
    assert.equal(mapExternalToWsf('tmforum:Product'), 'wsf-tmforum:Product');
  });

  test('passes unknown prefixes through unchanged', () => {
    assert.equal(mapExternalToWsf('dcterms:creator'), 'dcterms:creator');
  });

  test('default mappings cover all built-in external namespaces', () => {
    const prefixes = DEFAULT_NAMESPACE_MAPPINGS.map(m => m.external_prefix);
    assert.deepEqual(prefixes.sort(), ['opendea', 'schema', 'skos', 'tmforum']);
  });
});

describe('Built-in adapters', () => {
  const cases: Array<{ id: string; name_fragment: string; authority_fragment: string }> = [
    { id: 'opendea', name_fragment: 'OpenDEA', authority_fragment: 'OpenDEA' },
    { id: 'schema-org', name_fragment: 'Schema.org', authority_fragment: 'Schema.org' },
    { id: 'skos', name_fragment: 'SKOS', authority_fragment: 'W3C' },
    { id: 'tm-forum', name_fragment: 'TM Forum', authority_fragment: 'TM Forum' },
  ];

  for (const c of cases) {
    test(`${c.id} adapter: initialise, identity, health, shutdown`, async () => {
      const adapter = await createAdapter(c.id, base_config);
      assert.equal(adapter.id, c.id);
      assert.ok(adapter.name.includes(c.name_fragment), `name contains ${c.name_fragment}`);
      assert.ok(adapter.authority.includes(c.authority_fragment), 'authority declared');
      assert.match(adapter.version, /^\d+\.\d+\.\d+$/, 'version is semver');
      const health = await adapter.healthCheck();
      assert.ok(['healthy', 'degraded', 'unavailable'].includes(health.status), 'health status typed');
      assert.ok(health.details.length > 0, 'health carries details');
      await adapter.shutdown();
    });
  }
});

describe('Read connectors (pull + resolve)', () => {
  test('schema-org yields concepts with known mappings', async () => {
    const adapter = (await createAdapter('schema-org', base_config)) as any;
    const concepts = await collect(adapter.pullConcepts() as AsyncIterableIterator<Concept>);
    const expected_targets = ['Organisation', 'Actor', 'Service', 'Event'];
    assert.ok(concepts.length >= 5, 'schema.org yields a batch of concepts');
    for (const target of expected_targets) {
      assert.ok(
        concepts.some(k => k.preferred_name === target),
        `schema.org covers the WSF target '${target}'`,
      );
    }
    assert.ok(
      concepts.some(k => (k.aliases ?? []).includes('schema:Organization')),
      'schema:Organization alias preserved on the mapped Organisation concept',
    );
    const resolution = await adapter.resolveExternal('schema:Organization');
    assert.equal(resolution.resolved_to, 'wsf-schema:Organization');
    assert.equal(resolution.confidence, 1.0);
  });

  test('tm-forum resolves exact mappings with full confidence', async () => {
    const adapter = (await createAdapter('tm-forum', base_config)) as any;
    const resolution = await adapter.resolveExternal('Service');
    assert.equal(resolution.strategy, 'exact');
    assert.equal(resolution.confidence, 1.0);
  });

  test('opendea resolves external ids through the namespace mapping', async () => {
    const adapter = (await createAdapter('opendea', base_config)) as any;
    const resolution = await adapter.resolveExternal('opendea:Capability');
    assert.equal(resolution.resolved_to, 'wsf-opendea:Capability');
    assert.equal(resolution.confidence, 1.0);
  });

  test('opendea push translates wsf: ids to opendea: ids', async () => {
    const adapter = (await createAdapter('opendea', base_config)) as any;
    const push = await adapter.pushConcept({
      semantic_id: 'wsf:Capability' as any,
    } as any);
    assert.equal(push.external_id, 'opendea:Capability');
  });
});
