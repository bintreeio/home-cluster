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
        fileName: 'flatcar_production_qemu_image_1_13_8.qcow2',
    },

} satisfies Record<string, ImageDef>;

export type ImageName = keyof typeof imageCatalog;   // "flatcar" | "talos"

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
        }, { provider, dependsOn: [localStorage], protect: true });
        cache.set(key, img);
    }
    return img;
}