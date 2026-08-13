import * as proxmox from "@pulumi/proxmox";
import { provider } from "../provider";
export const localStorage = new proxmox.StorageDirectory('local', {
    storageDirectoryId: 'local',
    path: '/var/lib/vz',
    contents: ['iso', 'vztmpl', 'backup', 'snippets', 'import'],
    shared: false,
}, {

    retainOnDelete: true,
    provider: provider,
    import: 'local' //resource already exists called local on proxmox
});