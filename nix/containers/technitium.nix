{ config, lib, ... }:

let
  cfg = config.services.technitium-container;
in
{
  options.services.technitium-container = {
    enable = lib.mkEnableOption "Technitium DNS server (Docker)";

    version = lib.mkOption {
      type = lib.types.str;
      default = "15.4.0";
      description = "Image tag. Keep this in sync with imageDigest when upgrading.";
    };

    imageDigest = lib.mkOption {
      type = lib.types.str;
      default = "sha256:df7d90ef0f7b6fff6916d291a7022cd902290cc31c3141d4158b6c375a641b41";
      description = "Pinned image digest for docker.io/technitium/dns-server.";
    };

    domain = lib.mkOption {
      type = lib.types.str;
      example = "dns.home.bintree.io";
      description = "Value for DNS_SERVER_DOMAIN.";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/technitium";
      description = "Host directory bind-mounted to /etc/dns. Back this up.";
    };

    webListenAddress = lib.mkOption {
      type = lib.types.str;
      default = "0.0.0.0";
      example = "127.0.0.1";
      description = "Comma-separated DNS_SERVER_WEB_SERVICE_LOCAL_ADDRESSES. Set 127.0.0.1 when a reverse proxy fronts the UI.";
    };

    openAdminUI = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Open 5380 on all interfaces (disable and scope per-interface for mgmt VLANs).";
    };
  };

  config = lib.mkIf cfg.enable {
    virtualisation.docker.enable = true;

    virtualisation.oci-containers = {
      backend = "docker";
      containers.technitium = {
        image = "docker.io/technitium/dns-server:${cfg.version}@${cfg.imageDigest}";

        # Host networking, NOT ports = [...]:
        extraOptions = [ "--network=host" ];

        volumes = [ "${cfg.dataDir}:/etc/dns" ];

        environment = {
          DNS_SERVER_DOMAIN = cfg.domain;
          # Applied on first init; an existing install keeps its saved config —
          # flip Settings -> Web Service -> Local Addresses once if needed.
          DNS_SERVER_WEB_SERVICE_LOCAL_ADDRESSES = cfg.webListenAddress;
        };

        autoStart = true;
      };
    };

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0750 root root -"
    ];

    # Nothing else may sit on port 53 (resolved's stub listener would
    # fight Technitium for it).
    services.resolved.enable = false;

    networking.firewall = {
      enable = true;
      allowedTCPPorts = [ 53 ] ++ lib.optional cfg.openAdminUI 5380;
      allowedUDPPorts = [ 53 ];
    };
  };
}
