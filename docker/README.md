# docker/

One folder per app, one `compose.yml` per app (kept separate for independent
versioning and image bumps). Apps are deployed by the playbooks in `../ansible`.

## Host layout

```
/docker/<app>/                 compose.yml (+ Caddyfile), generated .env (0600)
/docker/appdata/<app>/data     persistent state — back this up
/docker/appdata/<app>/logs     log bind mount — collected later, disposable
```

Caddy also keeps `/docker/appdata/caddy/config`. Both apps use `network_mode: host`:
technitium must bind :53/:5380 on the real interfaces, and caddy proxies to technitium
on the host's `127.0.0.1:5380`. Container stdout is capped by the json-file logging
options; application logs go to the `logs` bind mount.

## Configuration

There are no hand-written env files. The playbooks generate `/docker/<app>/.env` from:

- **Plain config** — `ansible/inventory/group_vars/all.yml` and
  `ansible/inventory/host_vars/<host>.yml` (`docker_app_env.<app>`).
- **Secrets** — `secret-mappings.yml`, mapping env var names to Bitwarden Secrets Manager
  IDs, resolved with `bws` on the machine running Ansible:

  ```yaml
  <app>:
    env_variables:
      SOME_VAR: <bws secret id>
  ```

  List IDs with `bws secret list --color no -o json | jq -r '.[] | "\(.id)  \(.key)"'`.

## Apps

- `technitium/` — DNS. Runs on network01 (dns01) and network02 (dns02). The admin
  password and web-listen addresses only apply on first init; an existing data dir keeps
  its saved config.
- `caddy/` — reverse proxy with a `*.home.bintree.io` wildcard cert (Porkbun DNS-01).
  Runs on network01 and network02 (each issues its own copy of the cert). Add a vhost by
  adding a matcher/handle pair in `Caddyfile`. The DNS-01 propagation check uses public
  resolvers (`tls { resolvers }`), and the DNS hosts themselves must resolve through
  public upstreams, not through technitium (see `deployDebianOS.ts` `dnsServers`).
