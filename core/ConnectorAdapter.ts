/**
 * WSF Connector Adapter Interface
 *
 * Implements ADR-WSF-25 (Integration Architecture) §4 (Connector Pattern).
 * All adapters (read, write, bidirectional) MUST implement the
 * ConnectorAdapter interface.
 */

import type {
  Concept,
  Assertion,
  Relationship,
  CURIE,
  Namespace,
  IdentifierResolutionResult,
} from '../src/types/index.js';

// ============================================================================
// Connector Adapter Interface
// ============================================================================

/**
 * The base connector adapter interface.
 *
 * All connectors (OpenDEA, Schema.org, SKOS, TM Forum, etc.) MUST
 * implement this interface. Adapters MAY extend it with direction-specific
 * methods (read, write, bidirectional).
 */
export interface ConnectorAdapter {
  /** Adapter identifier (e.g., 'opendea', 'schema-org'). */
  readonly id: string;
  /** Adapter name (human-readable). */
  readonly name: string;
  /** Adapter version (semver). */
  readonly version: string;
  /** Source authority (e.g., 'OpenDEA Consortium'). */
  readonly authority: string;

  /**
   * Initialise the adapter with configuration.
   */
  initialise(config: ConnectorConfig): Promise<void>;

  /**
   * Health check; returns status and details.
   */
  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unavailable'; details: string }>;

  /**
   * Cleanup resources on shutdown.
   */
  shutdown(): Promise<void>;
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface ConnectorConfig {
  /** Endpoint URL or path. */
  endpoint: string;
  /** Authentication credentials. */
  auth?: ConnectorAuth;
  /** Polling interval (for read connectors) in milliseconds. */
  poll_interval_ms?: number;
  /** Maximum batch size for bulk operations. */
  batch_size?: number;
  /** Request timeout in milliseconds. */
  timeout_ms?: number;
}

export type ConnectorAuth =
  | { type: 'none' }
  | { type: 'api_key'; api_key: string }
  | { type: 'oauth2'; client_id: string; client_secret: string; token_url: string }
  | { type: 'basic'; username: string; password: string };

// ============================================================================
// Read Connector Interface
// ============================================================================

/**
 * Read connector: ingests external semantic data into WSF.
 *
 * Examples: OpenDEA assessments, Schema.org types, SKOS concept schemes,
 * TM Forum product catalog.
 */
export interface ReadConnector extends ConnectorAdapter {
  /**
   * Pull all concepts from the source system.
   * Returns a stream of Concept objects.
   */
  pullConcepts(): AsyncIterableIterator<Concept>;

  /**
   * Pull all assertions/relationships from the source.
   */
  pullAssertions(): AsyncIterableIterator<Assertion>;

  /**
   * Resolve an external identifier to a WSF concept.
   */
  resolveExternal(external_id: string): Promise<IdentifierResolutionResult>;

  /**
   * Subscribe to source changes (for real-time sync).
   */
  subscribe?(callback: (change: ExternalChange) => void): Promise<() => Promise<void>>;
}

export interface ExternalChange {
  type: 'created' | 'updated' | 'deleted';
  external_id: string;
  timestamp: string;
  data?: unknown;
}

// ============================================================================
// Write Connector Interface
// ============================================================================

/**
 * Write connector: publishes WSF concepts to external systems.
 *
 * Examples: Knowledge Graph platforms, Search indexes, Documentation
 * systems, Data Warehouses.
 */
export interface WriteConnector extends ConnectorAdapter {
  /**
   * Push a WSF concept to the target system.
   */
  pushConcept(concept: Concept): Promise<{ external_id: string }>;

  /**
   * Push a WSF assertion to the target system.
   */
  pushAssertion(assertion: Assertion): Promise<{ external_id: string }>;

  /**
   * Push a batch of concepts.
   */
  pushConcepts(concepts: Concept[]): Promise<{ external_ids: string[] }>;

  /**
   * Remove a concept from the target system.
   */
  removeConcept(semantic_id: CURIE): Promise<void>;
}

// ============================================================================
// Bidirectional Connector Interface
// ============================================================================

/**
 * Bidirectional connector: combines read and write for two-way sync.
 *
 * Examples: Federated WSF nodes, Active Ontology systems.
 */
export interface BidirectionalConnector extends ReadConnector, WriteConnector {
  /**
   * Establish a federation relationship with another WSF node.
   */
  federate(peer: FederationPeer): Promise<void>;

  /**
   * Synchronise state with the peer.
   */
  sync(): Promise<{ added: number; updated: number; removed: number }>;
}

export interface FederationPeer {
  /** Peer node identifier. */
  node_id: string;
  /** Peer endpoint URL. */
  endpoint: string;
  /** Authentication credentials for the peer. */
  auth?: ConnectorAuth;
  /** Bidirectional sync direction. */
  direction: 'incoming' | 'outgoing' | 'both';
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Create a connector adapter by ID.
 */
export type AdapterFactory = (config: ConnectorConfig) => Promise<ConnectorAdapter>;

export const ADAPTER_REGISTRY: Map<string, AdapterFactory> = new Map();

/**
 * Register an adapter factory.
 */
export function registerAdapter(id: string, factory: AdapterFactory): void {
  ADAPTER_REGISTRY.set(id, factory);
}

/**
 * Create a registered adapter by ID.
 */
export async function createAdapter(
  id: string,
  config: ConnectorConfig,
): Promise<ConnectorAdapter> {
  const factory = ADAPTER_REGISTRY.get(id);
  if (!factory) {
    throw new Error(`Adapter ${id} not registered`);
  }
  return factory(config);
}

/**
 * List all registered adapters.
 */
export function listAdapters(): string[] {
  return Array.from(ADAPTER_REGISTRY.keys());
}

// ============================================================================
// Namespace Mapping
// ============================================================================

/**
 * Maps an external namespace prefix to WSF namespace prefix.
 */
export interface NamespaceMapping {
  /** External prefix. */
  external_prefix: string;
  /** WSF prefix. */
  wsf_prefix: string;
  /** IRI pattern translation. */
  iri_translation?: (external_iri: string) => string;
}

export const DEFAULT_NAMESPACE_MAPPINGS: NamespaceMapping[] = [
  { external_prefix: 'opendea', wsf_prefix: 'wsf-opendea' },
  { external_prefix: 'schema', wsf_prefix: 'wsf-schema' },
  { external_prefix: 'skos', wsf_prefix: 'wsf-skos' },
  { external_prefix: 'tmforum', wsf_prefix: 'wsf-tmforum' },
];

export function mapExternalToWsf(external_curie: string): string {
  const [prefix, local] = external_curie.split(':');
  const mapping = DEFAULT_NAMESPACE_MAPPINGS.find(m => m.external_prefix === prefix);
  if (mapping) {
    return `${mapping.wsf_prefix}:${local}`;
  }
  return external_curie;
}