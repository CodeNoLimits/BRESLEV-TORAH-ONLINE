
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript
    pkgs.python3
  ];
  env = {
    PATH = "${pkgs.nodejs-18_x}/bin:${pkgs.nodePackages.npm}/bin:$PATH";
    NODE_ENV = "development";
  };
}
