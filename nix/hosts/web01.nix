{ lib, ... }:
{
  networking.hostName = "web01";
  services.nginx.enable = true;
  # without at least one virtualHost, nginx starts but listens on nothing
  services.nginx.virtualHosts."default" = {
    default = true;
    locations."/".return = "200 'web01 up\\n'";
  };
  networking.firewall.allowedTCPPorts = [ 80 443 ];

  # cloud-init only configures the Debian bootstrap OS; the installed NixOS
  # must carry its own static IP or it comes up with no address on vlan 10
  networking.useDHCP = lib.mkForce false;
  systemd.network.enable = true;
  systemd.network.networks."10-lan" = {
    matchConfig.Name = "en* eth*";
    address = [ "172.16.32.11/24" ];
    routes = [ { Gateway = "172.16.32.1"; } ];
    dns = [ "1.1.1.1" ];
  };
}
