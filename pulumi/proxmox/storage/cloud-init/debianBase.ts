import * as proxmox from "@pulumi/proxmox";
import { Config } from "@pulumi/pulumi";
import { provider } from "../../provider";
import { nasStorage } from "../storageConfig";
import * as yaml from "yaml";
interface CloudInitArgs {
    hostname: string;
    domain?: string;
    username?: string;
    sshKeys: string[];
}

function makeUserData(args: CloudInitArgs): string {
    const doc = {
        hostname: args.hostname,
        fqdn: `${args.hostname}.${args.domain ?? "home.bintree.io"}`,
        preserve_hostname: false,
        locale: "en_US.UTF-8",
        ssh_pwauth: false,
        disable_root: true,
        users: [
            {
                name: args.username ?? "vmuser",
                ssh_authorized_keys: args.sshKeys,
                lock_passwd: true,
                shell: "/bin/bash",
                sudo: "ALL=(ALL) NOPASSWD:ALL",
                groups: ["sudo"]
            }
        ],
        packages: ["qemu-guest-agent"],
        runcmd: ["systemctl enable --now qemu-guest-agent"]
    };
    return "#cloud-config\n" + yaml.stringify(doc);
}
export default function debianCloudInit(vmHostName: string, pveHostName: string) {
    const config = new Config();
    return new proxmox.VirtualEnvironmentFile(
        `${vmHostName}-debian-cloud-init`,
        {
            contentType: "snippets",
            datastoreId: "nas",
            // shared storage: upload via one node, readable from all
            nodeName: pveHostName,
            sourceRaw: {
                fileName: `${vmHostName}-debian-cloud-base.yaml`,
                data: makeUserData({
                    hostname: vmHostName,
                    sshKeys: [config.require("vmusersshkey")]
                })
            }
        },
        // retainOnDelete: existing VMs keep referencing their original snippet path
        // (ignoreChanges on userDataFileId), so never delete the file under them.
        { provider, dependsOn: [nasStorage], retainOnDelete: true }
    );
}
