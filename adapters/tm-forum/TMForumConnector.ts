/**
 * TM Forum Connector Adapter
 *
 * Read connector for TM Forum (TeleManagement Forum) product catalog and
 * business framework per ADR-WSF-25 §4.
 *
 * Maps TM Forum entities to WSF concepts:
 * - tmf:Product : wsf:Resource
 * - tmf:Service : wsf:Service
 * - tmf:Customer : wsf:Actor
 * - tmf:Agreement : wsf:Rule
 * - tmf:Party : wsf:Actor
 * - tmf:Organization : wsf:Organisation
 */

import {
  registerAdapter,
  type ConnectorConfig,
  type ReadConnector,
} from '../../core/ConnectorAdapter.js';
import type {
  Concept,
  Assertion,
  CURIE,
  Namespace,
} from '../../../wsf-software/src/types/index.js';

const TM_FORUM_MAPPINGS: Array<{ tmf: string; wsf: string; tier: string }> = [
  { tmf: 'Product', wsf: 'Resource', tier: 'Tier 3' },
  { tmf: 'Service', wsf: 'Service', tier: 'Tier 3' },
  { tmf: 'Customer', wsf: 'Actor', tier: 'Tier 3' },
  { tmf: 'Agreement', wsf: 'Rule', tier: 'Tier 3' },
  { tmf: 'Party', wsf: 'Actor', tier: 'Tier 3' },
  { tmf: 'Organization', wsf: 'Organisation', tier: 'Tier 3' },
  { tmf: 'Place', wsf: 'Space', tier: 'Tier 1' },
  { tmf: 'TimePeriod', wsf: 'Validity', tier: 'Tier 2' },
  { tmf: 'Characteristic', wsf: 'Measure', tier: 'Tier 3' },
  { tmf: 'Policy', wsf: 'Policy', tier: 'Tier 3' },
  { tmf: 'Goal', wsf: 'Goal', tier: 'Tier 3' },
  { tmf: 'Process', wsf: 'Process', tier: 'Tier 3' },
];

const TM_FORUM_NAMESPACE: Namespace = {
  prefix: 'tmforum',
  iri: 'https://www.tmforum.org/ns/',
  authority: 'TM Forum',
  status: 'Normative',
  registered_at: new Date().toISOString(),
};

export class TMForumConnector implements ReadConnector {
  readonly id = 'tm-forum';
  readonly name = 'TM Forum Connector';
  readonly version = '0.1.0';
  readonly authority = 'TM Forum';

  private config: ConnectorConfig | null = null;
  private initialised = false;

  async initialise(config: ConnectorConfig): Promise<void> {
    this.config = config;
    this.initialised = true;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unavailable'; details: string }> {
    if (!this.initialised) {
      return { status: 'unavailable', details: 'TM Forum connector not initialised' };
    }
    return { status: 'healthy', details: `TM Forum ${this.version} ready` };
  }

  async shutdown(): Promise<void> {
    this.initialised = false;
  }

  async *pullConcepts(): AsyncIterableIterator<Concept> {
    for (const mapping of TM_FORUM_MAPPINGS) {
      const concept: Concept = {
        semantic_id: `wsf-tmforum:${mapping.wsf}` as CURIE,
        preferred_name: mapping.wsf,
        tier: mapping.tier as 'Tier 1' | 'Tier 2' | 'Tier 3',
        definition: `TM Forum entity '${mapping.tmf}' mapped to WSF concept '${mapping.wsf}'.`,
        authority: 'WSF',
        status: 'Normative',
        version: '1.0.0',
        aliases: [`tmforum:${mapping.tmf}`],
        related_concepts: [`tmforum:${mapping.tmf}` as CURIE],
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };
      yield concept;
    }
  }

  async *pullAssertions(): AsyncIterableIterator<Assertion> {
    yield* [];
  }

  async resolveExternal(external_id: string): Promise<any> {
    return { curie: external_id, confidence: 1.0, strategy: 'exact' };
  }
}

registerAdapter('tm-forum', async (config) => {
  const connector = new TMForumConnector();
  await connector.initialise(config);
  return connector;
});

export { TMForumConnector, TM_FORUM_NAMESPACE, TM_FORUM_MAPPINGS };