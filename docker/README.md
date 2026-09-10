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




