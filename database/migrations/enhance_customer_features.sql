-- Migration: add favorite_courts and court_reviews tables for renter/customer experience

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TABLE IF NOT EXISTS public.favorite_courts (
    favorite_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    court_id BIGINT NOT NULL REFERENCES public.courts(court_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_favorite_user_court UNIQUE (user_id, court_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_courts_user
    ON public.favorite_courts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_courts_court
    ON public.favorite_courts (court_id);

CREATE TABLE IF NOT EXISTS public.court_reviews (
    review_id BIGSERIAL PRIMARY KEY,
    court_id BIGINT NOT NULL REFERENCES public.courts(court_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES public.bookings(booking_id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_court_user UNIQUE (court_id, user_id),
    CONSTRAINT chk_court_reviews_comment CHECK (LENGTH(TRIM(comment)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_court_reviews_court
    ON public.court_reviews (court_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_court_reviews_user
    ON public.court_reviews (user_id);

DROP TRIGGER IF EXISTS set_updated_at_court_reviews ON public.court_reviews;
CREATE TRIGGER set_updated_at_court_reviews
BEFORE UPDATE ON public.court_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

