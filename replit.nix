{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.npm-9_x
    pkgs.python3
    pkgs.postgresql
    pkgs.git
    pkgs.curl
  ];
  
  env = {
    NODE_ENV = "production";
    NPM_CONFIG_PREFIX = "/tmp/npm-global";
    PATH = "/tmp/npm-global/bin:$PATH";
  };
}