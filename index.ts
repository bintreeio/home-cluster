import * as pulumi from "@pulumi/pulumi";

import { deployNixOsVm } from "./proxmox/VMs/deployNixOS";


const network01 = deployNixOsVm("network01", "pve01", {
    ipAddress: "172.16.32.11/24",
    gateway: "172.16.32.1",
    vlanId: 10,
});

const network02 = deployNixOsVm("network02", "pve02", {
    ipAddress: "172.16.32.12/24",
    gateway: "172.16.32.1",
    vlanId: 10,
});