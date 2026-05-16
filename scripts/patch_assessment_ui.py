from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/components/assessment/CareerAssessmentModal.tsx"
text = p.read_text(encoding="utf-8")

start = text.find("              {step === 3 && (")
end = text.find("              {step === 4 && (")
if start < 0 or end < 0:
    raise SystemExit(f"markers not found: start={start} end={end}")

mbti_panel = """              {(step === 3 || step === 4) && MBTI_STEP_GROUPS[step - 3] ? (
                <MbtiStepPanel
                  group={MBTI_STEP_GROUPS[step - 3]!}
                  answers={answers}
                  onVote={setMbtiVote}
                />
              ) : null}

"""

text = text[:start] + mbti_panel + text[end:]

text = text.replace(
    '{step === 4 && (\n                <StepBlock title="职业兴趣情境题（霍兰德 RIASEC，共 6 题）">',
    '{step === 5 && (\n                <StepBlock title="职业兴趣情境题（霍兰德 RIASEC，共 9 题）">',
)
text = text.replace(
    "每题选择<strong>更愿意</strong>\n                    的一项，系统将据此推断您的兴趣组合。",
    "想象<strong>真实职场场景</strong>，选你更愿意投入的一项（无对错）。",
)

riasec_needle = """                    {RIASEC_SCENARIOS.map((s, i) => (
                      <motion.div key={s.id} className="assessment-mbti__item">
                        <p className="assessment-mbti__q">"""
riasec_needle2 = """                    {RIASEC_SCENARIOS.map((s, i) => (
                      <div key={s.id} className="assessment-mbti__item">
                        <p className="assessment-mbti__q">"""
riasec_repl = """                    {RIASEC_SCENARIOS.map((s, i) => (
                      <div key={s.id} className="assessment-mbti__item">
                        {s.scene ? (
                          <p className="assessment-mbti__scene">{s.scene}</p>
                        ) : null}
                        <p className="assessment-mbti__q">"""
for needle in (riasec_needle, riasec_needle2):
    if needle in text:
        text = text.replace(needle, riasec_repl)
        break

if "function MbtiStepPanel" not in text:
    insert_at = text.find("function StepBlock(")
    component = '''
function MbtiStepPanel({
  group,
  answers,
  onVote,
}: {
  group: { title: string; dimensions: ("ei" | "sn" | "tf" | "jp")[] };
  answers: AssessmentAnswers;
  onVote: (index: number, letter: MbtiLetter) => void;
}) {
  const stepIndex = group === MBTI_STEP_GROUPS[0] ? 1 : 2;
  const questionCount = group.dimensions.length * 3;

  return (
    <StepBlock title={`工作情境偏好 · ${group.title}（${stepIndex}/2，本步 ${questionCount} 题）`}>
      <p className="assessment-hint">
        无标准答案，请按<strong>第一反应</strong>选择——越贴近日常习惯，人格类型越稳定。
      </p>
      <div className="assessment-mbti">
        {group.dimensions.map((dim) => (
          <div key={dim} className="assessment-mbti__group">
            <p className="assessment-mbti__dim">
              {MBTI_DIMENSION_LABEL[dim][0]} / {MBTI_DIMENSION_LABEL[dim][1]}
            </p>
            {MBTI_QUESTIONS.filter((q) => q.dimension === dim).map((q) => {
              const i = MBTI_QUESTIONS.indexOf(q);
              return (
                <div key={q.id} className="assessment-mbti__item">
                  {q.scene ? <p className="assessment-mbti__scene">{q.scene}</p> : null}
                  <p className="assessment-mbti__q">{q.prompt}</p>
                  <div className="assessment-mbti__opts">
                    <button
                      type="button"
                      className={
                        answers.mbtiVotes[i] === q.optionA.letter
                          ? "assessment-opt assessment-opt--on"
                          : "assessment-opt"
                      }
                      onClick={() => onVote(i, q.optionA.letter)}
                    >
                      {q.optionA.label}
                    </button>
                    <button
                      type="button"
                      className={
                        answers.mbtiVotes[i] === q.optionB.letter
                          ? "assessment-opt assessment-opt--on"
                          : "assessment-opt"
                      }
                      onClick={() => onVote(i, q.optionB.letter)}
                    >
                      {q.optionB.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </motion.div>
    </StepBlock>
  );
}

'''
    component = component.replace("</motion.div>", "</motion.div>")
    component = component.replace(
        "          </motion.div>\n        ))}\n      </motion.div>",
        "          </div>\n        ))}\n      </div>",
    )
    text = text[:insert_at] + component + text[insert_at:]

p.write_text(text, encoding="utf-8")
print("patched ok")
