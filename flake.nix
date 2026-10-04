{
  description = "CMUEats monorepo (web + dining-api)";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    scottylabs = {
      url = "git+https://git.cmu.dev/ScottyLabs/kennel";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, scottylabs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ];
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          nodejs_24 = pkgs.nodejs_24;

          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "cmueats-monorepo";
            version = "1.0.0";
            src = ./.;
            fetcherVersion = 4;
            hash = pkgs.lib.fakeHash;
            pnpm = pkgs.pnpm_12;
          };

          mkPnpm =
            {
              pname,
              buildPhase,
              installPhase,
            }:
            pkgs.stdenv.mkDerivation {
              version = "0.1.0";
              src = ./.;
              inherit
                pname
                pnpmDeps
                buildPhase
                installPhase
                ;
              nativeBuildInputs = [
                nodejs_24
                pkgs.pnpm_12
                pkgs.pnpmConfigHook
              ];
            };

          apiBuildDir = mkPnpm {
            pname = "api";
            buildPhase = ''
              runHook preBuild
              pnpm build:api
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out/apps
              cp -r node_modules $out/node_modules
              cp package.json pnpm-workspace.yaml pnpm-lock.yaml $out/
              cp -r apps/dining-api $out/apps/dining-api
              runHook postInstall
            '';
          };
        in
        {
          web = mkPnpm {
            pname = "web";
            buildPhase = ''
              runHook preBuild
              pnpm build:web
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out
              cp -r apps/web/dist/. $out/
              runHook postInstall
            '';
          };

          # after building, runs migration
          # and then starts the api server
          api = pkgs.writeShellApplication {
            name = "api";
            runtimeInputs = [ nodejs_24 ];
            text = ''
              cd ${apiBuildDir}/apps/dining-api
              node_modules/.bin/drizzle-kit migrate
              # export NODE_ENV=production
              exec node dist/server.js
            '';
          };
        }
      );
    };
}
