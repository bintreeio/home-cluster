import * as proxmox from "@pulumi/proxmox";
import { Config } from "@pulumi/pulumi";
import { provider } from "../provider";
import { pveNodeNames } from "../utils/checkpvehosts";

const cfg = new Config("home-cluster");
export const localStorage = new proxmox.StorageDirectory(
    "local",
    {
        storageDirectoryId: "local",
        path: "/var/lib/vz",
        contents: ["iso", "vztmpl", "backup", "snippets", "import"],
        shared: false
    },
    {
        retainOnDelete: true,
        provider: provider,
        import: "local" //resource already exists called local on proxmox
    }
);

/** Shared NFS datastore on the NAS. One copy of every snippet / image / ISO, visible
 *  from all nodes. PVE creates fixed subdirs under the export: snippets/,
 *  template/iso/, import/. The dataset + NFS share are created by hand in TrueNAS
 *  (see README). VM disks stay on local-lvm. */
export const nasStorage = new proxmox.StorageNfs(
    "nas",
    {
        storageNfsId: "nas",
        server: cfg.requireSecret("nas-server"),
        export: cfg.requireSecret("nas-export"),
        contents: ["snippets", "import", "iso"],
        nodes: pveNodeNames,
        options: "vers=4",
        createSubdirs: true
    },
    { provider, retainOnDelete: true }
);
