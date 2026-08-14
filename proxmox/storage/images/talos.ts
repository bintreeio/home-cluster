import * as proxmox from "@pulumi/proxmox";
import { provider } from "../../provider";
import { localStorage } from "../storageConfig";

export function talosIso(serverName: string) {
    new proxmox.VirtualEnvironmentDownloadFile(`talos-iso-${serverName}`, {
        contentType: 'iso',
        datastoreId: 'local',
        nodeName: serverName,
        url:    "https://pxe.factory.talos.dev/image/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.13.8/metal-amd64.iso",
        fileName: 'talos-v1.10.x-metal-amd64.iso'

    }, {
        provider: provider,
        dependsOn: [localStorage]
    });
}
