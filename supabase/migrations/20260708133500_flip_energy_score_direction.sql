-- Makes energy_score consistent with pain_score/anxiety_score: 4 always
-- means "the concerning end" across all three metrics. Previously energy
-- was the opposite direction (4 = Great, the good end). checkin_monthly_summaries
-- is empty (no user has check-ins old enough to have been archived yet), so
-- only the raw checkins table needs migrating.
update public.checkins set energy_score = 4 - energy_score;
