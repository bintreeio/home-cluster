{ config, pkgs, lib, ... }:
{
  services.qemuGuest.enable = true;
  time.timeZone = "America/Los_Angeles";
  i18n.defaultLocale = "en_US.UTF-8";
  services.openssh.enable = true;
  services.openssh.settings.PermitRootLogin = "prohibit-password";
  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHtoZmEkD27Z7kPF7t9dwS510l2G8dzrX5bMW2CBmMCe josh@bintree.io" 
  ];

  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  networking.useDHCP = lib.mkDefault true;

  system.stateVersion = "25.05";
}