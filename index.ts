import * as pulumi from "@pulumi/pulumi";

import { deployNixOsVm } from "./proxmox/VMs/deployNixOS";
import { deployDebianVM } from "./proxmox/VMs/deployDebianOS";
const network01 = deployNixOsVm("network01", "pve01", {
    ipAddress: "172.16.32.11/24",
    gateway: "172.16.32.1",
    vlanId: 10,
    hostKeySecretId: "f14f7d47-f5e6-429e-b27d-b4b10039a3b7", // network01_ssh_host_key
});

const network02 = deployNixOsVm("network02", "pve02", {
    ipAddress: "172.16.32.12/24",
    gateway: "172.16.32.1",
    vlanId: 10,
    hostKeySecretId: "ab10019c-6764-4b93-adc1-b4b10039a43d", // network02_ssh_host_key
});

// const test = deployDebianVM("test", "pve01", {
//     ipAddress: "172.16.32.14/24",
//     gateway: "172.16.32.1",
// });
//
// const test2 = deployDebianVM("test2", "pve01", {
//     ipAddress: "172.16.32.15/24",
//     gateway: "172.16.32.1",
// });