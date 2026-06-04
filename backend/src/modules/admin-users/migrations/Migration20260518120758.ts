import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518120758 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "admin_user" drop constraint if exists "admin_user_email_unique";`);
    this.addSql(`create table if not exists "admin_user" ("id" text not null, "name" text not null, "email" text not null, "password_hash" text not null, "password_salt" text not null, "role" text check ("role" in ('SUPER_ADMIN', 'ADMIN')) not null default 'ADMIN', "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_user_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_user_email_unique" ON "admin_user" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_user_deleted_at" ON "admin_user" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_user" cascade;`);
  }

}
