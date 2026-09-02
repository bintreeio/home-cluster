import * as proxmox from "@pulumi/proxmox";
import { provider } from "../../provider";
import { localStorage } from "../storageConfig";


interface ImageDef {
    url: string;
    fileName: string;   // .qcow2 / .raw / .vmdk
}

const imageCatalog = {
    flatcar: {
        url: "https://stable.release.flatcar-linux.net/amd64-usr/current/flatcar_production_proxmoxve_image.img",
        fileName: "flatcar-3975.2.2.qcow2",
    },
    talos: {
        url: "https://pxe.factory.talos.dev/image/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.13.8/metal-amd64.iso",
        fileName: 'talos-v1.13.8-metal-amd64.iso',
    },
    debian: {
        url: "https://cloud.debian.org/images/cloud/trixie/20260831-2587/debian-13-generic-amd64-20260831-2587.qcow2",
        fileName: "debian-13-genericcloud-20260831.qcow2"
    }



} satisfies Record<string, ImageDef>;

export type ImageName = keyof typeof imageCatalog;   // "flatcar" | "talos | debian"

const cache = new Map<string, proxmox.DownloadFile>();

export function osImage(image: ImageName, nodeName: string): proxmox.DownloadFile {
    const key = `${image}/${nodeName}`;
    let img = cache.get(key);
    if (!img) {
        const def = imageCatalog[image];
        img = new proxmox.DownloadFile(`${image}-image-${nodeName}`, {
            contentType: "import",
            datastoreId: "local",
            nodeName: nodeName,
            url: def.url,
            fileName: def.fileName,
            overwrite: false,
        }, { provider, dependsOn: [localStorage], protect: false });
        cache.set(key, img);
    }
    return img;
}
