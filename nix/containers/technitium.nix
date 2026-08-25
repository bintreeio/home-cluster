{ config, lib, pkgs, ... }:

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

    zone = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "home.bintree.io";
      description = "Primary zone ensured on every activation (rebuild-proof).";
    };

    records = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      example = { "dns01.home.bintree.io" = "172.16.32.11"; "*.home.bintree.io" = "172.16.32.11"; };
      description = "A records (FQDN -> IPv4, wildcards allowed) ensured in `zone` on every activation.";
    };
  };

  config = lib.mkIf cfg.enable {
    sops.secrets."technitium-env" = {
      sopsFile = ../secrets/technitium.env;
      format = "dotenv";
      key = ""; # decrypt the whole file, not a single key
    };

    virtualisation.docker.enable = true;

    virtualisation.oci-containers = {
      backend = "docker";
      containers.technitium = {
        image = "docker.io/technitium/dns-server:${cfg.version}@${cfg.imageDigest}";

        # Host networking, NOT ports = [...]:
        extraOptions = [ "--network=host" ];

        volumes = [ "${cfg.dataDir}:/etc/dns"
                    "/var/lib/technitium/logs:/var/log/technitium/dns:Z"
                    ];

        environment = {
          DNS_SERVER_DOMAIN = cfg.domain;
          # Applied on first init; an existing install keeps its saved config —
          # flip Settings -> Web Service -> Local Addresses once if needed.
          DNS_SERVER_WEB_SERVICE_LOCAL_ADDRESSES = cfg.webListenAddress;
        };

        environmentFiles = [ config.sops.secrets."technitium-env".path ];

        autoStart = true;
      };
    };

    # Converge Technitium to the declared state through its loopback API:
    # enforce the sops admin password (rotating a default-password install)
    # and ensure the zone + A records exist. Idempotent; "already exists"
    # answers are success.
    systemd.services.technitium-config = lib.mkIf (cfg.zone != null) {
      description = "Apply declarative Technitium DNS configuration";
      wantedBy = [ "multi-user.target" ];
      after = [ "docker-technitium.service" "sops-install-secrets.service" ];
      wants = [ "docker-technitium.service" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.curl pkgs.gnugrep pkgs.coreutils ];
      script = ''
        api="http://127.0.0.1:5380/api"
        pw=$(grep -m1 '^DNS_SERVER_ADMIN_PASSWORD=' ${config.sops.secrets."technitium-env".path} | cut -d= -f2-)

        # Wait for the web service (fresh containers take a few seconds).
        for i in $(seq 1 60); do
          curl -s -o /dev/null "$api/user/login" && break
          sleep 2
        done

        login() {
          curl -sG "$api/user/login" --data-urlencode "user=admin" --data-urlencode "pass=$1" \
            | grep -o '"token":"[^"]*' | cut -d'"' -f4
        }

        token=$(login "$pw")
        if [ -z "$token" ]; then
          # Fresh/default install: log in with the default password and rotate
          # it to the sops-managed one.
          token=$(login "admin")
          if [ -n "$token" ]; then
            out=$(curl -sG "$api/user/changePassword" \
              --data-urlencode "token=$token" \
              --data-urlencode "pass=admin" --data-urlencode "newPass=$pw")
            case $out in
              *'"status":"ok"'*) echo "rotated default admin password to sops-managed password" ;;
              *) echo "ERROR: password rotation failed: $out" >&2; exit 1 ;;
            esac
          fi
        fi
        if [ -z "$token" ]; then
          echo "ERROR: cannot log in with sops or default password" >&2
          exit 1
        fi

        ensure() { # ensure <api-path> <param>=<value>...
          p=$1; shift
          out=$(curl -sG "$api$p" --data-urlencode "token=$token" \
            $(for a in "$@"; do printf -- '--data-urlencode\n%s\n' "$a"; done))
          case $out in
            *'"status":"ok"'*) ;;
            *exists*) ;;
            *) echo "ERROR: $p $* -> $out" >&2; exit 1 ;;
          esac
        }

        ensure /zones/create "zone=${cfg.zone}" "type=Primary"
        ${lib.concatStringsSep "\n" (lib.mapAttrsToList (fqdn: ip: ''
          ensure /zones/records/add "domain=${fqdn}" "zone=${cfg.zone}" "type=A" "ipAddress=${ip}" "ttl=300" "overwrite=true"
        '') cfg.records)}
        echo "technitium config applied: zone ${cfg.zone}, ${toString (builtins.length (builtins.attrNames cfg.records))} record(s)"
      '';
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
