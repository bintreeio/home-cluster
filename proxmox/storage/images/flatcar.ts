import * as proxmox from "@pulumi/proxmox";
import { provider } from "../../provider";
import { localStorage } from "../storageConfig";

export function flatCarIso(serverName: string) {
    return new proxmox.DownloadFile(`flatcar-iso-${serverName}`, {
        contentType: 'import',
        datastoreId: 'local',
        nodeName: serverName,
        url:    "https://stable.release.flatcar-linux.net/amd64-usr/current/flatcar_production_proxmoxve_image.img",
        fileName: 'flatcar_production_qemu_image.qcow2',

    }, {
        provider: provider,
        dependsOn: [localStorage],
        deleteBeforeReplace: true
    });
}

