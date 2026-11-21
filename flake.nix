{
  description = "CMUEats monorepo (web + dining-api)";

  nixConfig = {
    extra-substituters = [ "https://scottylabs.cachix.org" ];
    extra-trusted-public-keys = [
      "scottylabs.cachix.org-1:hajjEX5SLi/Y7yYloiXTt2IOr3towcTGRhMh1vu6Tjg="
    ];
  };

  inputs = {
    scottylabs.url = "git+https://git.cmu.dev/ScottyLabs/kennel";
    nixpkgs.follows = "scottylabs/nixpkgs";
    flake-parts.follows = "scottylabs/flake-parts";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.scottylabs.flakeModules.default ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        { pkgs, lib, ... }:
        let
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "cmueats-monorepo";
            version = "1.0.0";
            src = ./.;
            fetcherVersion = 4;
            hash = "sha256-b5zRQfrFvR+8/WRUm41xE4x37QgFcPhzyTJlauQ8bwM=";
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
                pkgs.nodejs_24
                pkgs.pnpm_12
                pkgs.pnpmConfigHook
              ];
            };

          web = mkPnpm {
            pname = "eats-web";
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

          apiBuildDir = mkPnpm {
            pname = "dining-api-dist";
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
              # drop symlinks to web node_modules, which is linked in root node_modules
              find $out -xtype l -delete
              runHook postInstall
            '';
          };

          # migrates the database, then starts the api, which also serves the SPA
          api = pkgs.writeShellApplication {
            name = "dining-api";
            runtimeInputs = [ pkgs.nodejs_24 ];
            text = ''
              cd ${apiBuildDir}/apps/dining-api
              node_modules/.bin/drizzle-kit migrate
              exec node dist/server.js
            '';
          };
        in
        {
          scottylabs = {
            project.name = "eats";
            postgres.enable = true;

            ricochet = {
              enable = true;
              appUrl = "http://localhost:5010";
            };

            processes = {
              api = {
                run = "cd apps/dining-api && exec secretspec run -P dev -- pnpm dev";
                ready = "${lib.getExe pkgs.curl} -sf http://localhost:5010/api/health";
                depends = [ "postgres-setup" ];
              };
              web.run = "cd apps/web && pnpm dev";
            };

            shell = {
              packages = [
                pkgs.nodejs_24
                pkgs.pnpm_12
              ];
              hook = "pnpm install --frozen-lockfile";
            };
          };

          pre-commit.settings.hooks.block-ai-slop.excludes = [
            "^apps/dining-api/tests/html/"
            "^apps/dining-api/tests/expectedData\\.ts$"
            "^apps/web/src/mockLocations\\.ts$"
          ];

          services.web = {
            package = api;
            customDomain = "cmueats.com";
            env.STATIC_DIR = "${web}";
          };
        };
    };
}
