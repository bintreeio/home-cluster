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
        privateKey: getSecret("4826f8d7-3f2e-4516-80fe-b49f007548df"),
    },
});

