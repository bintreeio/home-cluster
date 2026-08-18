import * as proxmox from "@pulumi/proxmox";
import { provider } from "../../provider";
import { localStorage } from "../storageConfig";


const cache = new Map<string, proxmox.DownloadFile>();

export function flatCarIso(serverName: string): proxmox.DownloadFile {
    let img : proxmox.DownloadFile | undefined = cache.get(serverName)
    if (!img) {

        img = new proxmox.DownloadFile(`flatcar-iso-${serverName}`, {
            contentType: 'import',
            datastoreId: 'local',
            nodeName: serverName,
            url: "https://stable.release.flatcar-linux.net/amd64-usr/current/flatcar_production_proxmoxve_image.img",
            fileName: 'flatcar_production_qemu_image.qcow2',

        }, {
            provider: provider,
            dependsOn: [localStorage],
            deleteBeforeReplace: true,
            protect: true
        });
        cache.set(serverName, img);
    }

    return img
}

