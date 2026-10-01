-- Real-user testimonials, kept separate from Invite/InviteRequest: an Invite
-- grants a seat, an InviteRequest asks for one, and a Testimonial is social
-- proof. Nothing links them, so a rejected quote cannot affect an account.

CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "role" TEXT,
    "orgType" TEXT,
    "region" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'website',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Testimonial_status_idx" ON "Testimonial"("status");
CREATE INDEX "Testimonial_createdAt_idx" ON "Testimonial"("createdAt");
