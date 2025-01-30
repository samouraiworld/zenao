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