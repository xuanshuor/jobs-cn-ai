import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { JobOccupation } from "@/core/types";

import type {
  AssessmentAnswers,
  AssessmentResult,
  MbtiLetter,
  RiasecCode,
} from "@/assessment/types";

import {
  AI_USAGE_OPTIONS,
  EDUCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  JOB_CATEGORIES,
  MBTI_DIMENSION_LABEL,
  MBTI_QUESTIONS,
  MBTI_STEP_GROUPS,
  mbtiCompleteForDimensions,
  RIASEC_OPTIONS,
  RIASEC_SCENARIOS,
  TASK_TAGS,
} from "@/assessment/questions";

import {
  evaluateAssessment,
  loadStoredResult,
  resolveRiasecTop,
  saveStoredResult,
} from "@/assessment/evaluate";

import {
  applyShareUrlToHistory,
  clearShareUrlFromHistory,
  parseShareFromLocation,
} from "@/assessment/share";

import { AssessmentShareActions } from "@/components/assessment/AssessmentShareActions";

import { computeImpactColorDomain, impactTileSolid } from "@/config/theme";

const TOTAL_STEPS = 7;

const DEFAULT_MBTI_VOTES: (MbtiLetter | "")[] = MBTI_QUESTIONS.map(() => "");

const DEFAULT_ANSWERS: AssessmentAnswers = {
  jobCategory: "",

  experienceYears: "",

  education: "",

  taskTags: [],

  aiToolUsage: 3,

  mbtiVotes: [...DEFAULT_MBTI_VOTES],

  riasecScenarioChoices: [],
};

type Phase = "quiz" | "result";

export function CareerAssessmentModal({
  jobs,

  open,

  onClose,

  initialResult = null,

  isSharedView = false,
}: {
  jobs: JobOccupation[];

  open: boolean;

  onClose: () => void;

  initialResult?: AssessmentResult | null;

  isSharedView?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(initialResult ? "result" : "quiz");

  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState<AssessmentAnswers>(DEFAULT_ANSWERS);

  const [result, setResult] = useState<AssessmentResult | null>(initialResult);

  const colorDomain = useMemo(
    () => computeImpactColorDomain(jobs.map((j) => j.aiImpact)),

    [jobs],
  );

  const riasecPreview = useMemo(
    () =>
      answers.riasecScenarioChoices.length === RIASEC_SCENARIOS.length
        ? resolveRiasecTop(answers.riasecScenarioChoices)
        : [],

    [answers.riasecScenarioChoices],
  );

  const canNext = useMemo(() => {
    if (step === 0) return !!answers.jobCategory;

    if (step === 1)
      return answers.taskTags.length >= 1 && answers.taskTags.length <= 4;

    if (step === 2) {
      return (
        !!answers.experienceYears &&
        !!answers.education &&
        answers.aiToolUsage > 0
      );
    }

    if (step === 3) {
      return mbtiCompleteForDimensions(
        answers.mbtiVotes,
        MBTI_STEP_GROUPS[0]!.dimensions,
      );
    }

    if (step === 4) {
      return mbtiCompleteForDimensions(answers.mbtiVotes, [
        "ei",
        "sn",
        "tf",
        "jp",
      ]);
    }

    if (step === 5) {
      return answers.riasecScenarioChoices.length === RIASEC_SCENARIOS.length;
    }

    return true;
  }, [step, answers]);

  const submit = useCallback(() => {
    const res = evaluateAssessment(answers, jobs);

    saveStoredResult(res);

    applyShareUrlToHistory(res);

    setResult(res);

    setPhase("result");
  }, [answers, jobs]);

  useEffect(() => {
    if (!open) return;

    if (initialResult) {
      setResult(initialResult);

      setPhase("result");
    }
  }, [open, initialResult]);

  const toggleTag = (value: string) => {
    setAnswers((a) => {
      const has = a.taskTags.includes(value);

      if (has) return { ...a, taskTags: a.taskTags.filter((t) => t !== value) };

      if (a.taskTags.length >= 4) return a;

      return { ...a, taskTags: [...a.taskTags, value] };
    });
  };

  const setMbtiVote = (index: number, letter: MbtiLetter) => {
    setAnswers((a) => {
      const next = [...a.mbtiVotes];

      next[index] = letter;

      return { ...a, mbtiVotes: next };
    });
  };

  const setRiasecChoice = (index: number, code: RiasecCode) => {
    setAnswers((a) => {
      const next = [...a.riasecScenarioChoices];

      next[index] = code;

      return { ...a, riasecScenarioChoices: next };
    });
  };

  if (!open) return null;

  return (
    <div className="assessment-overlay" role="presentation">
      <div
        className="assessment-backdrop"
        onClick={phase === "result" ? onClose : undefined}
        aria-hidden
      />

      <div
        className="assessment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-title"
      >
        {phase === "quiz" ? (
          <>
            <header className="assessment-header">
              <div>
                <h2 id="assessment-title">职业与 AI 替代风险测评</h2>

                <p className="assessment-sub">
                  约 4 分钟 · 对照本页 {jobs.length}{" "}
                  个职业样本与任务级模型估算（2030 示意）
                </p>
              </div>

              <button
                type="button"
                className="assessment-skip"
                onClick={onClose}
                aria-label="跳过测评"
              >
                跳过
              </button>
            </header>

            <div className="assessment-progress">
              <div
                className="assessment-progress__bar"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>

            <div className="assessment-body">
              {step === 0 && (
                <StepBlock title="您目前主要从事哪类工作？（选最贴近的一项）">
                  <OptionGrid
                    options={JOB_CATEGORIES}
                    value={answers.jobCategory}
                    onChange={(v) =>
                      setAnswers((a) => ({ ...a, jobCategory: v }))
                    }
                  />
                </StepBlock>
              )}

              {step === 1 && (
                <StepBlock title="日常工作包含哪些内容？（选 1–4 项，请选最常做的）">
                  <MultiOptionGrid
                    options={TASK_TAGS}
                    selected={answers.taskTags}
                    onToggle={toggleTag}
                    max={4}
                  />
                </StepBlock>
              )}

              {step === 2 && (
                <>
                  <StepBlock title="相关工作年限">
                    <OptionRow
                      options={EXPERIENCE_OPTIONS}
                      value={answers.experienceYears}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, experienceYears: v }))
                      }
                    />
                  </StepBlock>

                  <StepBlock title="最高学历（用于匹配样本岗位学历结构）">
                    <OptionRow
                      options={EDUCATION_OPTIONS}
                      value={answers.education}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, education: v }))
                      }
                    />
                  </StepBlock>

                  <StepBlock title="工作中使用 AI 工具（ChatGPT / Copilot 等）的频率">
                    <OptionRow
                      options={AI_USAGE_OPTIONS}
                      value={String(answers.aiToolUsage)}
                      onChange={(v) =>
                        setAnswers((a) => ({
                          ...a,
                          aiToolUsage: parseInt(v, 10),
                        }))
                      }
                    />
                  </StepBlock>
                </>
              )}

              {(step === 3 || step === 4) && MBTI_STEP_GROUPS[step - 3] ? (
                <MbtiStepPanel
                  group={MBTI_STEP_GROUPS[step - 3]!}
                  answers={answers}
                  onVote={setMbtiVote}
                />
              ) : null}

              {step === 5 && (
                <StepBlock title="职业兴趣情境题（霍兰德 RIASEC，共 9 题）">
                  <p className="assessment-hint">
                    想象<strong>真实职场场景</strong>，选你更愿意投入的一项（无对错）。
                  </p>

                  <div className="assessment-riasec-scenarios">
                    {RIASEC_SCENARIOS.map((s, i) => (
                      <div key={s.id} className="assessment-mbti__item">
                        {s.scene ? (
                          <p className="assessment-mbti__scene">{s.scene}</p>
                        ) : null}
                        <p className="assessment-mbti__q">
                          {i + 1}. {s.prompt}
                        </p>

                        <div className="assessment-mbti__opts">
                          <button
                            type="button"
                            className={
                              answers.riasecScenarioChoices[i] ===
                              s.optionA.code
                                ? "assessment-opt assessment-opt--on"
                                : "assessment-opt"
                            }
                            onClick={() => setRiasecChoice(i, s.optionA.code)}
                          >
                            {s.optionA.label}
                          </button>

                          <button
                            type="button"
                            className={
                              answers.riasecScenarioChoices[i] ===
                              s.optionB.code
                                ? "assessment-opt assessment-opt--on"
                                : "assessment-opt"
                            }
                            onClick={() => setRiasecChoice(i, s.optionB.code)}
                          >
                            {s.optionB.label}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {riasecPreview.length === 3 ? (
                    <p className="assessment-hint assessment-hint--preview">
                      当前兴趣排序：
                      {riasecPreview

                        .map(
                          (c) =>
                            RIASEC_OPTIONS.find((r) => r.code === c)?.label,
                        )

                        .join(" → ")}
                    </p>
                  ) : null}
                </StepBlock>
              )}

              {step === 6 && (
                <StepBlock title="确认提交">
                  <p className="assessment-confirm">
                    将根据您的岗位类别、任务结构、年限学历与兴趣倾向，在本站{" "}
                    {jobs.length} 个职业样本中匹配相近岗位，并结合任务级 AI
                    前沿模型估算 <strong>2030 示意情景</strong> 下的替代风险。
                  </p>

                  <ul className="assessment-summary-list">
                    <li>
                      岗位：
                      {
                        JOB_CATEGORIES.find(
                          (c) => c.value === answers.jobCategory,
                        )?.label
                      }
                    </li>

                    <li>任务：{answers.taskTags.length} 项已选</li>

                    <li>
                      人格（MBTI 示意）：
                      {mbtiCompleteForDimensions(answers.mbtiVotes, [
                        "ei",
                        "sn",
                        "tf",
                        "jp",
                      ])
                        ? "已答完 12 题"
                        : "未完成"}
                    </li>

                    <li>
                      兴趣（RIASEC）：
                      {riasecPreview.length === 3
                        ? riasecPreview

                            .map(
                              (c) =>
                                RIASEC_OPTIONS.find((r) => r.code === c)?.label,
                            )

                            .join("、")
                        : "未完成"}
                    </li>
                  </ul>
                </StepBlock>
              )}
            </div>

            <footer className="assessment-footer">
              <button
                type="button"
                className="assessment-btn assessment-btn--ghost"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                上一步
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  className="assessment-btn assessment-btn--primary"
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                >
                  下一步
                </button>
              ) : (
                <button
                  type="button"
                  className="assessment-btn assessment-btn--primary"
                  disabled={!canNext}
                  onClick={submit}
                >
                  查看评估结果
                </button>
              )}
            </footer>
          </>
        ) : (
          result && (
            <AssessmentResultView
              result={result}
              colorDomain={colorDomain}
              onClose={onClose}
              isSharedView={isSharedView}
              onRetake={() => {
                clearShareUrlFromHistory();

                setPhase("quiz");

                setStep(0);

                setAnswers(DEFAULT_ANSWERS);

                setResult(null);
              }}
            />
          )
        )}
      </div>
    </div>
  );
}

export function useCareerAssessment(jobs: JobOccupation[]) {
  const sharedFromUrl = useMemo(
    () => (typeof window !== "undefined" ? parseShareFromLocation() : null),

    [],
  );

  const stored = loadStoredResult();

  const [open, setOpen] = useState(() => {
    if (sharedFromUrl) return true;

    return !stored;
  });

  return {
    assessmentOpen: open,

    setAssessmentOpen: setOpen,

    storedResult: stored ?? sharedFromUrl,

    modal: (
      <CareerAssessmentModal
        jobs={jobs}
        open={open}
        onClose={() => setOpen(false)}
        initialResult={sharedFromUrl ?? stored}
        isSharedView={
          !!sharedFromUrl &&
          (!stored || stored.completedAt !== sharedFromUrl.completedAt)
        }
      />
    ),
  };
}


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
        都是身边可能发生的小事（扶人、敬酒、赶会、查 Wi‑Fi…），无标准答案，请按<strong>第一反应</strong>选。
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
          </div>
        ))}
      </div>
    </StepBlock>
  );
}

function StepBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="assessment-step">
      <h3>{title}</h3>

      {children}
    </section>
  );
}

function OptionGrid({
  options,

  value,

  onChange,
}: {
  options: { value: string; label: string }[];

  value: string;

  onChange: (v: string) => void;
}) {
  return (
    <div className="assessment-grid">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={
            value === o.value
              ? "assessment-opt assessment-opt--on"
              : "assessment-opt"
          }
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiOptionGrid({
  options,

  selected,

  onToggle,

  max,
}: {
  options: { value: string; label: string }[];

  selected: string[];

  onToggle: (v: string) => void;

  max: number;
}) {
  return (
    <div className="assessment-grid">
      {options.map((o) => {
        const on = selected.includes(o.value);

        const disabled = !on && selected.length >= max;

        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            className={
              on ? "assessment-opt assessment-opt--on" : "assessment-opt"
            }
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OptionRow({
  options,

  value,

  onChange,
}: {
  options: { value: string; label: string }[];

  value: string;

  onChange: (v: string) => void;
}) {
  return (
    <div className="assessment-row">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={
            value === o.value
              ? "assessment-opt assessment-opt--on"
              : "assessment-opt"
          }
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AssessmentResultView({
  result,

  colorDomain,

  onClose,

  onRetake,

  isSharedView = false,
}: {
  result: AssessmentResult;

  colorDomain: ReturnType<typeof computeImpactColorDomain>;

  onClose: () => void;

  onRetake: () => void;

  isSharedView?: boolean;
}) {
  const riskColor = impactTileSolid(
    (result.replacementRiskPct / 100) * 10,

    colorDomain,
  );

  return (
    <>
      <header className="assessment-header">
        <div>
          <h2 id="assessment-title">您的测评结果</h2>

          <p className="assessment-sub">示意评估 · 非职业心理咨询或官方预测</p>
        </div>
      </header>

      <div className="assessment-body assessment-body--result">
        <section className="assessment-result-card assessment-result-card--risk">
          <h3>职业被 AI 替代可能性（2030 示意）</h3>

          <div className="assessment-risk-meter">
            <span
              className="assessment-risk-value"
              style={{ color: riskColor }}
            >
              {result.replacementRiskPct}%
            </span>

            <span className="assessment-risk-level">
              {result.replacementLevel}风险
            </span>
          </div>

          <p className="assessment-result-note">{result.replacementSummary}</p>

          <p className="assessment-hint">
            参照样本岗位「{result.matchedRoleTitle}」（综合压力{" "}
            {result.benchmarkImpact.toFixed(1)}/10）
          </p>
        </section>

        <section className="assessment-result-card">
          <h3>人格类型</h3>

          <div className="assessment-personality">
            <span className="assessment-mbti-type">
              {result.personalityType}
            </span>

            <span className="assessment-mbti-sub">
              {result.personalitySubtitle}
            </span>
          </div>

          <div className="assessment-tags">
            {result.personalityTraits.map((t) => (
              <span key={t} className="assessment-tag">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section className="assessment-result-card">
          <h3>建议关注的行业方向</h3>

          <ul className="assessment-industry-list">
            {result.recommendedIndustries.map((ind, i) => (
              <li key={ind.industryLabel}>
                <div className="assessment-industry-list__head">
                  <span className="assessment-industry-rank">{i + 1}</span>

                  <strong>{ind.industryLabel}</strong>

                  <span className="assessment-industry-risk">
                    行业均值替代约 {ind.avgReplacementRisk}%
                  </span>
                </div>

                <p>{ind.reason}</p>
              </li>
            ))}
          </ul>
        </section>

        <AssessmentShareActions result={result} />
      </div>

      <footer className="assessment-footer assessment-footer--result">
        {!isSharedView ? (
          <button
            type="button"
            className="assessment-btn assessment-btn--ghost"
            onClick={onRetake}
          >
            重新测评
          </button>
        ) : (
          <button
            type="button"
            className="assessment-btn assessment-btn--ghost"
            onClick={onRetake}
          >
            我也要测评
          </button>
        )}

        <button
          type="button"
          className="assessment-btn assessment-btn--primary"
          onClick={onClose}
        >
          {isSharedView ? "查看数据地图" : "进入数据地图"}
        </button>
      </footer>
    </>
  );
}
