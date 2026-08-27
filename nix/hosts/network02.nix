{ config, pkgs, lib, ... }:
{
  imports = [
    ../containers/technitium.nix
    ../containers/caddy.nix
  ];

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
    # UI on loopback (for Caddy + the config script) AND the LAN IP, so the
    # admin console is reachable directly at http://172.16.32.12:5380 when the
    # reverse proxy is down.
    webListenAddress = "127.0.0.1,172.16.32.12";
    openAdminUI = true;
    zone = "home.bintree.io";
    records = {
      "dns01.home.bintree.io" = "172.16.32.11";
      "dns02.home.bintree.io" = "172.16.32.12";
      # Everything else lands on caddy (network01); explicit records above win.
      "*.home.bintree.io" = "172.16.32.11";
    };
  };


}
