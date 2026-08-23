# nixos/disko/standard-vm.nix
{ modulesPath, ... }:
{
  # virtio drivers in the initrd, guest clock fix, etc. — required to find /dev/vda at boot
  imports = [ (modulesPath + "/profiles/qemu-guest.nix") ];

  disko.devices.disk.main = {
    device = "/dev/vda";          # Proxmox virtio0 shows up as vda
    type = "disk";
    content = {
      type = "gpt";
      partitions = {
        ESP = {
          size = "512M";
          type = "EF00";
          content = {
            type = "filesystem";
            format = "vfat";
            mountpoint = "/boot";
            mountOptions = [ "umask=0077" ];
          };
        };
        root = {
          size = "100%";
          content = {
            type = "filesystem";
            format = "ext4";
            mountpoint = "/";
          };
        };
      };
    };
  };
}
