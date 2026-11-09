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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: automator } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

console.log("Automator ID:", automator?.id);

// Check subject
const { data: subject } = await admin
  .from("subjects")
  .select("id, name, owner_id")
  .eq("owner_id", automator.id)
  .single();

console.log("Subject:", subject);

// Ensure membership in library_entries has role='owner'
const { data: libEntry } = await admin
  .from("library_entries")
  .select("role")
  .eq("user_id", automator.id)
  .eq("subject_id", subject.id)
  .maybeSingle();

console.log("Library entry:", libEntry);

if (!libEntry) {
  await admin.from("library_entries").insert({
    user_id: automator.id,
    subject_id: subject.id,
    role: "owner",
    pinned: true,
  });
}

// Try inserting a quiz with subject_id
const { data: quiz, error: quizErr } = await admin
  .from("quizzes")
  .insert({
    subject_id: subject.id,
    title: "Cell Biology Practice Quiz",
    difficulty: "easy",
    question_count: 2,
    question_types: ["multiple_choice", "true_false"],
    time_limit_minutes: 5,
    max_score: 20,
    created_by: automator.id,
  })
  .select()
  .single();

if (quizErr) {
  console.log("Quiz error:", quizErr);
} else {
  console.log("Quiz created:", quiz.id);

  const { data: q1 } = await admin
    .from("quiz_questions")
    .insert({
      quiz_id: quiz.id,
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
      quiz_id: quiz.id,
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
      explanation: "Glycolysis occurs in the cytosol, not the mitochondria.",
    });
  }

  // Create an in-progress attempt for taking
  const { data: takeAtt } = await admin
    .from("attempts")
    .insert({
      quiz_id: quiz.id,
      subject_id: subject.id,
      user_id: automator.id,
      status: "in_progress",
      score: 0,
      max_score: 20,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  console.log("Take Attempt ID:", takeAtt?.id);

  // Create a graded attempt for results
  const { data: resAtt } = await admin
    .from("attempts")
    .insert({
      quiz_id: quiz.id,
      subject_id: subject.id,
      user_id: automator.id,
      status: "graded",
      score: 20,
      max_score: 20,
      counts: true,
      epoch: 1,
      started_at: new Date(Date.now() - 300000).toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (resAtt && q1 && q2) {
    await admin.from("attempt_answers").insert([
      {
        attempt_id: resAtt.id,
        question_id: q1.id,
        response: { index: 1 },
        is_correct: true,
        points: 10,
        feedback: "Correct! Mitochondria are the powerhouse.",
      },
      {
        attempt_id: resAtt.id,
        question_id: q2.id,
        response: { value: false },
        is_correct: true,
        points: 10,
        feedback: "Correct! It occurs in the cytosol.",
      },
    ]);
  }

  console.log("Results Attempt ID:", resAtt?.id);
}
