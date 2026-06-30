import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260630120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "otp_verification" ("id" text not null, "email" text not null, "otp" text not null, "verified" boolean not null default false, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "otp_verification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_otp_verification_email" ON "otp_verification" ("email");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_otp_verification_deleted_at" ON "otp_verification" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "otp_verification" cascade;`);
  }

}
