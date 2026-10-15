---
title: AWS
description: What the AWS plugin reads, the permissions and event infrastructure it needs, how VPC Flow Logs arrive, and what it leaves out.
weight: 1
---

The AWS plugin is early, version 0.1.0. It is a regional EC2 source. It inventories EC2 instances, Elastic Network Interfaces (ENIs), and Security Groups, and it can take VPC Flow Logs straight from Amazon Data Firehose. It does not inventory VPCs, subnets, route tables, internet or NAT gateways, network ACLs, or IAM, and it has no remediation actions.

## Run it

With `AGENTSHIELD_DATABASE_URL` set as in [Run locally](../../getting-started/run-locally/):

```sh
AWS_PROFILE=example go run ./cmd/agentshield \
  --disable-kubernetes \
  --aws-region us-east-1 \
  --aws-events-queue-url https://sqs.us-east-1.amazonaws.com/111111111111/agentshield-aws-events
```

| Flag | Meaning |
| --- | --- |
| `--aws-region` | Turns the plugin on and fixes its region. The region is required. |
| `--aws-events-queue-url` | Optional. An SQS queue that receives CloudTrail events through EventBridge. |
| `--aws-firehose-stream-arn` | Optional. Turns on VPC Flow Log ingestion from this Firehose delivery stream. Also needs `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY`. |
| `--disable-kubernetes` | Leaves the Kubernetes plugins out. Without it, both run. |

The plugin uses the default AWS credential chain. At startup it calls STS `GetCallerIdentity` to bind the source to the authenticated account and partition. The source ID is `aws/<partition>/<caller-account>/<region>`. Credentials for another account create a new source ID, and the runtime cannot retire a removed source yet, so retire the old contribution yourself when you replace an account.

## Permissions

EC2 read access is required:

```json
{
  "Effect": "Allow",
  "Action": [
    "ec2:DescribeNetworkInterfaces",
    "ec2:DescribeInstances",
    "ec2:DescribeSecurityGroups"
  ],
  "Resource": "*"
}
```

With `--aws-events-queue-url`, the role also needs `sqs:ReceiveMessage` and `sqs:DeleteMessage` on that queue. `GetCallerIdentity` needs no explicit permission. The plugin never logs credentials or authorization material.

## What it reads and when

The plugin publishes three collections: `aws/ec2/<region>/network-interfaces`, `aws/ec2/<region>/instances`, and `aws/ec2/<region>/security-groups`.

At startup and every five minutes it paginates all three APIs completely before it publishes anything. Objects are normalized and content-digested so retries keep stable event IDs. Changed objects become upserts, and objects that are gone become deletes. The plugin then replaces its whole `inventory` contribution and marks the collections ready at the same generation.

A failure while paginating, decoding, validating identities, projecting, publishing, or marking readiness aborts the cycle, and the last coherent contribution stays in place. After a successful snapshot, the first failed poll publishes one degraded health transition, and a later success restores healthy status.

EC2 APIs are eventually consistent, so a poll can briefly miss a recent change. A later poll converges. The plugin adds no arbitrary delay before it deletes something.

## Faster change detection

Polling is the repair path. For prompt updates, send CloudTrail events to the plugin through EventBridge and SQS. You manage the SQS queue, its dead-letter queue, the CloudTrail trail, and the EventBridge rule. Send the original EventBridge event to SQS with no input transformer.

The rule pattern for the current inventory is:

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["ec2.amazonaws.com"],
    "eventName": [
      "AssignIpv6Addresses",
      "AssignPrivateIpAddresses",
      "AssociateSecurityGroupVpc",
      "AttachNetworkInterface",
      "AuthorizeSecurityGroupEgress",
      "AuthorizeSecurityGroupIngress",
      "CreateNetworkInterface",
      "CreateSecurityGroup",
      "DeleteNetworkInterface",
      "DeleteSecurityGroup",
      "DetachNetworkInterface",
      "DisassociateSecurityGroupVpc",
      "ModifyNetworkInterfaceAttribute",
      "ModifyInstanceAttribute",
      "ModifySecurityGroupRules",
      "RebootInstances",
      "ResetNetworkInterfaceAttribute",
      "RevokeSecurityGroupEgress",
      "RevokeSecurityGroupIngress",
      "RunInstances",
      "StartInstances",
      "StopInstances",
      "TerminateInstances",
      "UnassignIpv6Addresses",
      "UnassignPrivateIpAddresses",
      "UpdateSecurityGroupRuleDescriptionsEgress",
      "UpdateSecurityGroupRuleDescriptionsIngress"
    ]
  }
}
```

The queue policy must let `events.amazonaws.com` call `sqs:SendMessage`, restricted by the rule ARN. Give the source queue a redrive policy. A standard queue is enough, because every notification triggers a full read of current state and nothing depends on ordering or exactly-once delivery.

The queue must exist before the service starts, so changes during the first listing are kept. The plugin long-polls up to ten messages with a five-minute visibility timeout and deletes a batch only after the graph replacement and readiness publication succeed. A failed reconcile leaves the messages for redelivery. Valid failed API calls, events from another account or region, and unmatched event names are deleted without a reconcile. Malformed messages are not deleted and should move to the dead-letter queue.

CloudTrail covers API changes made in the caller account. A resource visible through a shared VPC can be changed by another account without an event in this queue, so the periodic reconcile stays authoritative for those changes.

## VPC Flow Logs

```text
VPC Flow Logs -> Amazon Data Firehose -> agentshield -> telemetry sink and rollup
```

No OpenTelemetry Collector is involved.

1. Create a Firehose delivery stream with Direct PUT as its source and a custom HTTPS destination at `https://<host>/v1/aws/firehose/vpc-flow-logs`. Firehose requires HTTPS on port 443. The service can sit behind a load balancer or authenticated gateway that exposes only this route.
2. Set the stream's access key in `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY` and start the service with the exact stream ARN, which must be a Firehose stream in the plugin's account and region:

   ```sh
   export AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY='<delivery-stream-access-key>'
   AWS_PROFILE=example go run ./cmd/agentshield \
     --disable-kubernetes \
     --aws-region us-east-1 \
     --aws-firehose-stream-arn arn:aws:firehose:us-east-1:111111111111:deliverystream/agentshield-vpc-flow-logs
   ```

3. Publish the VPC Flow Log directly to that stream with one-minute aggregation, traffic type `ALL`, and exactly this field order:

   ```text
   ${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags} ${type} ${pkt-srcaddr} ${pkt-dstaddr} ${region} ${az-id} ${flow-direction} ${traffic-path}
   ```

Every request must carry Firehose protocol version `1.0`, the configured stream ARN, the matching access key, and the same request ID in its header and body. The receiver accepts ordinary or gzip-compressed envelopes, decodes their base64 records, and sends normalized events through the shared telemetry pipeline. A response other than 200 asks Firehose to retry the batch.

The schema requires version 5, status `OK`, an ENI, a VPC, the configured region, IPv4 or IPv6 traffic, and an ingress or egress direction. `NODATA` and `SKIPDATA` records hold no flow and are acknowledged without an event. Any other malformed or unsupported record rejects the whole Firehose request, so it can be retried or written to the stream's S3 error backup.

| Event field | Value |
| --- | --- |
| `kind` | `network-flow` |
| `observedAt` | The end of the flow window |
| `operation` | `ingress` or `egress` |
| `outcome` | `allowed` for `ACCEPT`, `denied` for `REJECT` |
| `coverage` | `aws-vpc-flow-log` |
| `count` | The packet count |
| `properties` | Bounded protocol, source port, destination port, and optional traffic path |

The ENI uses the same account-qualified identity as inventory. The peer is a provider-neutral network destination scoped by partition, account, region, and VPC. Ingress runs from the peer to the ENI, and egress runs from the ENI to the peer. The event ID digests the source ID and the complete canonical record, including fields the rollup does not keep.

Two limits to plan around. The receiver acknowledges once the bounded in-process queue accepts the batch, not after the sink commits it, and the pipeline does not deduplicate retries by event ID. Set Firehose's retry duration and S3 error backup accordingly. Raw events reach your JSONL or ClickHouse sink either way, and a graph rollup that references a peer that is not in the graph stays unresolved.

## What goes in the graph

Resources use the scheme `aws.amazon.com/v1, Kind=Resource`. The authority is the 12-digit `OwnerId` of each resource, not the caller account, which keeps ENIs owned by other accounts and Security Groups shared through a VPC distinct. The keys are:

- `<partition>/ec2/<region>/network-interface/<eni-id>`
- `<partition>/ec2/<region>/instance/<instance-id>`
- `<partition>/ec2/<region>/security-group/<sg-id>`

An observed attachment becomes a relationship:

```text
network interface --governed-by--> security group
```

It is declared, bidirectional, partial network-access governance with unknown effect. AWS evaluates the union of every Security Group on an ENI, so one attachment does not prove restriction or effective enforcement. The relationship is projected only when the group appears in the same snapshot and its owner is known. Otherwise a bounded diagnostic stays on the ENI.

Every Security Group carries `aws-security-group-rules` facets keyed `ingress` and `egress`. A direction with rules is declared `allow`. An empty direction is declared `restrict`. Coverage stays partial, because the shared envelope cannot represent peer CIDRs, port ranges, prefix lists, Security Group unions, ICMP type and code, or stateful return traffic. The native attributes keep sorted CIDRs, prefix-list IDs, Security Group references, protocols, and port bounds. At most 100 rules per direction and 100 values per peer category are shown, with the omitted counts, while the configuration digest covers the whole direction. Only exact single-port TCP and UDP rules produce typed ports.

ENI private, public, and IPv6 addresses become network destinations with authoritative `exposes` bindings, so flow-log peers resolve to them. When the Kubernetes plugin runs in the same process, a Node's `spec.providerID` is resolved with the plugin's account and region, and the Node is `backed-by` the instance once that instance is inventoried.

The plugin never claims external exposure from a public address or a `0.0.0.0/0` or `::/0` rule. Defensible reachability also needs route tables, gateways, network ACLs, and resource state, which this source does not read.

## Limits

- Reconcile cost is linear in the regional ENI count, Security Group count, attachments, and rules, and both API result sets are buffered to keep a coherent publication boundary.
- VPC, subnet, and ENI attachment IDs are attributes, not resources.
- There are no remediation actions.
- Run `make test-aws-e2e` to exercise the plugin end to end against LocalStack in a disposable kind cluster. It uses synthetic CloudTrail-shaped events and injected Firehose envelopes, so it does not validate AWS-managed delivery.

For the full contract, see `docs/aws-plugin.md` in the [repository](https://github.com/solo-io/agentshield/tree/main/docs).
