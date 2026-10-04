{ inputs, ... }:
{
  imports = [ inputs.scottylabs.devenvModules.default ];

  scottylabs = {
    enable = true;
    project.name = "eats";
    postgres.enable = true;

    kennel.sites.web = {
      spa = true;
    };
    kennel.services.api = {
      customDomain = "api.cmueats.scottylabs.org";
    };
  };
}
