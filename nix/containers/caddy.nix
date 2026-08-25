{ config, lib, pkgs, ... }:

let
  cfg = config.services.caddy-container;

  # HTTPS upstreams are internal devices reached by IP; their certs never
  # match, so encrypt without verifying.
  proxyDirective = upstream:
    if lib.hasPrefix "https://" upstream then ''
      reverse_proxy ${upstream} {
          transport http {
            tls_insecure_skip_verify
          }
        }''
    else "reverse_proxy ${upstream}";

  vhostBlocks = lib.mapAttrsToList (host: upstream: ''
    ${host} {
      ${proxyDirective upstream}
    }
  '') cfg.virtualHosts;

  matcherName = host: lib.replaceStrings [ "." ] [ "-" ] host;

  wildcardHandlers = lib.mapAttrsToList (host: upstream: ''
      @${matcherName host} host ${host}
      handle @${matcherName host} {
        ${proxyDirective upstream}
      }
  '') cfg.virtualHosts;

  # One site block, one wildcard cert: adding a vhost needs no new issuance.
  wildcardBlock = ''
    *.${cfg.wildcardDomain} {
    ${lib.concatStringsSep "\n" wildcardHandlers}
      handle {
        abort
      }
    }
  '';

  caddyfile = pkgs.writeText "Caddyfile" ''
    {
      email {env.acmeEmail}
      acme_dns porkbun {
        api_key {env.PORKBUN_API_KEY}
        api_secret_key {env.PORKBUN_API_SECRET_KEY}
      }
    }

    ${if cfg.wildcardDomain != null
      then wildcardBlock
      else lib.concatStringsSep "\n" vhostBlocks}
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

    wildcardDomain = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "home.bintree.io";
      description = ''
        When set, serve all virtualHosts from a single `*.<domain>` site block
        with one wildcard certificate (DNS-01), instead of one site block and
        certificate per hostname. Unmatched names are aborted.
      '';
    };

    virtualHosts = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      example = {
        "dns01.home.bintree.io" = "127.0.0.1:5380";
        "nas.home.bintree.io" = "https://172.16.32.5";
      };
      description = ''
        Hostname -> reverse_proxy upstream. `https://` upstreams are proxied
        over TLS without verification (internal devices reached by IP).
      '';
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
