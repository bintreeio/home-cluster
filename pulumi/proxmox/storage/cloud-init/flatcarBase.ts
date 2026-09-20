import { Config } from "@pulumi/pulumi";
import * as ct from "@pulumi/ct";
import * as proxmox from "@pulumi/proxmox";
import * as yaml from "js-yaml";
import { provider } from "../../provider";
import { nasStorage } from "../storageConfig";
import { primaryPveNode } from "../../utils/checkpvehosts";

const config = new Config();
const pubKey = config.require("flatcar_ssh_key");

const butaneYaml = yaml.dump({
    variant: "flatcar",
    version: "1.1.0",
    passwd: {
        users: [
            {
                name: "core",
                ssh_authorized_keys: [pubKey]
            }
        ]
    },
    storage: {
        disks: [
            {
                device: "/dev/vdb",
                wipe_table: false,
                partitions: [
                    {
                        label: "appdata",
                        number: 1
                    }
                ]
            }
        ],
        filesystems: [
            {
                device: "/dev/disk/by-partlabel/appdata",
                format: "ext4",
                label: "appdata",
                wipe_filesystem: false,
                with_mount_unit: true,
                path: "/var/lib/appdata"
            }
        ]
    }
});

function convertButaneToIginition(butaneConfig: string) {
    const ignitionFile = ct.getConfigOutput({
        content: butaneConfig,
        strict: true
    });
    return ignitionFile;
}

const ignitionFile = convertButaneToIginition(butaneYaml);

let snippet: proxmox.VirtualEnvironmentFile | undefined;

/** One shared ignition snippet on the NAS datastore, uploaded once via the primary
 *  node and usable by VMs on any node. The node argument is accepted for call-site
 *  compatibility but no longer affects where the file lives. */
export function ignitionSnippetBase(_nodeName?: string): proxmox.VirtualEnvironmentFile {
    if (!snippet) {
        snippet = new proxmox.VirtualEnvironmentFile(
            "flatcarBaseIgnition",
            {
                nodeName: primaryPveNode,
                datastoreId: "nas",
                contentType: "snippets",
                sourceRaw: {
                    data: ignitionFile.rendered,
                    fileName: "flatcar-base.ign"
                }
            },
            { provider, dependsOn: [nasStorage] }
        );
    }
    return snippet;
}
