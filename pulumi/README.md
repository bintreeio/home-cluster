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

"access denied by server" means the share is not exported, NFS is off, or the
authorized network does not cover the client IP the NAS sees. Permission denied on
`touch` means maproot is not root.

### Checking on a PVE node

```
pvesm status          # nas listed, shared=1, active
pvesm list nas
ls /mnt/pve/nas/snippets
```
