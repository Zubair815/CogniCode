import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";

export default function Quiz() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const questions = [
    {
      id: "q1",
      topic: "Recursion & Call Stack Analysis",
      prompt:
        "What will happen if the base case check is placed after the recursive call in a function?",
      code: `int factorial(int n) {
    // Problematic ordering
    int sub = factorial(n - 1);
    if (n <= 1) return 1;
    return n * sub;
}`,
      options: [
        { id: "A", text: "The code will execute normally and return 1." },
        {
          id: "B",
          text: "It causes infinite recursion, leading to a stack overflow error.",
          correct: true,
        },
        { id: "C", text: "A compilation error occurs because 'sub' is out of scope." },
        { id: "D", text: "The function returns 0 immediately." },
      ],
      explanation:
        "Because factorial(n-1) is evaluated before reaching `if (n <= 1)`, the program pushes stack frames indefinitely until stack memory is exhausted.",
    },
    {
      id: "q2",
      topic: "Binary Search Complexity",
      prompt:
        "Why does Binary Search require the input array to be sorted before execution?",
      code: `// Target element check
int mid = low + (high - low) / 2;
if (arr[mid] > target) high = mid - 1;`,
      options: [
        { id: "A", text: "Sorting is only required for cache locality." },
        {
          id: "B",
          text: "The monotonic order invariant allows safely discarding half the search space in O(1) per step.",
          correct: true,
        },
        { id: "C", text: "Unsorted arrays cannot be indexed by integer indices in O(1)." },
        { id: "D", text: "Because high and low pointers cannot point to negative values." },
      ],
      explanation:
        "The divide-and-conquer invariant relies on knowing that all elements to the right of `mid` are greater than or equal to `arr[mid]`. Without sorted order, that invariant does not hold.",
    },
  ];

  const currentQ = questions[currentIdx];

  const handleSelect = (id) => {
    if (submitted) return;
    setSelectedOption(id);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setSubmitted(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setCurrentIdx((currentIdx + 1) % questions.length);
  };

  const isCorrect =
    submitted && currentQ.options.find((o) => o.id === selectedOption)?.correct;

  return (
    <AppLayout activeCds={32}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Quizzes
          </h1>
          <span className="text-xs text-fg-muted">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>

        <Card>
          <div className="space-y-5">
            <div className="text-xs font-medium text-fg-secondary">
              {currentQ.topic}
            </div>

            <h2 className="text-lg font-semibold leading-snug text-fg">
              {currentQ.prompt}
            </h2>

            {currentQ.code && (
              <pre className="overflow-x-auto rounded-xl border border-line-subtle bg-code p-4 font-mono text-[13px] leading-relaxed text-fg">
                <code>{currentQ.code}</code>
              </pre>
            )}

            <div className="space-y-2" role="radiogroup" aria-label={currentQ.prompt}>
              {currentQ.options.map((opt) => {
                const selected = selectedOption === opt.id;
                let cls = "border-line-subtle bg-canvas hover:bg-hover";
                if (selected && !submitted) {
                  cls = "border-accent bg-accent-soft text-fg font-medium";
                } else if (submitted && opt.correct) {
                  cls = "border-success bg-success-soft text-fg font-medium";
                } else if (submitted && selected && !opt.correct) {
                  cls = "border-danger bg-danger-soft text-danger";
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={submitted}
                    onClick={() => handleSelect(opt.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors duration-fast ${cls}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-surface font-mono text-xs font-semibold">
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                    {submitted && opt.correct && (
                      <CheckCircle2 size={17} className="shrink-0 text-success" aria-label="Correct option" />
                    )}
                    {submitted && selected && !opt.correct && (
                      <XCircle size={17} className="shrink-0 text-danger" aria-label="Incorrect option" />
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <Alert
                tone={isCorrect ? "success" : "warning"}
                title={
                  isCorrect
                    ? "Correct — Level 3 pseudocode unlocked"
                    : "Review the invariant below"
                }
              >
                {currentQ.explanation}
              </Alert>
            )}

            <div className="flex items-center justify-between border-t border-line-subtle pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedOption(null);
                  setSubmitted(false);
                }}
                disabled={!selectedOption}
              >
                Reset
              </Button>

              {!submitted ? (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                >
                  Check answer
                </Button>
              ) : (
                <Button variant="primary" onClick={handleNext}>
                  Next question
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
