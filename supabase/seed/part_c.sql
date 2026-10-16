insert into public.open_questions (id, chapter, num, question, model_answer, part) values
('part-c', null, 1, 'Part C (16 points): What are your 4 key takeaways from this course so far, and how do they affect your life (application)? Relate each takeaway to a management concept. Keep it short and concise – there is a word limit.', 'Example answer (≈ 300 words – adapt it with your own experiences):

1. Efficiency vs. effectiveness (Ch. 1) – Being busy is not the same as achieving the right goals. Effectiveness means "doing the right things", efficiency "doing things right". Application: before studying, I now first decide which topics matter most for the exam (effectiveness) and then use spaced repetition to learn them with less time (efficiency).

2. Bounded rationality and decision biases (Ch. 2) – We never have all information, so we satisfice, and biases like overconfidence, confirmation bias or escalation of commitment distort our choices. Application: for big decisions (choosing an internship or a major), I write down my criteria and weights, actively look for information that contradicts my first choice, and I''m willing to drop a bad plan instead of sticking to it.

3. Change is constant – "white-water rapids" (Ch. 5) – Lewin''s unfreeze–change–refreeze shows that change needs driving forces to be increased and restraining forces reduced, and creativity turns into innovation only in the right environment. Application: when I started university in a new city, I accepted that change is normal, reduced my restraining forces (fear, old routines) and built new habits on purpose so they "refreeze".

4. People are the key resource – HRM and diversity (Ch. 8) – Organizations succeed by obtaining, training, motivating and retaining competent people, and a diverse team brings more perspectives. Application: in group projects I now pay attention to everyone''s strengths (like a job analysis), divide tasks accordingly and make sure quieter or international team members are included.

Overall, management is not only for managers: planning, deciding, adapting to change and working with diverse people are skills I use every day as a student and will use in my future career.

Tips for the exam: name the concept explicitly, define it in one sentence, give ONE concrete personal example, and keep each takeaway to 3–4 sentences.', 'C')
on conflict (id) do update set question = excluded.question, model_answer = excluded.model_answer, part = excluded.part;
