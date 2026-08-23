# home-cluster

## NixOS hosts
NixOS is used for static hosts on a VM that are running things I do not want in a k3s cluster

an example command running from macos as you get architecture mismatches.
```bash

 nix run nixpkgs#nixos-rebuild -- switch --flake .#web01 --target-host root@172.16.32.11 --build-host root@172.16.32.11 --fast
```
no reinstall required after pulumi takes care of the initial install.

