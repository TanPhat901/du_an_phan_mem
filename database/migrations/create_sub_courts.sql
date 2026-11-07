-- Migration: create sub_courts
-- Requires public.courts and public.sport_types to exist first.

-- Table: public.sub_courts

-- DROP TABLE IF EXISTS public.sub_courts;

CREATE TABLE IF NOT EXISTS public.sub_courts
(
    sub_court_id bigserial NOT NULL,
    court_id bigint NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    sport_type_id bigint NOT NULL,
    description text COLLATE pg_catalog."default",
    surface_type character varying(100) COLLATE pg_catalog."default",
    amenities text[] COLLATE pg_catalog."default" NOT NULL DEFAULT '{}'::text[],
    image_url text COLLATE pg_catalog."default",
    normal_price numeric(12,2) NOT NULL,
    peak_price numeric(12,2) NOT NULL,
    status character varying(20) COLLATE pg_catalog."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
    is_visible boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sub_courts_pkey PRIMARY KEY (sub_court_id),
    CONSTRAINT uq_sub_court_name UNIQUE (court_id, name),
    CONSTRAINT sub_courts_court_id_fkey FOREIGN KEY (court_id)
        REFERENCES public.courts (court_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE RESTRICT,
    CONSTRAINT sub_courts_sport_type_id_fkey FOREIGN KEY (sport_type_id)
        REFERENCES public.sport_types (sport_type_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT sub_courts_normal_price_check CHECK (normal_price >= 0::numeric),
    CONSTRAINT sub_courts_peak_price_check CHECK (peak_price >= 0::numeric),
    CONSTRAINT sub_courts_status_check CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'MAINTENANCE'::character varying, 'CLOSED'::character varying]::text[]))
)

TABLESPACE pg_default;

-- Index: idx_sub_courts_court_id

-- DROP INDEX IF EXISTS public.idx_sub_courts_court_id;

CREATE INDEX IF NOT EXISTS idx_sub_courts_court_id
    ON public.sub_courts USING btree
    (court_id ASC NULLS LAST)
;
-- Index: idx_sub_courts_sport_type

-- DROP INDEX IF EXISTS public.idx_sub_courts_sport_type;

CREATE INDEX IF NOT EXISTS idx_sub_courts_sport_type
    ON public.sub_courts USING btree
    (sport_type_id ASC NULLS LAST)
;