{ config, pkgs, ... }:
{
  services.qemuGuest.enable = true;

  services.openssh.enable = true;
  services.openssh.settings.PermitRootLogin = "prohibit-password";
  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHtoZmEkD27Z7kPF7t9dwS510l2G8dzrX5bMW2CBmMCe josh@bintree.io"   # only used by nixos-anywhere
  ];

  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  networking.useDHCP = true;

  system.stateVersion = "25.05";
}