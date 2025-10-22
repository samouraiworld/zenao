table "sold_tickets" {
  schema = schema.main
  column "id" {
    null           = true
    type           = integer
    auto_increment = true
  }
  column "created_at" {
    null = true
    type = datetime
  }
  column "updated_at" {
    null = true
    type = datetime
  }
  column "deleted_at" {
    null = true
    type = datetime
  }
  column "event_realm_id" {
    null = false
    type = text
  }
  column "user_realm_id" {
    null = false
    type = text
  }
  column "buyer_realm_id" {
    null = false
    type = text
  }
  column "price" {
    null = true
    type = real
  }
  column "secret" {
    null = false
    type = text
  }
  column "pubkey" {
    null = false
    type = text
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_sold_tickets_pubkey" {
    unique  = true
    columns = [column.pubkey]
  }
  index "idx_sold_tickets_secret" {
    unique  = true
    columns = [column.secret]
  }
  index "idx_event_user_deleted" {
    unique  = true
    columns = [column.event_realm_id, column.user_realm_id, column.deleted_at]
  }
  index "idx_sold_tickets_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "users" {
  schema = schema.main
  column "id" {
    null           = true
    type           = integer
    auto_increment = true
  }
  column "created_at" {
    null = true
    type = datetime
  }
  column "updated_at" {
    null = true
    type = datetime
  }
  column "deleted_at" {
    null = true
    type = datetime
  }
  column "auth_id" {
    null = true
    type = text
  }
  column "plan" {
    null    = true
    type    = text
    default = "free"
  }
  column "realm_id" {
    null = true
    type = text
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_users_realm_id" {
    unique  = true
    columns = [column.realm_id]
  }
  index "idx_users_auth_id" {
    unique  = true
    columns = [column.auth_id]
  }
  index "idx_users_deleted_at" {
    columns = [column.deleted_at]
  }
}
schema "main" {
}
