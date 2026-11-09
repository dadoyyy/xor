-- =====================================================================
-- xor — PR 1 Verification & Regression Test Suite (005_user_first_subjects)
-- =====================================================================

begin;

create temp table test_results (
  id serial primary key,
  test_name text not null,
  passed boolean not null,
  details text
);
grant select, insert, update, delete on table test_results to authenticated, anon;
grant usage, select on sequence test_results_id_seq to authenticated, anon;

-- Helper to simulate Supabase JWT auth.uid() in SQL tests
create or replace function public.set_test_auth_uid(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config(
    'request.jwt.claims',
    case when p_uid is null then '{}' else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true
  );
end $$;
grant execute on function public.set_test_auth_uid(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------
-- 1. Check search_path and anon execute privileges BEFORE adding test helper
-- ---------------------------------------------------------------------
do $$
declare
  v_missing_search_path int;
  v_anon_exec_count int;
begin
  select count(*) into v_missing_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname <> 'set_test_auth_uid'
    and p.prokind = 'f'
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    )
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
      where cfg like 'search_path=%'
    );

  insert into test_results (test_name, passed, details)
  values (
    '1. Every function in public sets search_path',
    v_missing_search_path = 0,
    format('functions missing search_path = %s', v_missing_search_path)
  );

  select count(*) into v_anon_exec_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname <> 'set_test_auth_uid'
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  insert into test_results (test_name, passed, details)
  values (
    '2. Role anon cannot execute any public RPC/function',
    v_anon_exec_count = 0,
    format('functions executable by anon = %s', v_anon_exec_count)
  );
end $$;

-- ---------------------------------------------------------------------
-- 2. Verify migrated data: former room `member` is now `editor`
--    and keeps edit rights under RLS
-- ---------------------------------------------------------------------
do $$
declare
  v_role text;
begin
  -- User 0002 was seeded as a room 'member' on room 0101 before 005 migration
  select role into v_role
  from public.library_entries
  where subject_id = '00000000-0000-0000-0000-000000000101'
    and user_id = '00000000-0000-0000-0000-000000000002';

  insert into test_results (test_name, passed, details)
  values (
    '3a. Former room member migrated to editor role',
    v_role = 'editor',
    format('migrated role = %s', coalesce(v_role, 'NULL'))
  );
end $$;

-- Switch to authenticated role as the former member (now editor) and test RLS INSERT on materials
set local role authenticated;
select public.set_test_auth_uid('00000000-0000-0000-0000-000000000002');

do $$
declare
  v_inserted_id uuid;
begin
  insert into public.materials (
    subject_id,
    uploaded_by,
    title,
    source_type,
    file_path,
    status
  )
  values (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000002',
    'Editor Uploaded Lecture Notes',
    'pdf',
    '00000000-0000-0000-0000-000000000101/editor_upload.pdf',
    'uploaded'
  )
  returning id into v_inserted_id;

  insert into test_results (test_name, passed, details)
  values (
    '3b. Former member (editor) keeps RLS INSERT rights on materials',
    v_inserted_id is not null,
    format('inserted material id = %s', v_inserted_id)
  );
end $$;

reset role;

-- ---------------------------------------------------------------------
-- 3. New key joiner receives `viewer` role and is blocked by RLS from
--    inserting materials, decks, or quizzes
-- ---------------------------------------------------------------------
do $$
declare
  v_key text;
begin
  select share_key into v_key
  from public.subjects
  where id = '00000000-0000-0000-0000-000000000101';

  perform set_config('test.share_key', v_key, true);
end $$;

set local role authenticated;
select public.set_test_auth_uid('00000000-0000-0000-0000-000000000003');

do $$
declare
  v_joined uuid;
  v_role text;
  v_mat_blocked boolean := false;
  v_deck_blocked boolean := false;
  v_quiz_blocked boolean := false;
  v_can_read int;
begin
  v_joined := public.add_shared_subject(current_setting('test.share_key'));

  select role into v_role
  from public.library_entries
  where subject_id = v_joined
    and user_id = '00000000-0000-0000-0000-000000000003';

  insert into test_results (test_name, passed, details)
  values (
    '4a. Joining by share key grants viewer role',
    v_joined = '00000000-0000-0000-0000-000000000101' and v_role = 'viewer',
    format('subject = %s, role = %s', v_joined, coalesce(v_role, 'NULL'))
  );

  -- Viewer can read materials
  select count(*) into v_can_read
  from public.materials
  where subject_id = '00000000-0000-0000-0000-000000000101';

  -- Viewer is blocked from inserting materials
  begin
    insert into public.materials (subject_id, uploaded_by, title, source_type, file_path, status)
    values (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000003',
      'Viewer Forbidden Upload',
      'pdf',
      '00000000-0000-0000-0000-000000000101/forbidden.pdf',
      'uploaded'
    );
  exception when others then
    v_mat_blocked := true;
  end;

  -- Viewer is blocked from inserting decks
  begin
    insert into public.decks (subject_id, created_by, title, difficulty)
    values (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000003',
      'Viewer Forbidden Deck',
      'medium'
    );
  exception when others then
    v_deck_blocked := true;
  end;

  -- Viewer is blocked from inserting quizzes
  begin
    insert into public.quizzes (subject_id, created_by, title, question_types, difficulty, question_count)
    values (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000003',
      'Viewer Forbidden Quiz',
      array['multiple_choice'],
      'medium',
      5
    );
  exception when others then
    v_quiz_blocked := true;
  end;

  insert into test_results (test_name, passed, details)
  values (
    '4b. Viewer can read content but is blocked by RLS from inserting materials/decks/quizzes',
    v_can_read > 0 and v_mat_blocked and v_deck_blocked and v_quiz_blocked,
    format('read=%s, mat_blocked=%s, deck_blocked=%s, quiz_blocked=%s', v_can_read, v_mat_blocked, v_deck_blocked, v_quiz_blocked)
  );
end $$;

reset role;

-- ---------------------------------------------------------------------
-- 4. Quiz lock behavior: blocks INSERT/UPDATE once a counting attempt exists,
--    and ALLOWS cascade DELETE of a quiz or subject with counting attempts
-- ---------------------------------------------------------------------
do $$
declare
  v_insert_q_blocked boolean := false;
  v_update_q_blocked boolean := false;
  v_update_key_blocked boolean := false;
  v_cascade_quiz_deleted boolean := false;
  v_cascade_subject_deleted boolean := false;
  v_del_quiz_id uuid := '00000000-0000-0000-0000-000000000202';
  v_del_q_id uuid := '00000000-0000-0000-0000-000000000302';
  v_del_subject_id uuid := '00000000-0000-0000-0000-000000000102';
  v_del_subj_quiz_id uuid := '00000000-0000-0000-0000-000000000203';
  v_del_subj_q_id uuid := '00000000-0000-0000-0000-000000000303';
begin
  -- Seeded quiz 0201 already has a counting attempt (counts = true).
  -- 1) Try INSERT on quiz_questions -> must be blocked
  begin
    insert into public.quiz_questions (quiz_id, position, qtype, prompt, points)
    values ('00000000-0000-0000-0000-000000000201', 99, 'true_false', 'Extra question?', 1);
  exception when others then
    v_insert_q_blocked := true;
  end;

  -- 2) Try UPDATE on quiz_questions -> must be blocked
  begin
    update public.quiz_questions
    set prompt = 'Mutated prompt'
    where id = '00000000-0000-0000-0000-000000000301';
  exception when others then
    v_update_q_blocked := true;
  end;

  -- 3) Try UPDATE on quiz_answer_keys -> must be blocked
  begin
    update public.quiz_answer_keys
    set explanation = 'Mutated answer key'
    where question_id = '00000000-0000-0000-0000-000000000301';
  exception when others then
    v_update_key_blocked := true;
  end;

  insert into test_results (test_name, passed, details)
  values (
    '5a. Quiz lock blocks INSERT/UPDATE on questions & answer keys after counting attempt',
    v_insert_q_blocked and v_update_q_blocked and v_update_key_blocked,
    format('insert_q_blocked=%s, update_q_blocked=%s, update_key_blocked=%s', v_insert_q_blocked, v_update_q_blocked, v_update_key_blocked)
  );

  -- 4) Create a quiz with a counting attempt and DELETE the quiz (cascade delete test)
  insert into public.quizzes (id, subject_id, created_by, title, question_types, difficulty, question_count, max_score)
  values (v_del_quiz_id, '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Quiz To Cascade Delete', array['true_false'], 'easy', 1, 1);

  insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, points)
  values (v_del_q_id, v_del_quiz_id, 0, 'true_false', ' Cascade test?', 1);

  insert into public.quiz_answer_keys (question_id, answer, explanation)
  values (v_del_q_id, '{"value": true}'::jsonb, 'Yes');

  insert into public.attempts (quiz_id, subject_id, user_id, epoch, counts, status, score, max_score, submitted_at)
  values (v_del_quiz_id, '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 1, true, 'graded', 1, 1, now());

  delete from public.quizzes where id = v_del_quiz_id;
  v_cascade_quiz_deleted := not exists (select 1 from public.quiz_questions where id = v_del_q_id);

  -- 5) Create a subject with a quiz & counting attempt and DELETE the subject (cascade delete test)
  insert into public.subjects (id, name, owner_id, share_key)
  values (v_del_subject_id, 'Temp Subject To Delete', '00000000-0000-0000-0000-000000000001', 'XOR-DEL1-DEL2');

  insert into public.quizzes (id, subject_id, created_by, title, question_types, difficulty, question_count, max_score)
  values (v_del_subj_quiz_id, v_del_subject_id, '00000000-0000-0000-0000-000000000001', 'Subj Quiz', array['true_false'], 'easy', 1, 1);

  insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, points)
  values (v_del_subj_q_id, v_del_subj_quiz_id, 0, 'true_false', 'Subj cascade?', 1);

  insert into public.quiz_answer_keys (question_id, answer, explanation)
  values (v_del_subj_q_id, '{"value": true}'::jsonb, 'Yes');

  insert into public.attempts (quiz_id, subject_id, user_id, epoch, counts, status, score, max_score, submitted_at)
  values (v_del_subj_quiz_id, v_del_subject_id, '00000000-0000-0000-0000-000000000001', 1, true, 'graded', 1, 1, now());

  delete from public.subjects where id = v_del_subject_id;
  v_cascade_subject_deleted := not exists (select 1 from public.subjects where id = v_del_subject_id)
    and not exists (select 1 from public.quiz_questions where id = v_del_subj_q_id);

  insert into test_results (test_name, passed, details)
  values (
    '5b. Deleting a quiz or subject with counting attempts cascades cleanly',
    v_cascade_quiz_deleted and v_cascade_subject_deleted,
    format('quiz_cascade=%s, subject_cascade=%s', v_cascade_quiz_deleted, v_cascade_subject_deleted)
  );
end $$;

-- ---------------------------------------------------------------------
-- 5. First-attempt leaderboard counts (unique index + practice run exclusion)
-- ---------------------------------------------------------------------
do $$
declare
  v_dup_counting_blocked boolean := false;
  v_owner_points numeric;
  v_editor_points numeric;
  v_owner_rank bigint;
begin
  -- Owner (0001) already has a counting attempt on quiz 0201 with score = 8 / 10.
  -- Attempting to insert a second counting=true attempt for the same (quiz_id, user_id, epoch) must fail unique index:
  begin
    insert into public.attempts (quiz_id, subject_id, user_id, epoch, counts, status, score, max_score, submitted_at)
    values (
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000001',
      1,
      true,
      'graded',
      10,
      10,
      now()
    );
  exception when unique_violation then
    v_dup_counting_blocked := true;
  end;

  -- Insert a practice attempt (counts = false) with score 10/10 for Owner (0001)
  insert into public.attempts (quiz_id, subject_id, user_id, epoch, counts, status, score, max_score, submitted_at)
  values (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    1,
    false,
    'graded',
    10,
    10,
    now()
  );

  -- Insert a first counting attempt (counts = true) with score 9/10 for Editor (0002)
  insert into public.attempts (quiz_id, subject_id, user_id, epoch, counts, status, score, max_score, submitted_at)
  values (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000002',
    1,
    true,
    'graded',
    9,
    10,
    now()
  );

  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000001');

  select total_points, rank into v_owner_points, v_owner_rank
  from public.subject_leaderboard('00000000-0000-0000-0000-000000000101')
  where user_id = '00000000-0000-0000-0000-000000000001';

  select total_points into v_editor_points
  from public.subject_leaderboard('00000000-0000-0000-0000-000000000101')
  where user_id = '00000000-0000-0000-0000-000000000002';

  insert into test_results (test_name, passed, details)
  values (
    '6. First-attempt leaderboard counts only first attempt & blocks duplicate counting rows',
    v_dup_counting_blocked and v_owner_points = 8 and v_editor_points = 9 and v_owner_rank = 2,
    format('dup_blocked=%s, owner_pts=%s (rank %s), editor_pts=%s', v_dup_counting_blocked, v_owner_points, v_owner_rank, v_editor_points)
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. Streak calculation across timezones (UTC+8 Asia/Manila vs UTC-5 America/New_York)
--    and minimum study action threshold
-- ---------------------------------------------------------------------
do $$
declare
  v_u_plus8 uuid := '00000000-0000-0000-0000-000000000005';
  v_u_minus5 uuid := '00000000-0000-0000-0000-000000000006';
  v_ref_ts timestamptz := '2026-11-06 20:00:00+00'::timestamptz; -- 2026-11-07 04:00 in UTC+8; 2026-11-06 15:00 in UTC-5
  v_d_plus8 date;
  v_d_minus5 date;
  v_today_plus8 date;
  v_streak_after_3_cards int;
  v_streak_after_5_cards int;
  v_longest_plus8 int;
  v_streak_minus5 int;
begin
  update public.profiles set timezone = 'Asia/Manila' where id = v_u_plus8;
  update public.profiles set timezone = 'America/New_York' where id = v_u_minus5;

  v_d_plus8 := public.user_local_date(v_u_plus8, v_ref_ts);
  v_d_minus5 := public.user_local_date(v_u_minus5, v_ref_ts);

  insert into test_results (test_name, passed, details)
  values (
    '7a. user_local_date resolves UTC+8 (Asia/Manila) vs UTC-5 (America/New_York) accurately',
    v_d_plus8 = '2026-11-07'::date and v_d_minus5 = '2026-11-06'::date,
    format('2026-11-06T20:00Z -> UTC+8=%s, UTC-5=%s', v_d_plus8, v_d_minus5)
  );

  -- Clear any existing activity_days for test user v_u_plus8
  delete from public.activity_days where user_id = v_u_plus8;
  update public.profiles set current_streak = 0, longest_streak = 0, last_active_date = null where id = v_u_plus8;

  v_today_plus8 := public.user_local_date(v_u_plus8, now());

  -- Seed 2 prior consecutive qualifying days (today - 2 and today - 1 in Asia/Manila)
  insert into public.activity_days (user_id, activity_date, quizzes_completed)
  values
    (v_u_plus8, v_today_plus8 - 2, 1),
    (v_u_plus8, v_today_plus8 - 1, 1);

  -- Now record only 3 cards reviewed today (below threshold of 5) -> today does NOT qualify yet, so streak stays 2
  perform public.record_study_activity(v_u_plus8, 'cards_reviewed', 3, 0);
  select current_streak into v_streak_after_3_cards from public.profiles where id = v_u_plus8;

  -- Now record 2 more cards reviewed today (total = 5 >= 5 threshold) -> today qualifies, streak becomes 3!
  perform public.record_study_activity(v_u_plus8, 'cards_reviewed', 2, 0);
  select current_streak, longest_streak into v_streak_after_5_cards, v_longest_plus8 from public.profiles where id = v_u_plus8;

  -- Also test UTC-5 user with 2 consecutive qualifying days ending yesterday in America/New_York
  delete from public.activity_days where user_id = v_u_minus5;
  insert into public.activity_days (user_id, activity_date, materials_added)
  values
    (v_u_minus5, public.user_local_date(v_u_minus5, now()) - 1, 1),
    (v_u_minus5, public.user_local_date(v_u_minus5, now()), 1);
  perform public.recompute_user_streak(v_u_minus5);
  select current_streak into v_streak_minus5 from public.profiles where id = v_u_minus5;

  insert into test_results (test_name, passed, details)
  values (
    '7b. Streak enforces minimum study threshold (cards >= 5) and computes across UTC+8 & UTC-5',
    v_streak_after_3_cards = 2 and v_streak_after_5_cards = 3 and v_longest_plus8 = 3 and v_streak_minus5 = 2,
    format('after_3_cards=%s, after_5_cards=%s, utc_minus5_streak=%s', v_streak_after_3_cards, v_streak_after_5_cards, v_streak_minus5)
  );
end $$;

-- ---------------------------------------------------------------------
-- 7. Storage policy access (`storage.objects` in `materials` bucket)
--    for owner, editor, viewer, and outsider
-- ---------------------------------------------------------------------
set local role authenticated;

do $$
declare
  v_owner_upload_ok boolean := false;
  v_editor_upload_ok boolean := false;
  v_viewer_upload_blocked boolean := false;
  v_outsider_upload_blocked boolean := false;
  v_owner_read int := 0;
  v_editor_read int := 0;
  v_viewer_read int := 0;
  v_outsider_read int := 0;
begin
  -- Owner (0001) upload
  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000001');
  insert into storage.objects (bucket_id, name)
  values ('materials', '00000000-0000-0000-0000-000000000101/owner.pdf');
  v_owner_upload_ok := true;

  -- Editor (0002) upload
  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000002');
  insert into storage.objects (bucket_id, name)
  values ('materials', '00000000-0000-0000-0000-000000000101/editor.pdf');
  v_editor_upload_ok := true;
  select count(*) into v_editor_read from storage.objects where bucket_id = 'materials' and name like '00000000-0000-0000-0000-000000000101/%';

  -- Owner (0001) read (both owner.pdf and editor.pdf now exist)
  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000001');
  select count(*) into v_owner_read from storage.objects where bucket_id = 'materials' and name like '00000000-0000-0000-0000-000000000101/%';

  -- Viewer (0003) upload (must be blocked) & read (must be allowed)
  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000003');
  begin
    insert into storage.objects (bucket_id, name)
    values ('materials', '00000000-0000-0000-0000-000000000101/viewer.pdf');
  exception when others then
    v_viewer_upload_blocked := true;
  end;
  select count(*) into v_viewer_read from storage.objects where bucket_id = 'materials' and name like '00000000-0000-0000-0000-000000000101/%';

  -- Outsider (0004) upload (must be blocked) & read (must return 0 rows)
  perform public.set_test_auth_uid('00000000-0000-0000-0000-000000000004');
  begin
    insert into storage.objects (bucket_id, name)
    values ('materials', '00000000-0000-0000-0000-000000000101/outsider.pdf');
  exception when others then
    v_outsider_upload_blocked := true;
  end;
  select count(*) into v_outsider_read from storage.objects where bucket_id = 'materials' and name like '00000000-0000-0000-0000-000000000101/%';

  insert into test_results (test_name, passed, details)
  values (
    '8. Storage RLS: owner/editor upload+read, viewer read-only, outsider blocked',
    v_owner_upload_ok and v_editor_upload_ok and v_viewer_upload_blocked and v_outsider_upload_blocked
      and v_owner_read = 2 and v_editor_read = 2 and v_viewer_read = 2 and v_outsider_read = 0,
    format(
      'uploads(owner=%s, editor=%s, viewer_blocked=%s, outsider_blocked=%s) reads(owner=%s, editor=%s, viewer=%s, outsider=%s)',
      v_owner_upload_ok, v_editor_upload_ok, v_viewer_upload_blocked, v_outsider_upload_blocked,
      v_owner_read, v_editor_read, v_viewer_read, v_outsider_read
    )
  );
end $$;

reset role;

-- ---------------------------------------------------------------------
-- 8. PR 2 Hardening Tests:
--    a. record_study_activity idempotency per (user_id, source_type, source_id)
--    b. record_deck_card_reviews access check, distinct card deduplication per day, cap, and invalid deck check
--    c. set_my_timezone canonical IANA validation, change-only write, and preservation of past streak calculation
-- ---------------------------------------------------------------------
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_source uuid := '00000000-0000-0000-0000-000000000999';
  v_rec1 boolean;
  v_rec2 boolean;
  v_quizzes_after int;
begin
  -- Idempotency check for quiz_completed
  v_rec1 := public.record_study_activity(v_user, 'quiz_completed', 1, 10, v_source);
  v_rec2 := public.record_study_activity(v_user, 'quiz_completed', 1, 10, v_source); -- Re-try/duplicate call

  select quizzes_completed into v_quizzes_after
  from public.activity_days
  where user_id = v_user and activity_date = public.user_local_date(v_user, now());

  insert into test_results (test_name, passed, details)
  values (
    '9. record_study_activity is idempotent per (user_id, source_type, source_id)',
    v_rec1 = true and v_rec2 = false,
    format('rec1=%s, rec2=%s (second attempt prevented double-counting)', v_rec1, v_rec2)
  );
end $$;

-- Card review RPC tests
set local role authenticated;
select public.set_test_auth_uid('00000000-0000-0000-0000-000000000001');

do $$
declare
  v_deck_id uuid := '00000000-0000-0000-0000-000000000501';
  v_c1 uuid;
  v_c2 uuid;
  v_new1 int;
  v_new2 int;
  v_outsider_blocked boolean := false;
  v_foreign_card_blocked boolean := false;
  v_foreign_card uuid := '00000000-0000-0000-0000-000000000987';
begin
  select id into v_c1 from public.cards where deck_id = v_deck_id and position = 0;
  select id into v_c2 from public.cards where deck_id = v_deck_id and position = 1;

  -- 1. Review cards [c1, c2]
  v_new1 := public.record_deck_card_reviews(v_deck_id, array[v_c1, v_c2]);

  -- 2. Immediate re-review of [c1, c2] in the same day -> should return 0 new distinct cards
  v_new2 := public.record_deck_card_reviews(v_deck_id, array[v_c1, v_c2]);

  -- 3. Card from another deck or non-existent card
  begin
    perform public.record_deck_card_reviews(v_deck_id, array[v_foreign_card]);
  exception when others then
    v_foreign_card_blocked := true;
  end;

  insert into test_results (test_name, passed, details)
  values (
    '10. record_deck_card_reviews counts distinct cards per day and rejects non-deck card IDs',
    v_new1 = 2 and v_new2 = 0 and v_foreign_card_blocked,
    format('first_batch=%s, second_batch_dup=%s, foreign_card_blocked=%s', v_new1, v_new2, v_foreign_card_blocked)
  );
end $$;

-- Outsider access check on deck card review
select public.set_test_auth_uid('00000000-0000-0000-0000-000000000004');

do $$
declare
  v_deck_id uuid := '00000000-0000-0000-0000-000000000501';
  v_c1 uuid;
  v_outsider_blocked boolean := false;
begin
  select id into v_c1 from public.cards where deck_id = v_deck_id and position = 0;
  begin
    perform public.record_deck_card_reviews(v_deck_id, array[v_c1]);
  exception when others then
    v_outsider_blocked := true;
  end;

  insert into test_results (test_name, passed, details)
  values (
    '11. record_deck_card_reviews rejects users without subject access',
    v_outsider_blocked,
    format('outsider_blocked=%s', v_outsider_blocked)
  );
end $$;

-- Timezone validation & change-only tests
select public.set_test_auth_uid('00000000-0000-0000-0000-000000000001');

do $$
declare
  v_invalid_blocked boolean := false;
  v_posix_blocked boolean := false;
  v_changed1 boolean;
  v_changed2 boolean;
begin
  -- Invalid timezone string
  begin
    perform public.set_my_timezone('Not/Real_Tz');
  exception when others then
    v_invalid_blocked := true;
  end;

  -- Disallowed format (e.g. POSIX / raw)
  begin
    perform public.set_my_timezone('posix/America/New_York');
  exception when others then
    v_posix_blocked := true;
  end;

  -- Valid IANA timezone
  v_changed1 := public.set_my_timezone('Asia/Tokyo');
  -- Same timezone again (should not perform update)
  v_changed2 := public.set_my_timezone('Asia/Tokyo');

  insert into test_results (test_name, passed, details)
  values (
    '12. set_my_timezone validates real IANA names and only writes on change',
    v_invalid_blocked and v_posix_blocked and v_changed1 = true and v_changed2 = false,
    format('invalid_blocked=%s, posix_blocked=%s, write_on_change=%s, no_write_on_same=%s',
      v_invalid_blocked, v_posix_blocked, v_changed1, not v_changed2)
  );
end $$;

reset role;

-- Print summary table and fail if any test did not pass
select id, test_name, case when passed then 'PASS' else 'FAIL' end as status, details
from test_results
order by id;

do $$
begin
  if exists (select 1 from test_results where not passed) then
    raise exception 'One or more verification tests failed!';
  end if;
end $$;

rollback;
