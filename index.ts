// Disabled until https://github.com/muhlba91/pulumi-proxmoxve/issues/967 is fixed
// (provider panics on Read/import of storage resources)
import './proxmox/storage/storage_config'
import * as pulumi from "@pulumi/pulumi";

// import * as bitwarden from "@pulumi/bitwarden";
//
// //const config = new pulumi.Config();
//
// const bw = new bitwarden.Provider("bw", {
//     server: "https://bitwarden.com",
//     accessToken: process.env.BW_ACCESS_TOKEN,
//     clientImplementation: "embedded"
// });
//
// const test = bitwarden.getSecretOutput(
//     {
//         id: "4826f8d7-3f2e-4516-80fe-b49f007548df"
//
//     },
//     {
//         provider: bw
//     }
// )
