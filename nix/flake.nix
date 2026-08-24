{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
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
        network01 = mkVm ./hosts/network01.nix;
        network02 = mkVm ./hosts/network02.nix;
      };
    };
}