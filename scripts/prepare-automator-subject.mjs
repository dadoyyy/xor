import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: automator } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!automator) {
  console.error("xor_automator not found");
  process.exit(1);
}

// Check if xor_automator already owns a test subject
let { data: ownedSub } = await admin
  .from("subjects")
  .select("id, name")
  .eq("owner_id", automator.id)
  .maybeSingle();

let testSubjectId = ownedSub?.id;

if (!testSubjectId) {
  console.log("Creating a test subject for xor_automator...");
  const crypto = await import("crypto");
  const randomKey = `bio-${crypto.randomBytes(4).toString("hex")}`;

  const { data: newSub, error: subErr } = await admin
    .from("subjects")
    .insert({
      name: "Biology 101: Cell Theory",
      description: "Fundamental concepts of cell biology, respiration, and genetics.",
      owner_id: automator.id,
      share_key: randomKey,
      share_enabled: true,
      allow_fork: true,
    })
    .select()
    .single();

  if (subErr || !newSub) {
    console.error("Failed to create test subject:", subErr?.message);
    process.exit(1);
  }
  testSubjectId = newSub.id;

  // Add library entry
  await admin.from("library_entries").insert({
    user_id: automator.id,
    subject_id: testSubjectId,
    role: "owner",
    pinned: true,
  });

  // Add a sample deck
  const { data: newDeck } = await admin
    .from("decks")
    .insert({
      subject_id: testSubjectId,
      title: "Cell Organelles & Energy",
      difficulty: "medium",
      created_by: automator.id,
    })
    .select()
    .single();

  if (newDeck) {
    await admin.from("cards").insert([
      {
        deck_id: newDeck.id,
        front: "What is the powerhouse of the cell?",
        back: "Mitochondria: site of cellular respiration and ATP synthesis.",
        position: 1,
      },
      {
        deck_id: newDeck.id,
        front: "Where does photosynthesis occur in plant cells?",
        back: "Chloroplasts containing chlorophyll pigments.",
        position: 2,
      },
      {
        deck_id: newDeck.id,
        front: "What is the function of the cell membrane?",
        back: "Selectively regulates the transport of substances into and out of the cell.",
        position: 3,
      },
    ]);
  }

  // Add a sample quiz
  const { data: newQuiz } = await admin
    .from("quizzes")
    .insert({
      subject_id: testSubjectId,
      title: "Cell Biology Practice Quiz",
      difficulty: "easy",
      question_count: 3,
      time_limit_minutes: 5,
      max_score: 30,
      created_by: automator.id,
    })
    .select()
    .single();

  if (newQuiz) {
    const { data: q1 } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: newQuiz.id,
        position: 1,
        qtype: "multiple_choice",
        prompt: "Which organelle generates the majority of cellular ATP via oxidative phosphorylation?",
        choices: {
          options: ["Ribosome", "Mitochondrion", "Golgi apparatus", "Peroxisome"],
        },
        points: 10,
      })
      .select()
      .single();

    if (q1) {
      await admin.from("quiz_answer_keys").insert({
        question_id: q1.id,
        answer: { index: 1 },
        explanation: "Mitochondria produce over 90% of cellular ATP via the electron transport chain.",
      });
    }

    const { data: q2 } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: newQuiz.id,
        position: 2,
        qtype: "true_false",
        prompt: "Glycolysis takes place inside the mitochondrial matrix.",
        choices: { options: ["True", "False"] },
        points: 10,
      })
      .select()
      .single();

    if (q2) {
      await admin.from("quiz_answer_keys").insert({
        question_id: q2.id,
        answer: { value: false },
        explanation: "Glycolysis occurs in the cytoplasm/cytosol, not inside the mitochondria.",
      });
    }

    const { data: q3 } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: newQuiz.id,
        position: 3,
        qtype: "identification",
        prompt: "Name the high-energy molecule that cells use as their primary energy currency.",
        choices: null,
        points: 10,
      })
      .select()
      .single();

    if (q3) {
      await admin.from("quiz_answer_keys").insert({
        question_id: q3.id,
        answer: { text: "ATP" },
        explanation: "Adenosine triphosphate (ATP) is the universal cellular energy carrier.",
      });
    }

    // Add a completed graded attempt for the results screen
    const { data: att } = await admin
      .from("attempts")
      .insert({
        quiz_id: newQuiz.id,
        subject_id: testSubjectId,
        user_id: automator.id,
        status: "graded",
        score: 30,
        max_score: 30,
        counts: true,
        epoch: 1,
        started_at: new Date(Date.now() - 300000).toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (att && q1 && q2 && q3) {
      await admin.from("attempt_answers").insert([
        {
          attempt_id: att.id,
          question_id: q1.id,
          response: { index: 1 },
          is_correct: true,
          points: 10,
          feedback: "Correct! Mitochondria are the powerhouse.",
        },
        {
          attempt_id: att.id,
          question_id: q2.id,
          response: { value: false },
          is_correct: true,
          points: 10,
          feedback: "Correct! It occurs in the cytosol.",
        },
        {
          attempt_id: att.id,
          question_id: q3.id,
          response: { text: "ATP" },
          is_correct: true,
          points: 10,
          feedback: "Correct!",
        },
      ]);
    }
  }
}

console.log("Ready! Test Subject ID:", testSubjectId);
