{ config, pkgs, lib, ... }:
{
  imports = [
    ../containers/technitium.nix
    ../containers/caddy.nix
  ];

  networking.hostName = "network01";
  networking.domain = "home.bintree.io";
  networking.useDHCP = lib.mkForce false;
  systemd.network.enable = true;
  systemd.network.networks."10-lan" = {
    matchConfig.Name = "en* eth*";
    address = [ "172.16.32.11/24" ];
    routes = [ { Gateway = "172.16.32.1"; } ];
    # Never resolve via itself — must reach the world mid-deploy.
    dns = [ "1.1.1.1" "9.9.9.9" ];
  };
  networking.nameservers = [ "1.1.1.1" "9.9.9.9" ];

  services.technitium-container = {
    enable = true;
    domain = "dns01.home.bintree.io";
    webListenAddress = "127.0.0.1"; # admin UI only via Caddy
    openAdminUI = false; # and the firewall stays closed on 5380
  };

  services.caddy-container = {
    enable = true;
    acmeEmail = "psycholomo@gmail.com";
    virtualHosts."dns01.home.bintree.io" = "127.0.0.1:5380";
  };
}
