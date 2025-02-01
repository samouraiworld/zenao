data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "-mod=mod",
    "ariga.io/atlas-provider-gorm",
    "load",
    "--path", "./backend/gzdb",
    "--dialect", "sqlite",
  ]
}

env "gorm" {
  src = data.external_schema.gorm.url
  dev = "sqlite://dev.db"
  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

variable "token" {
  type    = string
  default = getenv("TURSO_TOKEN")
}

env "dev" {
  url     = "sqlite://dev.db"
}

env "staging" {
  url     = "libsql://zenao-staging-samourai-coop.turso.io?authToken=${var.token}"
  exclude = ["_litestream*"]
}

env "prod" {
  url     = "libsql://zenao-prod-samourai-coop.turso.io?authToken=${var.token}"
  exclude = ["_litestream*"]
}