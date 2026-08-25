

## NixOS hosts
NixOS is used for static hosts on a VM that are running things I do not want in a k3s cluster

an example command running from macos as you get architecture mismatches.
```bash

 nix run nixpkgs#nixos-rebuild -- switch --flake .#web01 --target-host root@172.16.32.11 --build-host root@172.16.32.11 --fast
nix run -- . apply --on "network01"
```

no reinstall required after pulumi takes care of the initial install.

## Secrets (sops-nix)

Secrets live encrypted in `nix/secrets/` and are committed to git. Recipients are in
`nix/.sops.yaml`: one admin age key (`~/Library/Application Support/sops/age/keys.txt` on the
Mac — sops' default path on macOS — backed up in Bitwarden as `nixos_sops_key`) plus each
host's SSH host key converted with `ssh-to-age` —
hosts decrypt at activation with the key they already have, nothing to provision.

```bash
cd nix
nix shell nixpkgs#sops --command sops secrets/<file you want to edit> 
git add                          # flakes ignore un-added files. ensure you add or it wont pick it up
```

If a host is ever reinstalled with a fresh host key: re-run
`ssh-keyscan -t ed25519 <ip> | nix run nixpkgs#ssh-to-age`, replace its entry in
`nix/.sops.yaml`, then `sops updatekeys nix/secrets/<env file>`. To avoid that entirely, store the
host's `/etc/ssh/ssh_host_ed25519_key` in Bitwarden and set `hostKeySecretId` in `index.ts` —
pulumi then re-injects the same identity via nixos-anywhere `--extra-files`.

## Adding a new host
Before setting up a new host with pulumi it is advisable to do these things first to ensure SOPS works correctly in nix.
Add the host, then update the flake with the host information.
1. Generate a keypair on your Mac as an example: ssh-keygen -t ed25519 -f ./network03_host_key -N "" -C network03 (nothing sensitive ever touches the new machine's disk before install).
2. Put the private key in Bitwarden as network03_ssh_host_key; derive the recipient locally: ssh-to-age < network03_host_key.pub; delete the local copies.
3. Add that age1... line to nix/.sops.yaml, run sops updatekeys secrets/caddy.env — same commit as the new hosts/network03.nix and its flake entries.
4. In index.ts, give the new VM its hostKeySecretId.   