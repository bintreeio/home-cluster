import * as pulumi from "@pulumi/pulumi";
import { deployFlatCarVM } from "./proxmox/VMs/deployFlatCar";
import { deploynixOS } from "./proxmox/VMs/deploynixOS";

// const networkVm01 = deployFlatCarVM("networkvm01", "pve01", {
//     ipAddress: "172.16.32.11/24",
//     gateway: "172.16.32.1",
//     vlanId: 10,
// });
//
// const networkVm02 = deployFlatCarVM("networkvm02", "pve02", {
//     ipAddress: "172.16.32.12/24",
//     gateway: "172.16.32.1",
//     vlanId: 10,
// });

const test1 = deploynixOS("network1", "pve02")