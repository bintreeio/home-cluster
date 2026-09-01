import * as pulumi from "@pulumi/pulumi";
import {ImageName, osImage} from "../storage/images/imageCatalog";
import * as proxmox from "@pulumi/proxmox";
import {provider} from "../provider";
import {pveNode} from "../../utils/checkpvehosts";
import debianCloudInit from "../storage/cloud-init/debianBase";
import {Config} from "@pulumi/pulumi";

interface VmArgs {
    image?: ImageName;
    cores?: number;
    memoryMb?: number;
    osDiskSize?: number;
    dataDiskSize?: number;
    vlanId?: number;
    vmName?: string;
    ipAddress?: string;
    gateway?: string
    userDataFileId?: pulumi.Input<string>;
    protect?: boolean;
    retainOnDelete?: boolean;
    extraIgnoreChanges?: boolean[];
    replicateDisk?: boolean;

}




export function deployDebianVM(hostName: string, pxeHostName: string, args: VmArgs = {}) : proxmox.VirtualEnvironmentVm {
    const node = pveNode(pxeHostName);
    const vm = new proxmox.VirtualEnvironmentVm(hostName, {
        name: args.vmName ?? hostName,
        stopOnDestroy: true,
        bios: "ovmf",                       // UEFI, matches systemd-boot + disko ESP
        machine: "q35",
        bootOrders: ["scsi0"],
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
        memory: { dedicated: args.memoryMb ?? 2048},
        disks: [
            { interface: "scsi0", datastoreId: "local-lvm", size: args.osDiskSize ?? 20,
                importFrom: osImage('debian', pxeHostName).id,
                replicate: args.replicateDisk ?? false
            }
        ],
        initialization: {
            datastoreId: "local-lvm",
            // scsi, not the default ide2: on q35 the ide2 cdrom lands on the AHCI
            // bus, and the debian cloud kernel has no CONFIG_SATA_AHCI driver,
            // so cloud-init never sees its datasource
            interface: "scsi1",
            userDataFileId: debianCloudInit(args.vmName ?? hostName, node.name).id,
            ipConfigs: [
                {
                    ipv4: args.ipAddress
                        ? { address: args.ipAddress, gateway: args.gateway }
                        : { address: "dhcp" },
                },
            ],
        },

        networkDevices: [{
            bridge: "vmbr0",
            vlanId: args.vlanId ?? 10,
        }],


    }, {
        protect: args.protect ?? false,
        retainOnDelete: args.retainOnDelete ?? false,
        /** If true (default), Proxmox HA/migration owns VM placement and
         *  Pulumi won't try to move it back. Set false to have Pulumi
         *  strictly enforce nodeName. */
        ignoreChanges:  (args.extraIgnoreChanges ?? true) ? [pxeHostName] : [],
        provider: provider,
    });

    return vm;
}