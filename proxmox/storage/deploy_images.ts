import { Config } from "@pulumi/pulumi";
import { flatCarIso } from "./images/flatcar";
import { talosIso } from "./images/talos";
export interface ServerSpec {
    name: string;
    ip: string;

}

const config = new Config();
const servers = config.requireObject<ServerSpec[]>('pve-servers')

export const deployImages = () => {
    servers.forEach(server => {
            flatCarIso(server.name)
            talosIso(server.name)
        }
    )
}