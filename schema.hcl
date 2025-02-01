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
  column "clerk_id" {
    null = true
    type = text
  }
  column "display_name" {
    null = true
    type = text
  }
  column "bio" {
    null = true
    type = text
  }
  column "avatar_uri" {
    null = true
    type = text
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_users_clerk_id" {
    unique  = true
    columns = [column.clerk_id]
  }
  index "idx_users_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "events" {
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
  column "title" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "start_date" {
    null = true
    type = datetime
  }
  column "end_date" {
    null = true
    type = datetime
  }
  column "image_uri" {
    null = true
    type = text
  }
  column "ticket_price" {
    null = true
    type = real
  }
  column "capacity" {
    null = true
    type = integer
  }
  column "location" {
    null = true
    type = text
  }
  column "creator_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_events_creator" {
    columns     = [column.creator_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_events_deleted_at" {
    columns = [column.deleted_at]
  }
}
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
  column "event_id" {
    null = true
    type = integer
  }
  column "user_id" {
    null = true
    type = text
  }
  column "price" {
    null = true
    type = real
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_sold_tickets_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "user_roles" {
  schema = schema.main
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
  column "user_id" {
    null = true
    type = integer
  }
  column "event_id" {
    null = true
    type = integer
  }
  column "role" {
    null = true
    type = text
  }
  primary_key {
    columns = [column.user_id, column.event_id, column.role]
  }
  index "idx_user_roles_deleted_at" {
    columns = [column.deleted_at]
  }
}
schema "main" {
}
