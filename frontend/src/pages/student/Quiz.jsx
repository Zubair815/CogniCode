import { useState } from "react";
import { TestTube2, CheckCircle2, XCircle, AlertCircle, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";

export default function Quiz() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const questions = [
    {
      id: "q1",
      topic: "Recursion & Call Stack Analysis",
      prompt: "What will happen if the base case check is placed after the recursive call in a function?",
      code: `int factorial(int n) {
    // Problematic ordering
    int sub = factorial(n - 1);
    if (n <= 1) return 1;
    return n * sub;
}`,
      options: [
        { id: "A", text: "The code will execute normally and return 1." },
        { id: "B", text: "It causes infinite recursion, leading to a stack overflow error.", correct: true },
        { id: "C", text: "A compilation error occurs because 'sub' is out of scope." },
        { id: "D", text: "The function returns 0 immediately." },
      ],
      explanation:
        "Because factorial(n-1) is evaluated before reaching the check `if (n <= 1)`, the program pushes continuous frames onto the stack without stopping until memory is exhausted.",
    },
    {
      id: "q2",
      topic: "Binary Search Complexity",
      prompt: "Why does Binary Search require the input array to be sorted before execution?",
      code: `// Target element check
int mid = low + (high - low) / 2;
if (arr[mid] > target) high = mid - 1;`,
      options: [
        { id: "A", text: "Sorting is only required for cache locality." },
        { id: "B", text: "The monotonic order property allows safely eliminating half the search space in O(1) per step.", correct: true },
        { id: "C", text: "Unsorted arrays cannot be indexed by integer indices in O(1)." },
        { id: "D", text: "Because high and low pointers cannot point to negative values." },
      ],
      explanation:
        "The divide-and-conquer invariant depends on knowing that all elements to the right of `mid` are greater than or equal to `arr[mid]`. Without sorted order, this invariant fails.",
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

  const isCorrect = submitted && currentQ.options.find((o) => o.id === selectedOption)?.correct;

  return (
    <AppLayout activeCds={32}>
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <TestTube2 className="text-[color:var(--primary)]" />
              Code Understanding Checks
            </h1>
            <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
              Verify conceptual grasp before unlocking higher-level progressive hints (Level 3+).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border)] font-semibold">
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[color:var(--primary)] uppercase tracking-wider">
              {currentQ.topic}
            </span>
            <span className="text-xs text-[color:var(--text-muted)] font-mono">
              Conceptual Gate
            </span>
          </div>

          <h2 className="text-base md:text-lg font-bold text-[color:var(--text)]">
            {currentQ.prompt}
          </h2>

          {/* Code Block */}
          {currentQ.code && (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 font-mono text-xs overflow-x-auto text-[color:var(--text)]">
              <pre>
                <code>{currentQ.code}</code>
              </pre>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt) => {
              const selected = selectedOption === opt.id;
              let style = "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--primary)]/40";
              if (selected && !submitted) {
                style = "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--text)] font-semibold";
              } else if (submitted && opt.correct) {
                style = "border-[color:var(--success)] bg-[color:var(--success)]/10 text-[color:var(--success)] font-semibold";
              } else if (submitted && selected && !opt.correct) {
                style = "border-[color:var(--danger)] bg-[color:var(--danger)]/10 text-[color:var(--danger)]";
              }

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`p-4 rounded-xl border text-xs md:text-sm cursor-pointer transition-all flex items-center justify-between ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[color:var(--surface-2)] flex items-center justify-center font-bold text-xs shrink-0">
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                  {submitted && opt.correct && <CheckCircle2 size={18} className="text-[color:var(--success)] shrink-0" />}
                  {submitted && selected && !opt.correct && <XCircle size={18} className="text-[color:var(--danger)] shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {submitted && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                isCorrect
                  ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--text)]"
                  : "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--text)]"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {isCorrect ? (
                  <>
                    <CheckCircle2 size={16} className="text-[color:var(--success)]" />
                    Correct! Level 3 Pseudocode Unlocked
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-[color:var(--warning)]" />
                    Concept Review Needed
                  </>
                )}
              </div>
              <p className="text-[color:var(--text-muted)] mt-1">{currentQ.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOption(null);
                setSubmitted(false);
              }}
              disabled={!selectedOption}
            >
              <RotateCcw size={14} className="mr-1" />
              Reset Choice
            </Button>

            {!submitted ? (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!selectedOption}
              >
                Submit Answer
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext}>
                Next Check <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
