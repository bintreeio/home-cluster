# home-cluster

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
nix shell nixpkgs#sops --command sops secrets/caddy.env   # edit (PORKBUN_API_KEY / PORKBUN_API_SECRET_KEY)
git add nix/secrets/caddy.env                             # flakes ignore un-added files
```

If a host is ever reinstalled with a fresh host key: re-run
`ssh-keyscan -t ed25519 <ip> | nix run nixpkgs#ssh-to-age`, replace its entry in
`nix/.sops.yaml`, then `sops updatekeys nix/secrets/caddy.env`. To avoid that entirely, store the
host's `/etc/ssh/ssh_host_ed25519_key` in Bitwarden and set `hostKeySecretId` in `index.ts` —
pulumi then re-injects the same identity via nixos-anywhere `--extra-files`.

## Caddy

`nix/containers/caddy.nix` runs Caddy (serfriz/caddy-porkbun image) with host networking on
network01/network02, terminating TLS for `dns01/dns02.home.bintree.io` via the ACME DNS-01
challenge against Porkbun and proxying to Technitium's admin UI on `127.0.0.1:5380`. Add
services per host under `services.caddy-container.virtualHosts."name" = "upstream";`.

