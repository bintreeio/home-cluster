{ ... }:
{
  # Hosts decrypt with the SSH host key openssh already generated at install —
  # zero key provisioning, works on a machine's very first activation.
  # Recipients live in ../.sops.yaml; edit secrets with `sops secrets/<file>`.
  sops.age.sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
}
