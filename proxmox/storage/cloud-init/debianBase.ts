import * as proxmox from "@pulumi/proxmox";
import { Config } from "@pulumi/pulumi";
import { provider } from "../../provider";
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
        ssh_pwauth: false,
        disable_root: true,
        users: [{
            name: args.username ?? "vmuser",
            ssh_authorized_keys: args.sshKeys,
            lock_passwd: true,
            shell: "/bin/bash",
            sudo: "ALL=(ALL) NOPASSWD:ALL",
            groups: ["sudo"],
        }],
        packages: ["qemu-guest-agent"],
        runcmd: [
            "systemctl enable --now qemu-guest-agent",
        ],
    };
    return "#cloud-config\n" + yaml.stringify(doc);
}
export default function debianCloudInit(vmHostName: string, pveHostName : string) {
    const config = new Config();
    return new proxmox.VirtualEnvironmentFile(`${vmHostName}-debian-cloud-init`, {
            contentType: "snippets",
            datastoreId: "local",
            nodeName: pveHostName,
            sourceRaw: {
                fileName: `${vmHostName}-debian-cloud-base.yaml`,
                data: makeUserData({hostname: vmHostName, sshKeys: [config.require("vmusersshkey")]})
            }
        },
        { provider }
    )
}