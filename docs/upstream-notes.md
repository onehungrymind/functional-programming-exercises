# Upstream notes

Places where the FP Jargon README is loose, imprecise, or where an exercise had to be written
against something stricter than the text says.

The plan's rule (section 6) is to write the exercise against the precise law and record the
divergence here as a candidate README fix, rather than quietly teaching the loose version.
Each entry below is a suggestion for upstream, not a complaint: the README is a glossary, and
a glossary is allowed to be brief. These are the points where brevity costs something.

Upstream commit these were read against: `62a3a2e`.

---

## constant-monad: not a lawful monad

**What the README says.** "Object whose `chain` doesn't transform the contents", with the
example `Constant(1).chain(n => Constant(n + 1)) // => Constant(1)`.

**The problem.** With that `chain`, the left identity law cannot hold. Left identity says
`M.of(a).chain(f)` equals `f(a)`. Since `chain` discards `f` entirely, the left-hand side
always carries whatever `of` produced, and the right-hand side carries whatever `f` chose. No
definition of `of` fixes it, because the two sides depend on different things.

Right identity and associativity both hold, so it is close to a monad, and the name is
understandable. But calling it one without qualification means a reader who then checks the
laws will conclude they have misunderstood the laws.

**What the exercise does.** The implement rung builds the `chain` the README describes and
verifies the two laws that do hold. The break rung has the learner produce the counterexample
that shows left identity failing. That turns the discrepancy into the lesson.

**Suggested README change.** One sentence: note that `Constant` satisfies the functor laws
for any contents and is an Applicative when the contents form a Monoid, but that its `chain`
does not satisfy left identity, so "monad" here is a name rather than a claim.

---

## monoid: the identity wording

**What the README says.** The Monoid section gives the identity law as a single equation.

**The problem.** A one-sided identity is easy to mistake for an identity. Subtraction has
`a - 0 === a` and looks fine until you try `0 - a`. The README's own counterexample is right,
but the law as stated does not make it obvious that *both* sides have to be checked.

**What the exercise does.** The `monoid` break rung makes the learner find the value that 0
fails to fix on the left, and separately a triple where the grouping changes the answer. Both
laws are stated as two equations in the law library.

**Suggested README change.** State left and right identity as separate lines.

---

## partial-function: "returns nothing" is two different failures

**What the README says.** Partial functions "might not return at all" and may "get an
unexpected (wrong) result or run into runtime errors".

**The problem.** Three genuinely different failures are bundled: throwing, returning
`undefined` where a value was promised, and not terminating. The third is the one most likely
to surprise, and it gets the least attention.

**What the exercise does.** The recognize rung separates them, including a recursive
`countDown` that never reaches its base case for a negative input, which is partial in the
third sense while looking total.

**Suggested README change.** None needed necessarily; the current wording covers it. Noted
here because the exercise leans on the distinction and a reader coming from the README may
not have it.
