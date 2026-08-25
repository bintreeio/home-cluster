{ config, lib, pkgs, ... }:

let
  cfg = config.services.caddy-container;

  vhostBlocks = lib.mapAttrsToList (host: upstream: ''
    ${host} {
      reverse_proxy ${upstream}
    }
  '') cfg.virtualHosts;

  # A store path: any change here yields a new container definition, so the
  # service restarts with the new config on activation — no manual reloads.
  caddyfile = pkgs.writeText "Caddyfile" ''
    {
      email ${cfg.acmeEmail}
      acme_dns porkbun {
        api_key {env.PORKBUN_API_KEY}
        api_secret_key {env.PORKBUN_API_SECRET_KEY}
      }
    }

    ${lib.concatStringsSep "\n" vhostBlocks}
    ${cfg.extraCaddyfile}
  '';
in
{
  options.services.caddy-container = {
    enable = lib.mkEnableOption "Caddy reverse proxy (Docker, ACME DNS-01 via Porkbun)";

    version = lib.mkOption {
      type = lib.types.str;
      default = "2.11.4";
      description = "Image tag. Keep this in sync with imageDigest when upgrading.";
    };

    imageDigest = lib.mkOption {
      type = lib.types.str;
      default = "sha256:d9bff9c5bebf4c4b5d4b44b1d977a205e610ced54e86faab67dfa50cc7760a91";
      description = "Pinned manifest-list digest for docker.io/serfriz/caddy-porkbun.";
    };

    acmeEmail = lib.mkOption {
      type = lib.types.str;
      example = "you@example.com";
      description = "Contact email for ACME (Let's Encrypt) registration.";
    };

    virtualHosts = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      example = { "dns01.home.bintree.io" = "127.0.0.1:5380"; };
      description = "Hostname -> reverse_proxy upstream. One HTTPS site block each.";
    };

    extraCaddyfile = lib.mkOption {
      type = lib.types.lines;
      default = "";
      description = "Verbatim extra Caddyfile blocks appended after the virtual hosts.";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/caddy";
      description = "Persists /data (ACME certs — back this up) and /config.";
    };
  };

  config = lib.mkIf cfg.enable {
    # Porkbun API creds (PORKBUN_API_KEY / PORKBUN_API_SECRET_KEY).
    # Edit with `sops secrets/caddy.env` from nix/.
    sops.secrets."caddy-env" = {
      sopsFile = ../secrets/caddy.env;
      format = "dotenv";
      key = ""; # decrypt the whole file, not a single key
      # root:root 0400 defaults are right: docker reads it host-side at start.
    };

    virtualisation.docker.enable = true;

    virtualisation.oci-containers = {
      backend = "docker";
      containers.caddy = {
        image = "docker.io/serfriz/caddy-porkbun:${cfg.version}@${cfg.imageDigest}";

        # Host networking so upstreams on 127.0.0.1 (e.g. Technitium's admin
        # UI) are reachable without publishing them beyond loopback.
        extraOptions = [ "--network=host" ];

        volumes = [
          "${caddyfile}:/etc/caddy/Caddyfile:ro"
          "${cfg.dataDir}/data:/data"
          "${cfg.dataDir}/config:/config"
        ];

        environmentFiles = [ config.sops.secrets."caddy-env".path ];

        autoStart = true;
      };
    };

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0750 root root -"
      "d ${cfg.dataDir}/data 0750 root root -"
      "d ${cfg.dataDir}/config 0750 root root -"
    ];

    networking.firewall = {
      enable = true;
      allowedTCPPorts = [ 80 443 ]; # 80 only serves the HTTP->HTTPS redirect
      allowedUDPPorts = [ 443 ]; # HTTP/3
    };
  };
}
