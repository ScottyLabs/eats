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
            hash = "sha256-4On8YmAO29+71C1ek6lbjMi/w8RXlmWz3UGa6UvUd+M=";
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
        in
        {
          scottylabs = {
            project.name = "eats";
            postgres.enable = true;

            # the api redirects through the relay, so Keycloak only has to
            # allow one redirect uri instead of one per preview deployment
            ricochet = {
              enable = true;
              appUrl = "http://localhost:5010";
            };

            shell.packages = [
              pkgs.nodejs_24
              pkgs.pnpm_12
            ];
          };

          # kennel's formatters and slop check would rewrite files this migration
          # doesn't touch, so they stay off until a follow-up cleans the repo up
          pre-commit.settings.hooks = {
            treefmt.enable = lib.mkForce false;
            block-ai-slop.enable = lib.mkForce false;
          };

          sites.web = {
            package = mkPnpm {
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
            spa = true;
            customDomain = "cmueats.scottylabs.org";
          };

          # migrates the database, then starts the api
          services.api = {
            package = pkgs.writeShellApplication {
              name = "dining-api";
              runtimeInputs = [ pkgs.nodejs_24 ];
              text = ''
                cd ${apiBuildDir}/apps/dining-api
                node_modules/.bin/drizzle-kit migrate
                exec node dist/server.js
              '';
            };
            customDomain = "api.cmueats.scottylabs.org";
          };
        };
    };
}
