import * as proxmox from "@pulumi/proxmox";
import {VirtualEnvironmentVm} from "@pulumi/proxmox/bin/virtualEnvironmentVm";
import {type} from "node:os";
import {ignitionSnippet} from "../storage/cloud-init/flatcarBase";
import {network} from "@muhlba91/pulumi-proxmoxve";
import {provider} from "../provider";
import { flatCarIso} from "../storage/images/flatcar";

const flatcarPve01 = flatCarIso("pve01")
export const testVm = new proxmox.VirtualEnvironmentVm("networkTest", {
    stopOnDestroy: true,
        nodeName: "pve01",
        cpu: {
            cores: 2,
            type: "host",
        },
        memory: { dedicated: 8192},
        disks: [
            { interface: "virtio0", datastoreId: "local-lvm", size: 16, importFrom: flatcarPve01.id},
            { interface: "virtio1", datastoreId: "local-lvm", size: 100 },
        ],
        initialization: {
            datastoreId: "local-lvm",
            userDataFileId: ignitionSnippet.id,
        },

    networkDevices: [{
        bridge: "vmbr0",
        vlanId: 10,
    }],


}, {
    //protect: true,
    //retainOnDelete: true,
    provider: provider,}
);
