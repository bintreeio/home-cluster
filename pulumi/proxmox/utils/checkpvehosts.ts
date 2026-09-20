import * as pulumi from "@pulumi/pulumi";

interface PveServer {
    name: string;
    ip: string;
}

const cfg = new pulumi.Config("home-cluster");
const pveServers = cfg.requireObject<PveServer[]>("pve-servers");

/** All configured PVE node names, e.g. ["pve01", "pve02", "pve03"]. */
export const pveNodeNames: string[] = pveServers.map((s) => s.name);

/** Node used for cluster-wide uploads (shared storage is visible from every node,
 *  but the provider still needs one node to upload through). rotate if primary node crashes */
export const primaryPveNode: string = pveServers[0].name;

/** Resolve a node name, failing fast if it's not a configured server */
export function pveNode(name: string): PveServer {
    const server = pveServers.find((s) => s.name === name);
    if (!server) {
        throw new Error(
            `Unknown PVE node "${name}". Valid nodes: ${pveServers.map((s) => s.name).join(", ")}`
        );
    }
    return server;
}
