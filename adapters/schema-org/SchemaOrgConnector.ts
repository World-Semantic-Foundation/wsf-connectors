/**
 * Schema.org Connector Adapter
 *
 * Read connector for the Schema.org vocabulary per ADR-WSF-25 §4.
 *
 * Maps Schema.org types to WSF concepts:
 * - schema:Organization : wsf:Organisation
 * - schema:Person : wsf:Actor
 * - schema:Product : wsf:Resource
 * - schema:Service : wsf:Service
 * - schema:Event : wsf:Event
 * - schema:Place : wsf:Space
 */

import {
  registerAdapter,
  type ConnectorConfig,
  type ReadConnector,
  mapExternalToWsf,
} from '../../core/ConnectorAdapter.js';
import type {
  Concept,
  Assertion,
  CURIE,
  Namespace,
} from '../../../wsf-software/src/types/index.js';

const SCHEMA_ORG_MAPPINGS: Array<{ schema: string; wsf: string; tier: string }> = [
  { schema: 'Organization', wsf: 'Organisation', tier: 'Tier 3' },
  { schema: 'Person', wsf: 'Actor', tier: 'Tier 3' },
  { schema: 'Product', wsf: 'Resource', tier: 'Tier 3' },
  { schema: 'Service', wsf: 'Service', tier: 'Tier 3' },
  { schema: 'Event', wsf: 'Event', tier: 'Tier 1' },
  { schema: 'Place', wsf: 'Space', tier: 'Tier 1' },
  { schema: 'Action', wsf: 'Activity', tier: 'Tier 3' },
  { schema: 'Intangible', wsf: 'Concept', tier: 'Tier 1' },
  { schema: 'Thing', wsf: 'Entity', tier: 'Tier 1' },
  { schema: 'CreativeWork', wsf: 'Resource', tier: 'Tier 3' },
];

const SCHEMA_ORG_NAMESPACE: Namespace = {
  prefix: 'schema',
  iri: 'https://schema.org/',
  authority: 'Schema.org Community',
  status: 'Normative',
  registered_at: new Date().toISOString(),
};

export class SchemaOrgConnector implements ReadConnector {
  readonly id = 'schema-org';
  readonly name = 'Schema.org Connector';
  readonly version = '0.1.0';
  readonly authority = 'Schema.org Community';

  private config: ConnectorConfig | null = null;
  private initialised = false;

  async initialise(config: ConnectorConfig): Promise<void> {
    this.config = config;
    this.initialised = true;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unavailable'; details: string }> {
    if (!this.initialised) {
      return { status: 'unavailable', details: 'Schema.org connector not initialised' };
    }
    return { status: 'healthy', details: `Schema.org ${this.version} ready` };
  }

  async shutdown(): Promise<void> {
    this.initialised = false;
  }

  async *pullConcepts(): AsyncIterableIterator<Concept> {
    for (const mapping of SCHEMA_ORG_MAPPINGS) {
      const concept: Concept = {
        semantic_id: `wsf-schema:${mapping.wsf}` as CURIE,
        preferred_name: mapping.wsf,
        tier: mapping.tier as 'Tier 1' | 'Tier 2' | 'Tier 3',
        definition: `Schema.org type '${mapping.schema}' mapped to WSF concept '${mapping.wsf}'.`,
        authority: 'WSF',
        status: 'Normative',
        version: '1.0.0',
        aliases: [`schema:${mapping.schema}`],
        related_concepts: [`schema:${mapping.schema}` as CURIE],
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
    return {
      curie: external_id,
      resolved_to: mapExternalToWsf(external_id),
      confidence: 1.0,
      strategy: 'exact',
    };
  }
}

registerAdapter('schema-org', async (config) => {
  const connector = new SchemaOrgConnector();
  await connector.initialise(config);
  return connector;
});

export { SchemaOrgConnector, SCHEMA_ORG_NAMESPACE, SCHEMA_ORG_MAPPINGS };