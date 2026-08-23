# home-cluster

## NixOS hosts

Add a NixOS VM once in `index.ts`:

```ts
deployNixOS("network1", "pve02", {
    ipAddress: "172.16.32.13/24",
    gateway: "172.16.32.1",
    vlanId: 10,
});
```

`deployNixOS` writes `nix/hosts/generated.json`, and `nix/flake.nix` builds
`nixosConfigurations` from that file. Host directories under `nix/hosts/<name>`
are optional and should only contain extra NixOS settings for that specific host.

Pulumi uses two lifecycle steps:

- `nixos-anywhere` runs only when the VM instance ID changes.
- `nixos-rebuild switch` runs when the host's Nix inputs or generated host facts change.

When changing a host's IP, set `sshHost` to the currently reachable address for
one deploy while `ipAddress` carries the desired new CIDR.
