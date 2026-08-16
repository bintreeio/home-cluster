import * as proxmox from '@pulumi/proxmox';
import { Config } from '@pulumi/pulumi';
import getSecret from "../utils/bitwardenAuth";
const config = new Config();
export const provider = new proxmox.Provider('proxmox', {
    endpoint: config.requireSecret('pve01'),
    apiToken: getSecret("7b6570b3-e875-40aa-8f08-b4a50026c948"),
    insecure: true,
    ssh: {
        username: "root",
        privateKey: getSecret("a18f757f-3c06-4890-94de-b49f005ea23a")
    }

});

