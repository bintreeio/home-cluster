{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs-stable";
    };
  };

  outputs = { self, nixpkgs, disko }:
    let
      mkVm = hostModule: nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          disko.nixosModules.disko
          ./standard-vm.nix
          ./base.nix
          hostModule
        ];
      };
    in {
      nixosConfigurations = {
        web01 = mkVm ./hosts/web01.nix;
      };
    };
}