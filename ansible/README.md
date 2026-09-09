# ansible/

## Setup

```sh
cd ansible
cp env.example .env   # add your BWS_ACCESS_TOKEN
source .env
```

`.env` also sets `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`: the Rust bitwarden SDK used
by the Proxmox inventory plugin crashes in Ansible's forked workers on macOS without it.
`ansible.cfg` already sets the SSH user/key and enables sudo.

## Deploy a docker app

From this machine (copies `docker/<app>/` to the host, no git on the host):

```sh
ansible-playbook playbooks/deploy-docker-app-local.yml \
  -i inventory/hosts.yml -e target_host=network02 -e folder=technitium
```

From the Forgejo runner (host has a git checkout, default `/opt/iac`):

```sh
ansible-playbook playbooks/deploy-docker-app.yml \
  -i inventory/hosts.yml -e target_host=network02 -e folder=technitium
```

Both share `playbooks/tasks/docker-app.yml`: resolve `docker/secret-mappings.yml` through
`bws`, merge with `docker_app_env.<folder>` from `inventory/host_vars`, write
`/docker/<app>/.env`, create `/docker/appdata/<app>/logs`, `docker compose up`.
`playbooks/tasks/pre-<folder>.yml` runs first when it exists (technitium: free port 53).

Fresh Debian host: run `playbooks/install-docker.yml -e hosts=<host>` once before deploying.
