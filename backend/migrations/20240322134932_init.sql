-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS "Switch" (
    id serial PRIMARY KEY,
    name character varying NOT NULL,
    parent_id integer,
    ip_address character varying NOT NULL unique,
    mac character varying NOT NULL,
    community character varying NOT NULL,
    is_root boolean NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES "Switch"(id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE "Switch";
-- +goose StatementEnd
