import * as pulumi from "@pulumi/pulumi";
import {ImageName, osImage} from "../storage/images/imageCatalog";
import * as proxmox from "@pulumi/proxmox";
import {provider} from "../provider";
import {pveNode} from "../../utils/checkpvehosts";
import * as command from "@pulumi/command";

interface VmArgs {
    image?: ImageName;      // defaults to flatcar
    cores?: number;
    memoryMb?: number;
    osDiskSize?: number;
    dataDiskSize?: number;
    vlanId?: number;
    vmName?: string;
    ipAddress: string;
    gateway: string
    userDataFileId?: pulumi.Input<string>;
    protect?: boolean;
    retainOnDelete?: boolean;
}

interface NixOsVmDeployment {
    vm: proxmox.VirtualEnvironmentVm;
    install: command.local.Command;
}

const cfg = new pulumi.Config();

export function deployNixOsVm(hostName: string, pxeHostName: string, args: VmArgs) : NixOsVmDeployment {
    const node = pveNode(pxeHostName);
    const vm = new proxmox.VirtualEnvironmentVm(hostName, {
            name: args.vmName ?? hostName,
            stopOnDestroy: true,
            bios: "ovmf",                       // UEFI, matches systemd-boot + disko ESP
            machine: "q35",
            bootOrders: ["virtio0"],
            // preEnrolledKeys=false: MS secure-boot keys would reject unsigned systemd-boot
            efiDisk: { datastoreId: "local-lvm", type: "4m", preEnrolledKeys: false },
            // serial console works around the debian-12 genericcloud + OVMF + resized-disk
            // first-boot kernel panic (proxmox forum #160125, bpg provider issue #1639)
            serialDevices: [{ device: "socket" }],
            nodeName: node.name, //pve01, pve02, pve03
            cpu: {
                cores: args.cores ?? 2,
                type: "host",
            },
            // debian genericcloud ships no qemu-guest-agent; enabled=true makes the
            // provider block on VM create waiting for an agent that never starts
            agent: { enabled: false },
            // nixos-anywhere's kexec installer keeps the nix store in tmpfs; <4G OOMs with --build-on remote
            memory: { dedicated: args.memoryMb ?? 4096},
            disks: [
                { interface: "virtio0", datastoreId: "local-lvm", size: args.osDiskSize ?? 16, importFrom: osImage('debian', pxeHostName).id},
            ],
            initialization: {
                datastoreId: "local-lvm",
                // ide2 cloud-init drive isn't up early enough under OVMF; scsi avoids that
                interface: "scsi0",
                ipConfigs: [
                    {
                        ipv4: args.ipAddress
                            ? { address: args.ipAddress, gateway: args.gateway }
                            : { address: "dhcp" },
                    },
                ],
                userAccount: {
                    username: "root",
                    keys: [cfg.require("flatcar_ssh_key")],
                },
            },

            networkDevices: [{
                bridge: "vmbr0",
                vlanId: args.vlanId ?? 10,
            }],


        }, {
            protect: args.protect ?? false,
            retainOnDelete: args.retainOnDelete ?? false,
            provider: provider,}
    );

    const bareIp = args.ipAddress.split("/")[0];

    // Private key path matching the flatcar_ssh_key public key — ssh/nixos-anywhere -i need the private key
    const sshPrivateKey = cfg.require("nixos_ssh_private_key");

    const install = new command.local.Command(`${hostName}-nixos-anywhere`, {
        dir: "nix",
        triggers: ["static-ip-v4"],
        create: pulumi.interpolate`
    until ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
      -i ${sshPrivateKey} root@${bareIp} true; do
      sleep 5
    done
    nix --extra-experimental-features 'nix-command flakes' run github:nix-community/nixos-anywhere -- \
      --flake .#${args.vmName ?? hostName} \
      --build-on remote \
      -i ${sshPrivateKey} \
      root@${bareIp}
  `,
    }, { dependsOn: [vm], customTimeouts: { create: "30m" } });

    return { vm, install };
}
