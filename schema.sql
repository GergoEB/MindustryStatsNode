create table public.migrations
(
    id         serial
        primary key,
    name       varchar(255)                           not null
        unique,
    applied_at timestamp with time zone default now() not null
);

alter table public.migrations
    owner to postgres;

create table public.server_groups
(
    id         serial
        primary key,
    name       varchar(255)                           not null
        unique,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.server_groups
    owner to postgres;

create table public.servers
(
    id                  serial
        primary key,
    host                varchar(255)                           not null,
    port                integer                                not null,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null,
    last_seen           timestamp with time zone,
    server_group_id     integer                                not null
        constraint fk_server_group
            references public.server_groups,
    country_code        varchar(2),
    inactivity_excluded boolean                  default false not null,
    unique (host, port)
);

alter table public.servers
    owner to postgres;

create index idx_servers_server_group_id
    on public.servers (server_group_id);

create table public.server_motds_registry
(
    id          serial
        primary key,
    server_name text not null,
    description text not null,
    constraint uq_server_motd
        unique (server_name, description)
);

alter table public.server_motds_registry
    owner to postgres;

create table public.server_motds_history
(
    id         serial,
    server_id  integer                                not null
        references public.servers
            on delete cascade,
    motd_id    integer                                not null
        references public.server_motds_registry
            on delete restrict,
    valid_from timestamp with time zone default now() not null,
    valid_to   timestamp with time zone,
    primary key (id, valid_from)
);

alter table public.server_motds_history
    owner to postgres;

create index idx_motd_history_active
    on public.server_motds_history (server_id asc, valid_from desc)
    where (valid_to IS NULL);

create table public.serverlists
(
    id           serial
        primary key,
    name         varchar(255)                           not null,
    url          text                                   not null,
    display_name varchar(255)                           not null,
    created_at   timestamp with time zone default now() not null,
    updated_at   timestamp with time zone default now() not null
);

alter table public.serverlists
    owner to postgres;

create index idx_serverlists_url
    on public.serverlists (url);

create table public.server_source_list
(
    id            serial
        primary key,
    server_id     integer                                not null
        references public.servers
            on delete cascade,
    serverlist_id integer                                not null
        references public.serverlists
            on delete cascade,
    display_name  varchar(255)                           not null,
    first_seen    timestamp with time zone default now() not null,
    last_seen     timestamp with time zone,
    created_at    timestamp with time zone default now() not null,
    updated_at    timestamp with time zone default now() not null,
    unique (server_id, serverlist_id)
);

alter table public.server_source_list
    owner to postgres;

create index idx_server_source_list_server_id
    on public.server_source_list (server_id);

create index idx_server_source_list_serverlist_id
    on public.server_source_list (serverlist_id);

create index idx_server_source_list_last_seen
    on public.server_source_list (last_seen);

create table public.server_current
(
    server_id        integer                  not null
        primary key
        references public.servers
            on delete cascade,
    timestamp        timestamp with time zone not null,
    players          integer,
    max_players      integer,
    wave             integer,
    version          integer,
    version_type     varchar(50),
    ping             integer,
    online           boolean default false    not null,
    motd_registry_id integer,
    map_registry_id  integer
);

alter table public.server_current
    owner to postgres;

create index idx_server_current_timestamp
    on public.server_current (timestamp desc);

create table public.gamemode_registry
(
    id         smallserial
        primary key,
    game_mode  smallint              not null,
    mode_name  text default ''::text not null,
    clean_name text default ''::text not null,
    constraint uq_gamemode
        unique (game_mode, mode_name)
);

alter table public.gamemode_registry
    owner to postgres;

create table public.server_maps_registry
(
    id          serial
        primary key,
    map_name    text     not null,
    game_mode   smallint,
    mode_name   text,
    gamemode_id smallint not null
        references public.gamemode_registry,
    constraint uq_server_map
        unique (map_name, game_mode, mode_name)
);

alter table public.server_maps_registry
    owner to postgres;

create table public.server_stats
(
    server_id        integer                                not null
        references public.servers
            on delete cascade,
    timestamp        timestamp with time zone default now() not null,
    players          integer                  default 0,
    max_players      integer,
    wave             integer,
    version          integer,
    version_type     varchar(50),
    ping             integer,
    online           boolean                  default false not null,
    motd_registry_id integer
        constraint server_stats_server_motds_registry_id_fk
            references public.server_motds_registry,
    map_registry_id  integer
        constraint server_stats_server_maps_registry_id_fk
            references public.server_maps_registry,
    primary key (server_id, timestamp)
);

alter table public.server_stats
    owner to postgres;

create index server_stats_timestamp_idx
    on public.server_stats (timestamp desc);

create index idx_server_maps_registry_gamemode
    on public.server_maps_registry (gamemode_id);

create table public.server_maps_history
(
    id         serial,
    server_id  integer                                not null
        references public.servers
            on delete cascade,
    map_id     integer                                not null
        references public.server_maps_registry
            on delete restrict,
    valid_from timestamp with time zone default now() not null,
    valid_to   timestamp with time zone,
    primary key (id, valid_from)
);

alter table public.server_maps_history
    owner to postgres;

create index idx_map_history_active
    on public.server_maps_history (server_id asc, valid_from desc)
    where (valid_to IS NULL);

create index idx_map_history_map_server
    on public.server_maps_history (map_id, server_id);

