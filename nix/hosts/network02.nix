{ config, pkgs, lib, ... }:
{
  imports = [ ../containers/technitium.nix ];

  networking.hostName = "network02";
  networking.domain = "home.bintree.io";
  networking.useDHCP = lib.mkForce false;
  systemd.network.enable = true;
  systemd.network.networks."10-lan" = {
    matchConfig.Name = "en* eth*";
    address = [ "172.16.32.12/24" ];
    routes = [ { Gateway = "172.16.32.1"; } ];
    # Never resolve via itself — must reach the world mid-deploy.
    dns = [ "1.1.1.1" "9.9.9.9" ];
  };
  networking.nameservers = [ "1.1.1.1" "9.9.9.9" ];

  services.technitium-container = {
    enable = true;
    domain = "dns02.home.bintree.io";
    openAdminUI = true;
  };
}
