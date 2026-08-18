import { Config } from "@pulumi/pulumi";
import * as ct from "@pulumi/ct";
import * as proxmox from "@pulumi/proxmox";
import * as yaml from "js-yaml"
import { provider } from "../../provider";

const config = new Config();
const pubKey = config.require("flatcar_ssh_key");

const butaneYaml = yaml.dump({
    variant: "flatcar",
    version: "1.1.0",
    passwd: {
        users: [
            {
                name: "core",
                ssh_authorized_keys: [pubKey],
            },
        ],
    },
    storage: {
        disks: [
            {
                device: "/dev/vdb",
                wipe_table: false,
                partitions: [
                    {
                        label: "appdata",
                        number: 1,
                    },
                ],
            },
        ],
        filesystems: [
            {
                device: "/dev/disk/by-partlabel/appdata",
                format: "ext4",
                label: "appdata",
                wipe_filesystem: false,
                with_mount_unit: true,
                path: "/var/lib/appdata",
            },
        ],
    },
});

function convertButaneToIginition(butaneConfig: string) {
    const ignitionFile = ct.getConfigOutput({
        content: butaneConfig,
        strict: true,
    });
    return ignitionFile
}

const ignitionFile = convertButaneToIginition(butaneYaml);


const cache = new Map<string, proxmox.VirtualEnvironmentFile>();

export function ignitionSnippetBase(nodeName: string): proxmox.VirtualEnvironmentFile {
    let snippet = cache.get(nodeName);
    if (!snippet) {
        snippet = new proxmox.VirtualEnvironmentFile(`flatcarBaseIgnition-${nodeName}`, {
            nodeName: nodeName,
            datastoreId: "local",
            contentType: "snippets",
            sourceRaw: {
                data: ignitionFile.rendered,
                fileName: "flatcar-base.ign",
            },
        }, {
            //protect: true,
            //retainOnDelete: true,
            provider: provider,
        });
        cache.set(nodeName, snippet);
    }
    return snippet;
}

