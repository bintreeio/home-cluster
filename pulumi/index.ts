import * as pulumi from "@pulumi/pulumi";

import { deployNixOsVm } from "./proxmox/VMs/deployNixOS";
import { deployDebianVM } from "./proxmox/VMs/deployDebianOS";
const network01 = deployDebianVM("network01", "pve01", {
    ipAddress: "172.16.32.11/24",
    gateway: "172.16.32.1",
    dnsServers: ["1.1.1.1", "9.9.9.9"],
    tags: ["dns"]
});


const network02 = deployDebianVM("network02", "pve02", {
     ipAddress: "172.16.32.12/24",
     gateway: "172.16.32.1",
     dnsServers: ["1.1.1.1", "9.9.9.9"],
     tags: ["dns"],
     protect: false

})
