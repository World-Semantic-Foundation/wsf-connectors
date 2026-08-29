# wsf-connectors : WSF Connector Adapters

> **Federation and integration adapters for the World Semantic Foundation.**
>
> Implements ADR-WSF-25 (Integration Architecture) §4 (Connector Pattern).

## Overview

WSF Connectors provide the bridge between the WSF Semantic Engine and external semantic ecosystems. Per ADR-WSF-25, three connector patterns are supported:

- **Read connectors** : Ingest external semantic data into WSF
- **Write connectors** : Publish WSF concepts to external systems
- **Bidirectional connectors** : Two-way federation with peer WSF nodes

## Built-in Adapters

### OpenDEA Connector (`adapters/opendea/`)

Bidirectional connector for the OpenDEA (Open Digital Enterprise Architecture) ecosystem.

**Mappings** :
- OpenDEA Capability : wsf:Capability
- OpenDEA Assessment : wsf:Assertion
- OpenDEA Maturity Level : wsf:Measure
- OpenDEA Architecture Model : wsf:Concept

### Schema.org Connector (`adapters/schema-org/`)

Read connector for the Schema.org vocabulary.

**Mappings** :
- schema:Organization : wsf:Organisation
- schema:Person : wsf:Actor
- schema:Product : wsf:Resource
- schema:Service : wsf:Service
- schema:Event : wsf:Event
- schema:Place : wsf:Space

### SKOS Connector (`adapters/skos/`)

Bidirectional connector for SKOS (Simple Knowledge Organization System) vocabularies.

**Mappings** :
- skos:Concept : wsf:Concept
- skos:ConceptScheme : wsf:Namespace
- skos:prefLabel : wsf:preferred_name
- skos:altLabel : wsf:aliases
- skos:definition : wsf:definition
- skos:broader : wsf:specialises
- skos:narrower : wsf:generalises
- skos:related : wsf:relates

### TM Forum Connector (`adapters/tm-forum/`)

Read connector for TM Forum product catalog and business framework.

**Mappings** :
- tmf:Product : wsf:Resource
- tmf:Service : wsf:Service
- tmf:Customer : wsf:Actor
- tmf:Agreement : wsf:Rule
- tmf:Party : wsf:Actor
- tmf:Organization : wsf:Organisation

## Architecture

All connectors implement the ConnectorAdapter interface:

```typescript
interface ConnectorAdapter {
  id: string;
  name: string;
  version: string;
  authority: string;
  initialise(config: ConnectorConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
}
```

Plus direction-specific interfaces:
- `ReadConnector` : pullConcepts, pullAssertions, resolveExternal
- `WriteConnector` : pushConcept, pushAssertion, pushConcepts, removeConcept
- `BidirectionalConnector` : both, plus federate and sync

## Adapter Registry

Adapters are registered via `registerAdapter(id, factory)` and created via `createAdapter(id, config)`:

```typescript
import { createAdapter, listAdapters } from '@wsf/connectors';

console.log(listAdapters());
// ['opendea', 'schema-org', 'skos', 'tm-forum']

const opendea = await createAdapter('opendea', {
  endpoint: 'https://api.opendea.org/v1',
  auth: { type: 'api_key', api_key: process.env.OPENDEA_API_KEY! },
});
```

## Federation Patterns

Per ADR-WSF-25 §5, three federation architectures are supported:

1. **Hub-and-Spoke** : Central WSF hub with multiple external connectors
2. **Peer-to-Peer** : Direct federation between WSF nodes
3. **Hierarchical** : Layered federation with regional and global hubs

## Usage Example

```typescript
import { createAdapter } from '@wsf/connectors';
import { SemanticEngine } from '@wsf/semantic-engine';

const engine = new SemanticEngine();
await engine.initialise();

// Configure and start a Schema.org read connector
const schema = await createAdapter('schema-org', {
  endpoint: 'https://schema.org',
});
await schema.initialise({ endpoint: 'https://schema.org' });

// Ingest Schema.org types as WSF concepts
for await (const concept of schema.pullConcepts()) {
  await engine.services.concept.create(concept);
}
```

## Related Repositories

- [wsf-software/](../wsf-software/) : WSF Semantic Engine (consumer of connectors)
- [wsf/](../wsf/) : Core WSF concept vocabulary
- [wsf-governance/](../wsf-governance/) : ADRs including ADR-WSF-25

## Architectural References

- **ADR-WSF-25** : Integration Architecture (this implementation)

## License

Apache-2.0

---

*The WSF Connector Adapters. Status: Baseline.*