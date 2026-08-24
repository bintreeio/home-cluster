{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    colmena = {
      url = "github:zhaofengli/colmena";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, colmena, disko, sops-nix }:

    let
      system = "x86_64-linux";

      commonModules = [
        disko.nixosModules.disko
        ./standard-vm.nix
        ./base.nix
      ];

      mkVm = hostModule: nixpkgs.lib.nixosSystem {
        inherit system;
        modules = commonModules ++ [ hostModule ];
      };

      mkColmenaHost = hostModule: targetHost: {
        imports = commonModules ++ [ hostModule ];

        deployment = {
          inherit targetHost;
          targetUser = "root";
          # The Mac can't build x86_64-linux closures locally
          buildOnTarget = true;
        };
      };
    in {
      nixosConfigurations = {
        network01 = mkVm ./hosts/network01.nix;
        network02 = mkVm ./hosts/network02.nix;
      };

      # Run colmena pinned to this flake: `nix run . -- apply`
      packages = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-darwin" ] (s: {
        default = colmena.packages.${s}.colmena;
      });

      colmenaHive = colmena.lib.makeHive self.outputs.colmena;

      colmena = {
        meta.nixpkgs = import nixpkgs { inherit system; };
        web01 = mkColmenaHost ./hosts/web01.nix "172.16.32.15";
        network01 = mkColmenaHost ./hosts/network01.nix "172.16.32.11";
        network02 = mkColmenaHost ./hosts/network02.nix "172.16.32.12";
      };
    };
}