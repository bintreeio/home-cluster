import * as pulumi from "@pulumi/pulumi";
import {ImageName, osImage} from "../storage/images/imageCatalog";
import * as proxmox from "@pulumi/proxmox";
import {provider} from "../provider";
import {pveNode} from "../../utils/checkpvehosts";

interface VmArgs {
    image?: ImageName;      // defaults to flatcar
    cores?: number;
    memoryMb?: number;
    osDiskSize?: number;
    dataDiskSize?: number;
    vlanId?: number;
    vmName?: string;
    ipAddress?: string;
    gateway?: string
    protect?: boolean;
    retainOnDelete?: boolean;
}

export function deploynixOS(hostName: string, pxeHostName: string, args: VmArgs = {}) : proxmox.VirtualEnvironmentVm {
    const node = pveNode(pxeHostName);
    return new proxmox.VirtualEnvironmentVm(hostName, {
            name: args.vmName ?? hostName,
            stopOnDestroy: true,
            nodeName: node.name, //pve01, pve02, pve03
            cpu: {
                cores: args.cores ?? 2,
                type: "host",
            },
            memory: { dedicated: args.memoryMb ?? 2048},
            disks: [
                { interface: "virtio0", datastoreId: "local-lvm", size: args.osDiskSize ?? 16, importFrom: osImage('debian', pxeHostName).id},
                { interface: "virtio1", datastoreId: "local-lvm", size: args.dataDiskSize ?? 20, },
            ],
            initialization: {
                datastoreId: "local-lvm",
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
            provider: provider,}
    );

}