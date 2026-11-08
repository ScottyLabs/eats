{
  description = "CMU Eats monorepo (web + dining-api)";

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
        {
          pkgs,
          lib,
          helpers,
          ...
        }:
        {
          scottylabs = {
            project.name = "eats";
            postgres.enable = true;

            deno = {
              enable = true;
              react.enable = true;
            };

            ricochet = {
              enable = true;
              appUrl = "http://localhost:5010";
            };

            processes = {
              api = {
                run = "cd apps/dining-api && exec secretspec run -P dev -- deno task dev";
                ready = "${lib.getExe pkgs.curl} -sf http://localhost:5010/api/health";
                depends = [ "postgres-setup" ];
              };
              web.run = "cd apps/web && deno task dev";
            };
          };

          treefmt.programs.oxfmt.excludes = [
            "*.json"
            "**/api.d.ts"
            "**/api.yaml"
            "apps/dining-api/tests/html/**"
            "apps/dining-api/tests/expectedData.ts"
          ];

          pre-commit.settings.hooks = {
            block-ai-slop.excludes = [
              "^apps/dining-api/tests/html/"
              "^apps/dining-api/tests/expectedData\\.ts$"
              "^apps/web/src/mockLocations\\.ts$"
            ];

            deno-test.enable = lib.mkForce false;
            vitest = {
              enable = true;
              name = "vitest";
              entry = "deno task test";
              files = "^apps/.*\\.(ts|tsx|css)$";
              pass_filenames = false;
              language = "system";
            };
          };

          services.web = {
            package = helpers.buildDenoTask {
              src = ./.;
              cwd = "apps/dining-api";
              pname = "dining-api";
              entrypoint = "src/main.ts";
              compile = true;
            };
            customDomain = "cmueats.com";
            env.STATIC_DIR = "${helpers.buildDenoTask {
              src = ./.;
              cwd = "apps/web";
              pname = "eats-web";
            }}";
          };
        };
    };
}
