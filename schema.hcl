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
  column "creator_id" {
    null = true
    type = integer
  }
  column "loc_venue_name" {
    null = true
    type = text
  }
  column "loc_kind" {
    null = true
    type = text
  }
  column "loc_address" {
    null = true
    type = text
  }
  column "loc_instructions" {
    null = true
    type = text
  }
  column "loc_timezone" {
    null = true
    type = text
  }
  column "loc_lat" {
    null = true
    type = real
  }
  column "loc_lng" {
    null = true
    type = real
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
table "feeds" {
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
  column "slug" {
    null = true
    type = text
  }
  column "event_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_feeds_event" {
    columns     = [column.event_id]
    ref_columns = [table.events.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_feeds_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "posts" {
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
  column "kind" {
    null = true
    type = text
  }
  column "parent_uri" {
    null = true
    type = text
  }
  column "latitude" {
    null = true
    type = real
  }
  column "longitude" {
    null = true
    type = real
  }
  column "tags" {
    null = true
    type = text
  }
  column "content" {
    null = true
    type = text
  }
  column "title" {
    null = true
    type = text
  }
  column "preview_text" {
    null = true
    type = text
  }
  column "preview_image_uri" {
    null = true
    type = text
  }
  column "uri" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "image_uri" {
    null = true
    type = text
  }
  column "audio_uri" {
    null = true
    type = text
  }
  column "video_uri" {
    null = true
    type = text
  }
  column "thumbnail_image_uri" {
    null = true
    type = text
  }
  column "user_id" {
    null = true
    type = integer
  }
  column "feed_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_posts_feed" {
    columns     = [column.feed_id]
    ref_columns = [table.feeds.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  foreign_key "fk_posts_user" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_posts_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "polls" {
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
  column "question" {
    null = true
    type = text
  }
  column "kind" {
    null = true
    type = integer
  }
  column "duration" {
    null = true
    type = integer
  }
  column "post_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_polls_post" {
    columns     = [column.post_id]
    ref_columns = [table.posts.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_polls_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "poll_results" {
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
  column "option" {
    null = true
    type = text
  }
  column "count" {
    null = true
    type = integer
  }
  column "poll_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_polls_results" {
    columns     = [column.poll_id]
    ref_columns = [table.polls.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_poll_results_deleted_at" {
    columns = [column.deleted_at]
  }
}
table "poll_votes" {
  schema = schema.main
  column "poll_result_id" {
    null = true
    type = integer
  }
  column "user_id" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.poll_result_id, column.user_id]
  }
  foreign_key "fk_poll_votes_poll_result" {
    columns     = [column.poll_result_id]
    ref_columns = [table.poll_results.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  foreign_key "fk_poll_votes_user" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
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
