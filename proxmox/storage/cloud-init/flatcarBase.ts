import { Config} from "@pulumi/pulumi";
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

export const ignitionFile = convertButaneToIginition(butaneYaml);

// Upload the rendered ignition JSON to the node as a snippet so VMs can
// reference it by file ID (requires the datastore to allow "Snippets" content)
export const ignitionSnippet = new proxmox.VirtualEnvironmentFile("flatcarBaseIgnition", {
    nodeName: "pve01",
    datastoreId: "local",
    contentType: "snippets",
    sourceRaw: {
        data: ignitionFile.rendered,
        fileName: "flatcar-base.ign",
    },
}, {
    //protect: true,
    //retainOnDelete: true,
    provider: provider,}
);

