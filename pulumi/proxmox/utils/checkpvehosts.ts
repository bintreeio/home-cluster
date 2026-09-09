import * as pulumi from "@pulumi/pulumi";

interface PveServer {
    name: string;
    ip: string;
}

const cfg = new pulumi.Config("home-cluster");
const pveServers = cfg.requireObject<PveServer[]>("pve-servers");

/** Resolve a node name, failing fast if it's not a configured server */
export function pveNode(name: string): PveServer {
    const server = pveServers.find(s => s.name === name);
    if (!server) {
        throw new Error(
            `Unknown PVE node "${name}". Valid nodes: ${pveServers.map(s => s.name).join(", ")}`
        );
    }
    return server;
}