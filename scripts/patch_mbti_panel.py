from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/components/assessment/CareerAssessmentModal.tsx"
text = p.read_text(encoding="utf-8")

start = text.find('      <motion.div className="assessment-mbti">')
if start < 0:
    start = text.find('      <div className="assessment-mbti">')
end = text.find("    </StepBlock>", start)
if start < 0 or end < 0:
    raise SystemExit(f"not found start={start} end={end}")

new = """      <div className="assessment-mbti assessment-mbti--flat">
        {questions.map((q) => {
          const i = MBTI_QUESTIONS.indexOf(q);
          const picked = answers.mbtiVotes[i];
          return (
            <div key={q.id} className="assessment-mbti__item">
              {q.scene ? <p className="assessment-mbti__scene">{q.scene}</p> : null}
              <p className="assessment-mbti__q">{q.prompt}</p>
              <div className="assessment-mbti__opts">
                <button
                  type="button"
                  className={
                    picked === q.optionA.letter
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
                    picked === q.optionB.letter
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
      </div>
"""

text = text[:start] + new + text[end:]
text = text.replace('            {false ? <p className="assessment-mbti__dim" /> : null}\n            ', "")
p.write_text(text, encoding="utf-8")
print("patched")
