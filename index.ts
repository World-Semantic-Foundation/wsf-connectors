/**
 * WSF Connector : Index
 *
 * Exports all built-in connector adapters and the core adapter interface.
 *
 * Per ADR-WSF-25 §4 (Connector Pattern), all connectors (read, write,
 * bidirectional) implement the ConnectorAdapter interface.
 */

// Core interface
export * from './core/ConnectorAdapter.js';

// Built-in adapters
import './adapters/opendea/OpenDEAConnector.js';
import './adapters/schema-org/SchemaOrgConnector.js';
import './adapters/skos/SKOSConnector.js';
import './adapters/tm-forum/TMForumConnector.js';

export { OpenDEAConnector, OPENDEA_NAMESPACE } from './adapters/opendea/OpenDEAConnector.js';
export { SchemaOrgConnector, SCHEMA_ORG_NAMESPACE, SCHEMA_ORG_MAPPINGS } from './adapters/schema-org/SchemaOrgConnector.js';
export { SKOSConnector, SKOS_NAMESPACE } from './adapters/skos/SKOSConnector.js';
export { TMForumConnector, TM_FORUM_NAMESPACE, TM_FORUM_MAPPINGS } from './adapters/tm-forum/TMForumConnector.js';

// Adapter registry
import { ADAPTER_REGISTRY, listAdapters } from './core/ConnectorAdapter.js';
export { ADAPTER_REGISTRY, listAdapters };