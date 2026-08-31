import * as pulumi from "@pulumi/pulumi";
import {ImageName, osImage} from "../storage/images/imageCatalog";
import * as proxmox from "@pulumi/proxmox";
import {provider} from "../provider";
import {pveNode} from "../../utils/checkpvehosts";
import * as command from "@pulumi/command";
import getSecret from "../../utils/bitwardenAuth";
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
    // Bitwarden secret id holding this host's /etc/ssh/ssh_host_ed25519_key.
    // Injected via nixos-anywhere --extra-files so the machine keeps the same
    // identity across reinstalls — sops-nix secrets decrypt on first boot.
    hostKeySecretId?: string;
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

    // getSecret returns the private key *contents*  so it can't be passed to -i directly — write it to a temp file at run time.
    const sshPrivateKey = pulumi.secret(getSecret("dff758be-6208-485f-89eb-b4a80052f57c"));

    // Stable machine identity: the SSH host key doubles as the sops-nix age
    // identity (ssh-to-age, pinned in nix/.sops.yaml), so it must survive
    // reinstalls. Empty when no hostKeySecretId is configured.
    const sshHostKey = args.hostKeySecretId
        ? pulumi.secret(getSecret(args.hostKeySecretId))
        : pulumi.output("");

    const install = new command.local.Command(`${hostName}-nixos-anywhere`, {
        dir: "nix",
        triggers: ["static-ip-v4"],
        environment: { NIXOS_ANYWHERE_SSH_KEY: sshPrivateKey, NIXOS_HOST_KEY: sshHostKey },
        // Without an explicit update script, pulumi-command re-runs `create` on
        // ANY input change — i.e. it REINSTALLS the machine. Do not change this line or you will have a bad time
        update: "true",
        create: pulumi.interpolate`
    set -eu
    keyfile=$(mktemp)
    extradir=$(mktemp -d)
    trap 'rm -f "$keyfile"; rm -rf "$extradir"' EXIT
    printf '%s\\n' "$NIXOS_ANYWHERE_SSH_KEY" > "$keyfile"
    chmod 600 "$keyfile"
    extra_files_flag=""
    if [ -n "$NIXOS_HOST_KEY" ]; then
      mkdir -p "$extradir/etc/ssh"
      printf '%s\\n' "$NIXOS_HOST_KEY" > "$extradir/etc/ssh/ssh_host_ed25519_key"
      chmod 600 "$extradir/etc/ssh/ssh_host_ed25519_key"
      ssh-keygen -y -f "$extradir/etc/ssh/ssh_host_ed25519_key" \
        > "$extradir/etc/ssh/ssh_host_ed25519_key.pub"
      extra_files_flag="--extra-files $extradir"
    fi
    until ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
      -i "$keyfile" root@${bareIp} true; do
      sleep 5
    done
    nix --extra-experimental-features 'nix-command flakes' run github:nix-community/nixos-anywhere -- \
      --flake .#${args.vmName ?? hostName} \
      --build-on remote \
      -i "$keyfile" \
      $extra_files_flag \
      root@${bareIp}
  `,
    }, { dependsOn: [vm], customTimeouts: { create: "30m" } });

    return { vm, install };
}
