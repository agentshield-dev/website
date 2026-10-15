---
title: Write a plugin
description: The runtime contract, the rules a plugin follows, a sample, and how to test one.
weight: 2
---

A plugin may provide source, semantic projection, and telemetry capabilities. Prefer shared provider connections and collections over duplicate watches. Plugins live in `plugins/` in the repository.

## Runtime contract

`Descriptor` declares the plugin's identity, version, description, consumed collections, published collections, and any authority-specific identity schemes it defines. Optional capability interfaces such as `ResourceRequirementsProvider` augment it. They do not replace its fields.

The runtime gives a plugin:

| Method | Use |
| --- | --- |
| `Publish` | Normalized observation changes |
| `MarkReady` | Source-cache readiness |
| `Subscribe` | Replay followed by live changes |
| `ReplaceContribution` | Atomic, complete graph output |
| `ContributionGeneration` | Durable, monotonic generation recovery |

Every managed plugin implements `PluginInstance` with a nonempty, stable source ID. The manager keys instances by plugin and source, validates collection dependencies within that source, and supplies a scoped runtime. Collection state, readiness, replay, and live delivery never cross source instances.

Only one plugin may publish a collection name, and every consumed collection needs a publisher. The manager checks both before anything starts.

## Rules

- **Projectors are pure.** Current objects in, graph input out, the same result whatever the order of the input.
- **Identity is authority plus an immutable key.** Names and addresses are attributes.
- **Every assertion names its source.** Plugin, source, rule ID, and evidence IDs.
- **Replace, never patch.** Publish the complete current output. What you omit is retracted.
- **Telemetry stays out of the graph.** Only bounded rollups with resolved endpoints are projected.
- **Security facts are typed.** Every security-relevant fact carries the `v1` security semantics envelope, or is documented as provider-native with a reason.

## Source plugins

1. Restore the durable contribution generation.
2. Build the provider cache from list and watch, a snapshot and feed, or polling.
3. Publish stable upsert and delete event IDs.
4. Mark the collection ready when the initial cache is coherent.
5. Run the pure projector over the current cache.
6. Replace the complete named contribution.
7. Persist a provider cursor separately, only when the provider exposes resumable progress.

## Semantic plugins

1. Subscribe to an existing collection.
2. Apply replay and live events to a local cache.
3. Wait for collection readiness.
4. Project complete semantic output.
5. Replace the semantic contribution independently.

A Kubernetes-backed semantic plugin implements `kubernetes.ResourceRequirementsProvider` and builds `kubernetes.ResourceClient[T]` values for the resource types it needs. The host collects those requirements before it builds the Kubernetes source, deduplicates watches by resource type, and opens one informer for each.

## A sample

This sketch declares one Kubernetes resource requirement and a descriptor.

```go
func New() (*Plugin, error) {
  foos, err := kubernetes.NewResourceClient(kubernetes.ResourceRequirement{
    GVR:        schema.GroupVersionResource{Group: "foo.example.io", Version: "v1", Resource: "foos"},
    Capability: "foo-v1",
  }, decodeFoo)
  if err != nil {
    return nil, err
  }
  return &Plugin{foos: foos}, nil
}

func (p *Plugin) KubernetesResources() []kubernetes.ResourceRequirement {
  return []kubernetes.ResourceRequirement{p.foos.Requirement()}
}

func (p *Plugin) Descriptor() discovery.Descriptor {
  return discovery.Descriptor{
    ID:          "foo",
    Version:     "1.0.0",
    Description: "Foo security semantics",
    Consumes:    []string{p.foos.Collection()},
    Publishes:   []string{"foo/projection"},
  }
}
```

## Telemetry

A plugin that understands a source-specific OTLP log format implements `discovery.TelemetryMappingProvider`. Each `telemetry.Mapping` binds one mapper to a trusted plugin ID and stable source ID.

The mapper receives a `telemetry.LogRecord`, a provider-neutral view of the OTLP resource, scope, attributes, body, timestamps, severity, trace ID, and span ID. `Match` should use a stable discriminator such as `service.name`, the scope name, or a routing attribute your collector adds. `Map` decodes the body and attributes into one or more `telemetry.Event` values with stable event IDs and complete, authority-qualified subject and object identities. Keep the direction from subject to object, whichever component observed the event.

When OTLP does not fit, a plugin can own a provider-native receiver instead, as the AWS plugin does for VPC Flow Logs delivered by Firehose. It has to authenticate the provider, validate the configured source independently of the payload, bound the envelope, and normalize into the same pipeline.

## Remediation

A plugin object may also implement `discovery.RemediationProvider` to advertise the actions it can perform. Plans, preparations, execution results, and verification must not be published through collections or graph contributions. See [Remediation](../../concepts/remediation/).

## Test it

```sh
go test -race ./path/to/plugin ./pkg/discovery ./pkg/state ./pkg/graph
go test ./...
make test-postgres
make eval-run
```

Run the evals for changes to the Kubernetes or Istio plugins. See [Evals](../../operations/evals/).

## Style

Organize a plugin package as `plugin.go`, `adapter.go`, `project.go`, `identity.go`, and `assertions.go`. Adapters own I/O and projectors stay pure. Build assertions with shared narrow constructors, keep rule ID constants next to them, and use a new rule ID when the semantics change. Encode deterministic attributes with `encoding/json`, bounded, sorted, and deduplicated. Write comments that explain provider semantics and safety boundaries, not narration.

The longer guides, `docs/plugin-development.md`, `docs/life-of-a-plugin.md`, and `docs/plugin-style-guide.md`, are in the [repository](https://github.com/solo-io/agentshield/tree/main/docs).
