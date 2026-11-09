-- =====================================================================
-- RLS Verification: Viewer Direct Table Mutation & Calendar Restrictions
-- Asserts that:
-- 1. An authenticated viewer CANNOT insert, update, or delete materials, decks, quizzes, or questions.
-- 2. User A cannot select, insert, update, or delete User B's calendar events.
-- 3. A user cannot link a calendar event to a subject_id they have no access to.
-- 4. A user cannot exceed 500 calendar events through direct inserts.
-- =====================================================================

create temp table if not exists rls_test_results (
  id serial primary key,
  test_name text not null,
  passed boolean not null,
  details text
);
grant all on rls_test_results to authenticated, anon;
grant usage, select on sequence rls_test_results_id_seq to authenticated, anon;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_viewer uuid := gen_random_uuid();
  v_editor uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_subject uuid := gen_random_uuid();
  v_private_subject uuid := gen_random_uuid();
  v_mat uuid := gen_random_uuid();
  v_deck uuid := gen_random_uuid();
  v_card uuid := gen_random_uuid();
  v_quiz uuid := gen_random_uuid();
  v_question uuid := gen_random_uuid();
  v_owner_event uuid := gen_random_uuid();

  v_inserted_id uuid;
  v_updated_count int := 0;
  v_deleted_count int := 0;
  v_selected_count int := 0;
  v_err_caught boolean := false;
  v_err_msg text := '';
  i int;
begin
  -- 1. Setup seed profiles and subjects (as admin / superuser)
  insert into auth.users (id, email) values
    (v_owner, 'owner@test.com'),
    (v_viewer, 'viewer@test.com'),
    (v_editor, 'editor@test.com'),
    (v_outsider, 'outsider@test.com');

  insert into public.profiles (id, username, timezone) values
    (v_owner, 'test_owner_rls', 'UTC'),
    (v_viewer, 'test_viewer_rls', 'UTC'),
    (v_editor, 'test_editor_rls', 'UTC'),
    (v_outsider, 'test_outsider_rls', 'UTC')
  on conflict (id) do update set
    username = excluded.username,
    timezone = excluded.timezone;

  insert into public.subjects (id, name, description, owner_id, share_key) values
    (v_subject, 'RLS Test Subject', 'Testing viewer restrictions', v_owner, 'XOR-TEST-0001'),
    (v_private_subject, 'Private Outsider Subject', 'Owner only', v_outsider, 'XOR-TEST-0002');

  insert into public.library_entries (subject_id, user_id, role) values
    (v_subject, v_owner, 'owner'),
    (v_subject, v_viewer, 'viewer'),
    (v_subject, v_editor, 'editor'),
    (v_private_subject, v_outsider, 'owner');

  insert into public.materials (id, subject_id, uploaded_by, title, source_type, status) values
    (v_mat, v_subject, v_owner, 'Owner PDF', 'text', 'ready');

  insert into public.decks (id, subject_id, created_by, title) values
    (v_deck, v_subject, v_owner, 'Owner Deck');

  insert into public.cards (id, deck_id, position, front, back) values
    (v_card, v_deck, 1, 'Front', 'Back');

  insert into public.quizzes (id, subject_id, created_by, title, question_types, question_count) values
    (v_quiz, v_subject, v_owner, 'Owner Quiz', array['mcq'], 1);

  insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, choices, points) values
    (v_question, v_quiz, 1, 'mcq', 'Sample Prompt', '["A","B"]'::jsonb, 10);

  insert into public.calendar_events (id, user_id, title, event_type, status) values
    (v_owner_event, v_owner, 'Owner Midterm Exam', 'exam', 'todo');

  -- 2. Switch context to the VIEWER as non-superuser
  execute 'set role authenticated';
  perform set_config('request.jwt.claim.sub', v_viewer::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_viewer::text, 'role', 'authenticated')::text, true);

  -- TEST 1: Viewer cannot INSERT into materials
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.materials (subject_id, uploaded_by, title, source_type, status)
    values (v_subject, v_viewer, 'Viewer Rogue Material', 'text', 'ready')
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly inserting into materials is blocked by RLS', v_err_caught or v_inserted_id is null, 'materials insert blocked');

  -- TEST 2: Viewer cannot UPDATE materials
  v_err_caught := false;
  v_updated_count := 0;
  begin
    update public.materials set title = 'Hacked Title' where id = v_mat;
    get diagnostics v_updated_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly updating materials is blocked by RLS', v_err_caught or v_updated_count = 0, format('rows updated: %s, exception: %s', v_updated_count, v_err_caught));

  -- TEST 3: Viewer cannot DELETE materials
  v_err_caught := false;
  v_deleted_count := 0;
  begin
    delete from public.materials where id = v_mat;
    get diagnostics v_deleted_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly deleting materials is blocked by RLS', v_err_caught or v_deleted_count = 0, format('rows deleted: %s, exception: %s', v_deleted_count, v_err_caught));

  -- TEST 4: Viewer cannot INSERT into decks
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.decks (subject_id, created_by, title)
    values (v_subject, v_viewer, 'Viewer Rogue Deck')
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly inserting into decks is blocked by RLS', v_err_caught or v_inserted_id is null, 'decks insert blocked');

  -- TEST 5: Viewer cannot DELETE decks
  v_err_caught := false;
  v_deleted_count := 0;
  begin
    delete from public.decks where id = v_deck;
    get diagnostics v_deleted_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly deleting decks is blocked by RLS', v_err_caught or v_deleted_count = 0, format('rows deleted: %s, exception: %s', v_deleted_count, v_err_caught));

  -- TEST 6: Viewer cannot INSERT into quizzes
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.quizzes (subject_id, created_by, title, question_types, question_count)
    values (v_subject, v_viewer, 'Viewer Rogue Quiz', array['mcq'], 1)
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly inserting into quizzes is blocked by RLS', v_err_caught or v_inserted_id is null, 'quizzes insert blocked');

  -- TEST 7: Viewer cannot DELETE quizzes
  v_err_caught := false;
  v_deleted_count := 0;
  begin
    delete from public.quizzes where id = v_quiz;
    get diagnostics v_deleted_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly deleting quizzes is blocked by RLS', v_err_caught or v_deleted_count = 0, format('rows deleted: %s, exception: %s', v_deleted_count, v_err_caught));

  -- TEST 8: Viewer cannot INSERT or UPDATE quiz_questions
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.quiz_questions (quiz_id, position, qtype, prompt, choices, points)
    values (v_quiz, 2, 'mcq', 'Rogue Question', '["A"]'::jsonb, 5)
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly inserting quiz questions is blocked by RLS', v_err_caught or v_inserted_id is null, 'questions insert blocked');

  v_err_caught := false;
  v_updated_count := 0;
  begin
    update public.quiz_questions set prompt = 'Hacked Question' where id = v_question;
    get diagnostics v_updated_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly updating quiz questions is blocked by RLS', v_err_caught or v_updated_count = 0, format('rows updated: %s, exception: %s', v_updated_count, v_err_caught));

  -- TEST 9: Calendar RLS: User B (viewer) cannot SELECT User A's (owner) calendar events
  v_selected_count := 0;
  select count(*) into v_selected_count
  from public.calendar_events
  where id = v_owner_event;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar RLS: User cannot select another users calendar events', v_selected_count = 0, format('events selected: %s', v_selected_count));

  -- TEST 10: Calendar RLS: User B cannot UPDATE User A's calendar events
  v_err_caught := false;
  v_updated_count := 0;
  begin
    update public.calendar_events set title = 'Hacked Event' where id = v_owner_event;
    get diagnostics v_updated_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar RLS: User cannot update another users calendar events', v_err_caught or v_updated_count = 0, format('events updated: %s, exception: %s', v_updated_count, v_err_caught));

  -- TEST 11: Calendar RLS: User B cannot DELETE User A's calendar events
  v_err_caught := false;
  v_deleted_count := 0;
  begin
    delete from public.calendar_events where id = v_owner_event;
    get diagnostics v_deleted_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar RLS: User cannot delete another users calendar events', v_err_caught or v_deleted_count = 0, format('events deleted: %s, exception: %s', v_deleted_count, v_err_caught));

  -- TEST 12: Calendar RLS: User B cannot INSERT with user_id = User A
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.calendar_events (user_id, title, event_type)
    values (v_owner, 'Spoofed Event', 'assignment')
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar RLS: User cannot insert event for another user_id', v_err_caught or v_inserted_id is null, 'spoofed insert blocked');

  -- TEST 13: Calendar RLS: User B cannot link a subject_id they have no access to
  v_err_caught := false;
  v_inserted_id := null;
  begin
    insert into public.calendar_events (user_id, subject_id, title, event_type)
    values (v_viewer, v_private_subject, 'Unauthorized Subject Link', 'assignment')
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar RLS: User cannot link subject_id with no access', v_err_caught or v_inserted_id is null, 'inaccessible subject blocked');

  -- TEST 14: Calendar Limits: User B cannot exceed 500 calendar events through direct inserts
  v_err_caught := false;
  v_err_msg := '';
  begin
    -- Insert 500 valid events
    for i in 1..500 loop
      insert into public.calendar_events (user_id, title, event_type)
      values (v_viewer, format('Event #%s', i), 'assignment');
    end loop;

    -- 501st insert must fail
    insert into public.calendar_events (user_id, title, event_type)
    values (v_viewer, 'Event #501 Exceeds Limit', 'assignment');
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Calendar Limit: User cannot exceed 500 events through direct inserts', v_err_caught and v_err_msg like '%500%', v_err_msg);

  -- TEST 15: Viewer cannot UPDATE decks
  v_err_caught := false;
  v_updated_count := 0;
  begin
    update public.decks set title = 'Hacked Deck' where id = v_deck;
    get diagnostics v_updated_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly updating decks is blocked by RLS', v_err_caught or v_updated_count = 0, format('rows updated: %s, exception: %s', v_updated_count, v_err_caught));

  -- TEST 16: Viewer cannot UPDATE quizzes
  v_err_caught := false;
  v_updated_count := 0;
  begin
    update public.quizzes set title = 'Hacked Quiz' where id = v_quiz;
    get diagnostics v_updated_count = row_count;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer directly updating quizzes is blocked by RLS', v_err_caught or v_updated_count = 0, format('rows updated: %s, exception: %s', v_updated_count, v_err_caught));

  -- TEST 17: Quiz answer keys unreadable by members (returns 0 rows)
  v_selected_count := 0;
  select count(*) into v_selected_count from public.quiz_answer_keys where question_id = v_question;
  insert into rls_test_results (test_name, passed, details)
  values ('Quiz answer keys unreadable by viewer/member', v_selected_count = 0, format('keys read: %s', v_selected_count));

  -- TEST 18: transfer_subject_ownership called directly by non-owner is rejected
  v_err_caught := false;
  v_err_msg := '';
  begin
    perform public.transfer_subject_ownership(v_subject, v_viewer);
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('transfer_subject_ownership called by non-owner is rejected', v_err_caught, v_err_msg);

  -- Switch context to OUTSIDER
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider::text, 'role', 'authenticated')::text, true);

  -- TEST 19: Outsider cannot SELECT materials, decks, or quizzes in private subject
  v_selected_count := 0;
  select count(*) into v_selected_count from public.materials where subject_id = v_subject;
  insert into rls_test_results (test_name, passed, details)
  values ('Outsider cannot read materials of a subject they do not belong to', v_selected_count = 0, format('materials read: %s', v_selected_count));

  -- =====================================================================
  -- EDITOR PERMISSIONS & RESTRICTIONS
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', v_editor::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_editor::text, 'role', 'authenticated')::text, true);

  -- TEST 20: Editor CAN insert materials
  v_inserted_id := null;
  begin
    insert into public.materials (subject_id, uploaded_by, title, source_type, status)
    values (v_subject, v_editor, 'Editor Notes', 'text', 'ready')
    returning id into v_inserted_id;
  exception when others then
    v_inserted_id := null;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can insert materials into subject', v_inserted_id is not null, format('material id: %s', v_inserted_id));

  -- TEST 21: Editor CAN update materials
  v_updated_count := 0;
  if v_inserted_id is not null then
    update public.materials set title = 'Editor Notes Updated' where id = v_inserted_id;
    get diagnostics v_updated_count = row_count;
  end if;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can update materials in subject', v_updated_count = 1, format('rows updated: %s', v_updated_count));

  -- TEST 22: Editor CAN insert decks and update decks
  v_inserted_id := null;
  begin
    insert into public.decks (subject_id, created_by, title)
    values (v_subject, v_editor, 'Editor Deck')
    returning id into v_inserted_id;
  exception when others then
    v_inserted_id := null;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can insert decks into subject', v_inserted_id is not null, format('deck id: %s', v_inserted_id));

  -- TEST 23: Editor CAN insert quizzes and update quizzes
  v_inserted_id := null;
  begin
    insert into public.quizzes (subject_id, created_by, title, question_types, question_count)
    values (v_subject, v_editor, 'Editor Quiz', array['mcq'], 1)
    returning id into v_inserted_id;
  exception when others then
    v_inserted_id := null;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can insert quizzes into subject', v_inserted_id is not null, format('quiz id: %s', v_inserted_id));

  -- TEST 24: Editor CAN access get_subject_share_key (for header invite button)
  v_err_caught := false;
  v_err_msg := '';
  begin
    perform public.get_subject_share_key(v_subject);
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can access get_subject_share_key for invite button', not v_err_caught, v_err_msg);

  -- TEST 25: Editor CANNOT delete subject (only owner can)
  v_deleted_count := 0;
  delete from public.subjects where id = v_subject;
  get diagnostics v_deleted_count = row_count;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor cannot delete subject', v_deleted_count = 0, format('rows deleted: %s', v_deleted_count));

  -- TEST 26: Editor CANNOT transfer ownership of subject
  v_err_caught := false;
  v_err_msg := '';
  begin
    perform public.transfer_subject_ownership(v_subject, v_editor);
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor cannot transfer subject ownership', v_err_caught, v_err_msg);

  -- =====================================================================
  -- STORAGE BUCKET POLICIES ('materials' bucket)
  -- =====================================================================
  -- TEST 27: Editor CAN upload file to materials bucket under subject prefix
  v_inserted_id := null;
  v_err_caught := false;
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('materials', v_subject::text || '/editor-guide.pdf', v_editor)
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Editor can upload files to materials storage bucket', v_inserted_id is not null, format('object id: %s', v_inserted_id));

  -- TEST 28: Viewer CANNOT upload file to materials storage bucket
  perform set_config('request.jwt.claim.sub', v_viewer::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_viewer::text, 'role', 'authenticated')::text, true);

  v_inserted_id := null;
  v_err_caught := false;
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('materials', v_subject::text || '/viewer-hack.pdf', v_viewer)
    returning id into v_inserted_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer cannot upload files to materials storage bucket', v_err_caught or v_inserted_id is null, 'viewer storage upload blocked');

  -- TEST 29: Viewer CAN select/download materials storage objects for their subject
  v_selected_count := 0;
  select count(*) into v_selected_count
  from storage.objects
  where bucket_id = 'materials' and name = (v_subject::text || '/editor-guide.pdf');
  insert into rls_test_results (test_name, passed, details)
  values ('Viewer can read/download materials files from their subject', v_selected_count = 1, format('files found: %s', v_selected_count));

  -- TEST 30: Outsider CANNOT select/download materials storage objects
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider::text, 'role', 'authenticated')::text, true);

  v_selected_count := 0;
  select count(*) into v_selected_count
  from storage.objects
  where bucket_id = 'materials' and name = (v_subject::text || '/editor-guide.pdf');
  insert into rls_test_results (test_name, passed, details)
  values ('Outsider cannot read/download materials storage files', v_selected_count = 0, format('files found: %s', v_selected_count));

  -- =====================================================================
  -- QUIZ LOCK TRIGGER BLOCKING EDITS AFTER A COUNTING ATTEMPT
  -- =====================================================================
  -- Reset role to superuser to record a counting attempt
  reset role;
  insert into public.attempts (id, subject_id, quiz_id, user_id, epoch, status, counts)
  values (gen_random_uuid(), v_subject, v_quiz, v_viewer, 1, 'graded', true);

  -- Switch context to EDITOR
  set role authenticated;
  perform set_config('request.jwt.claim.sub', v_editor::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_editor::text, 'role', 'authenticated')::text, true);

  -- TEST 31: Editing quiz_questions on a quiz with a counting attempt is BLOCKED by trigger
  v_err_caught := false;
  v_err_msg := '';
  begin
    update public.quiz_questions set prompt = 'Hacked prompt after points earned' where id = v_question;
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Quiz lock trigger blocks updating questions after a counting attempt',
          v_err_caught and v_err_msg like '%locked to preserve fairness%',
          v_err_msg);

  -- TEST 32: Adding new questions to a quiz with a counting attempt is BLOCKED by trigger
  v_err_caught := false;
  v_err_msg := '';
  begin
    insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, choices, points)
    values (gen_random_uuid(), v_quiz, 2, 'mcq', 'Rogue late question', '["A","B"]'::jsonb, 5);
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Quiz lock trigger blocks inserting questions after a counting attempt',
          v_err_caught and v_err_msg like '%locked to preserve fairness%',
          v_err_msg);

  -- =====================================================================
  -- USERNAME CONFLICT: "_" IS NOT A WILDCARD TEST
  -- =====================================================================
  reset role;
  declare
    v_u_a_b uuid := gen_random_uuid();
    v_u_axb uuid := gen_random_uuid();
    v_u_dup uuid := gen_random_uuid();
    v_uname_ok boolean := false;
    v_uname_dup_caught boolean := false;
  begin
    insert into auth.users (id, email) values (v_u_a_b, 'ab@test.com'), (v_u_axb, 'axb@test.com'), (v_u_dup, 'dup@test.com');
    
    -- User 1 sets username to 'a_b'
    set role authenticated;
    perform set_config('request.jwt.claim.sub', v_u_a_b::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_u_a_b::text, 'role', 'authenticated')::text, true);
    perform public.set_my_username('a_b');

    -- User 2 sets username to 'axb' - MUST SUCCEED (demonstrates '_' is not a wildcard)
    perform set_config('request.jwt.claim.sub', v_u_axb::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_u_axb::text, 'role', 'authenticated')::text, true);
    begin
      perform public.set_my_username('axb');
      v_uname_ok := true;
    exception when others then
      v_uname_ok := false;
    end;

    -- User 3 sets username to 'A_B' - MUST FAIL with 'already taken'
    perform set_config('request.jwt.claim.sub', v_u_dup::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_u_dup::text, 'role', 'authenticated')::text, true);
    begin
      perform public.set_my_username('A_B');
    exception when others then
      v_uname_dup_caught := sqlerrm like '%already taken%';
    end;

    reset role;
    insert into rls_test_results (test_name, passed, details)
    values ('Username check distinguishes literal underscore: a_b does not conflict with axb',
            v_uname_ok and v_uname_dup_caught,
            format('axb created: %s, A_B caught: %s', v_uname_ok, v_uname_dup_caught));
  end;

  -- Switch context back to OWNER for cascade delete check
  set role authenticated;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);

  -- TEST 20: Cascade delete succeeds even when quiz lock / attempts are active
  v_err_caught := false;
  v_err_msg := '';
  begin
    -- Delete the subject as owner
    delete from public.subjects where id = v_subject;
  exception when others then
    v_err_caught := true;
    v_err_msg := sqlerrm;
  end;
  insert into rls_test_results (test_name, passed, details)
  values ('Cascade delete of subject with active quiz lock succeeds', not v_err_caught, v_err_msg);

end $$;
