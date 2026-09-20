# pulumi

Proxmox VMs, images and cloud-init snippets for the home cluster.

## Shared NAS datastore (`nas`)

Snippets, import images and ISOs live once on an NFS export from the TrueNAS box
instead of being copied to each PVE node's `local` datastore. Pulumi manages the
Proxmox `StorageNfs` resource in `proxmox/storage/storageConfig.ts`; the NAS side is
set up by hand.

Config keys (both stored as encrypted secrets):

| key                       | value                                           |
| ------------------------- | ----------------------------------------------- |
| `home-cluster:nas-server` | NAS IP or hostname reachable from the PVE nodes |
| `home-cluster:nas-export` | NFS export path on the NAS                      |

Proxmox creates fixed subfolders under the export, one per content type:

| content               | path on the NAS          |
| --------------------- | ------------------------ |
| snippets              | `<export>/snippets/`     |
| ISOs                  | `<export>/template/iso/` |
| import images (qcow2) | `<export>/import/`       |

### One-time TrueNAS setup

1. Datasets: add a dedicated dataset for Proxmox on the pool of your choice. Owner `root:root`, mode 755.
2. Shares > NFS: add a share for that path.
   - Authorized networks: `172.16.0.0/24` (PVE management VLAN).
   - Maproot user/group: `root`/`root`. PVE writes as uid 0 on every node, so this
     keeps ownership consistent with no UID matching.
3. Services: NFS enabled with NFSv4 on.
4. Verify from a PVE node before running Pulumi:

   ```
   showmount -e <nas-ip>
   mkdir -p /mnt/test
   mount -t nfs -o vers=4 <nas-ip>:<export-path> /mnt/test
   touch /mnt/test/x && ls -l /mnt/test
   umount /mnt/test && rmdir /mnt/test
   ```

   "access denied by server" means the share is not exported, NFS is off, or the
   authorized network does not cover the client IP the NAS sees. Permission denied on
   `touch` means maproot is not root.

### Checking on a PVE node

```
pvesm status          # nas listed, shared=1, active
pvesm list nas
ls /mnt/pve/nas/snippets
```
