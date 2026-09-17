# Teaching this in a day

A plan for standing in front of a room with this material for six hours. Not a syllabus for
the app, which already has one in `apps/web/src/curriculum.ts` and is a different thing: that
order is for somebody working alone at their own pace, and it covers all 73 concepts because
it has no clock.

A day does not cover 73 concepts. A day covers about 22 of them properly and leaves a map to
the rest. Trying for more is how you end up with an audience that saw everything and can do
nothing.

Every rung named below is a real one. Open it with `#/term/<concept>/practice/<rung>` against
`npm run dev`, and keep `solutions.html` open on the second screen.

## The shape

| | Session | Minutes | Concepts | Ends on |
|---|---|---|---|---|
| 1 | What a function actually is | 75 | 6 | Pure Function |
| 2 | Building big things out of small ones | 60 | 5 | Point-Free Style |
| | break | 60 | | |
| 3 | Purity, and what it buys | 75 | 5 | Memoization |
| 4 | Making bad states unwritable | 70 | 5 | Either |
| 5 | The words people use to sound clever | 70 | 5 | Monad |

Six hours of content, one hour of lunch, and the two fifteen-minute breaks come out of the
session times rather than being added to them.

## Session 1 - What a function actually is

**Concepts.** Function, Arity, Lambda, Higher-Order Functions, Closure, Pure Function.

**Open with** `#/term/function/practice/repair`. Three definitions, each breaking exactly one
of the three requirements: one has a gap in its inputs, one gives a different answer every
time, one reaches outside itself for the clock. Everyone in the room has shipped all three.
Fix them live, and the definition of "function" stops being pedantry.

**Then** `#/term/closure/practice/instances`. Two bank accounts that cannot reach each other.
The check that matters is the one listing any number sitting on the returned object, because
that is the difference between private state and state you are hoping nobody touches.

**What gets asked.**

- "Is a method a function?" Yes, and `this` is why people think otherwise. Arity and the
  `fn.length` material is where that lands.
- "Why would I care what `fn.length` says?" Because auto-currying reads it.
  `#/term/arity/practice/curry-by-length` is a break rung that watches it go wrong: a
  three-parameter function with one default reports 2, so currying by length calls through a
  step early. Run it if the question comes up, skip it if it does not.
- "Isn't a lambda just a function?" Yes. The word is about how it is used, not what it is.

**Stop at Pure Function.** Thunk, Partial function, Total Function and Trampoline are in the
same category and are not load bearing for the rest of the day. Name them, point at the app.

## Session 2 - Building big things out of small ones

**Concepts.** Partial Application, Currying, Auto Currying, Function Composition, Point-Free
Style.

**Open with** `#/term/partial-application/practice/versus`. It builds the same specialised
function twice, once with `partial` and once with `curry3`, which settles the distinction in
one screen rather than three slides.

**The one to keep** is `#/term/point-free-style/practice/judgement`. It asks for point-free in
one direction and for the argument back in the other. A room that has been told point-free is
the goal for twenty minutes visibly relaxes when the exercise says it is a readability choice
and not a virtue. If you only run one demo this session, run this one.

**Then** `#/term/function-composition/practice/laws`, which has compose, pipe, and the laws
between them: reversing the arguments turns one into the other, identity vanishes from both
sides, composing nothing is the identity. Those three facts are what make composition
something you can reason with rather than a style.

**What gets asked.**

- "When is point-free too clever?" The rung answers it, which is the point of running it.
- "Does any of this hurt performance?" Honestly, a little, and almost never where it matters.
  Do not oversell. Say you would measure before caring.
- "Curry or partial?" Partial takes as many as you hand it, curry takes exactly one. The
  `versus` rung is on screen already.

**Stop at Point-Free Style.** Functional Combinator, Continuation, Lazy evaluation, IO and
Algebraic Effects all live here and all cost more time than they return in a first day.
Continuation and IO are worth naming, because people have met both without the words.

## Session 3 - Purity, and what it buys

**Concepts.** Side effects, Referential Transparency, Equational Reasoning, Idempotence,
Memoization.

**Open with** `#/term/side-effects/practice/reads`. Splitting a greeting that consults the
clock and the dice. The check that fails the pure half if anything at all was recorded is what
makes "reading is an effect too" land, because most people only count writes.

**The one to keep** is `#/term/referential-transparency/practice/the-test`. Writing the
substitution test is the moment this stops being philosophy: call it twice, compare, watch for
a read of the clock, snapshot the arguments to catch a write. Four ways a call can fail to
stand in for its own result, and you built the thing that finds them.

**Then** `#/term/equational-reasoning/practice/needs-purity`. Rewriting `f(x) + f(x)` as
`2 * f(x)` is the most ordinary optimisation there is. With a counter for `f` it gives 3 one
way and 2 the other. That is the whole reason purity is worth anything, in one screen.

**What gets asked.**

- "So no side effects, ever?" No. Effects are relocated, not eliminated, and the rung says so
  in its own rubric. Push them to the edge and keep the middle substitutable.
- "Is `console.log` impure?" Yes, and it does not matter much. Be relaxed about this one or
  you will lose the room.
- "Isn't memoization just caching?" Yes, and it is only safe for pure functions.
  `#/term/memoization/practice/cache` ends by memoizing something that counts and showing that
  the first answer is the only one anybody sees again.

**Stop at Memoization.** Value, Constant, Constant Function and Contracts are all real and
none of them will change how anyone works on Monday.

## Session 4 - Making bad states unwritable

This is the session a working team gets the most out of. Protect its time.

**Concepts.** Algebraic data type, Product type, Sum type, Option, Either.

**Open with** `#/term/algebraic-data-type/practice/arithmetic`. Counting the values a type can
hold, including the two edge cases: a product of no fields has one value and a sum of no cases
has none. Five minutes, and the names stop being a metaphor.

**The one to keep** is `#/term/sum-type/practice/from-flags`. Replace a bag of booleans and
optional fields with a tagged union, then list the states the flags permit and the union has
no room for: loading while already holding data, neither loading nor data nor error, a result
and a failure together. Every team in the room has that shape in their codebase right now.

**Then the typed lap.** `#/term/sum-type/practice/typed` for `assertNever`: add a fourth member
to the union and the default branch stops narrowing to `never`, so the compiler points at every
switch that was not updated. Without it the switch falls through and returns undefined and you
find out in production. If the room is a TypeScript room, this is the highest-value ten minutes
of the day.

**Then** Option and Either, quickly. The thing to show is `map`'s signature on Either:
`A` becomes `B` and `E` goes in and out untouched, so right-bias is not a convention somebody
agreed on, it is written in the type.

**What gets asked.**

- "We already use TypeScript, do we need this?" TypeScript is what makes it enforceable. The
  question is whether you are modelling states or accumulating optional fields.
- "What about the API boundary?" Parse at the edge into the union, and the inside never deals
  with the loose shape. This is where Option's `fromNullable` earns its keep.
- "Do we need a library?" No. The union is four lines.

**Stop at Either.** Lens, Prism, Iso and Traversal are all here and all have typed laps, and
they are a second day.

## Session 5 - The words people use to sound clever

**Concepts.** Setoid, Semigroup, Monoid, Functor, Monad.

The frame for the whole session: these are names for shapes people were already writing. Say
that at the start and again at the end.

**Open with** Semigroup and Monoid together, through
`#/term/monoid/practice/typed-read`. Folding the empty list with sum, product and a
deliberately wrong monoid. The interface is one line longer than Semigroup's, and the extra
line is a value rather than a function, and that single value is what makes folding total.

**The one to keep** is `#/term/monad/practice/typed-read`. Two signatures:

```ts
map:   <B>(f: (a: A) => B)        => Maybe<B>
chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
```

Ask what `map(head)` gives you and what `chain(head)` gives you. The answer is two layers and
one layer. If `chain` behaved like `map` its return type would have to be `Maybe<Maybe<B>>`,
so `chain` must be dropping exactly one. There is nowhere else for the layer to go.

That is the monad explanation. No burrito, no space suit, no category theory. Thirty seconds
of reading two lines.

**Then** `#/term/functor/practice/break-composition` if there is time. A map that satisfies
identity and fails composition, which is the shape most broken functors actually have. It is
the rung that shows the laws are load bearing rather than decorative.

**What gets asked.**

- "Why is this explained so badly everywhere?" Because most explanations start from where the
  idea came from rather than what it does. Do not be smug about this; just do it differently.
- "Do I need category theory?" No.
- "What is the practical use?" Chaining operations that can each fail, without nesting. Show
  `#/term/kleisli-composition/practice/typed-read` if pressed: ordinary compose infers
  `B = Maybe<number>` from `f` and hands it to a `g` that wants `number`, and the mismatch is
  one wrapper in one place.

**Stop at Monad.** There are fifteen more concepts in Algebraic Structures and twelve in
Category and Morphisms. Show the graph, say they are all in the app with the same treatment,
and stop.

## If you are running late

Cut in this order, and cut whole things rather than rushing everything:

1. Session 1's Arity material past the definition.
2. Session 2's Function Composition laws. Keep the point-free judgement rung.
3. Session 3's Idempotence and Memoization.
4. Session 5's Setoid, and the Functor law-breaking rung.

Do not cut Session 4. If the day is collapsing, cut Session 5 to twenty minutes of just the
two monad signatures and give Session 4 the rest.

## The three demos, if you only keep three

1. `#/term/sum-type/practice/from-flags` - the states your codebase can represent and should
   not be able to.
2. `#/term/referential-transparency/practice/the-test` - build the thing that decides whether a
   call can be replaced by its result.
3. `#/term/monad/practice/typed-read` - two signatures, and the word stops being frightening.

## Practical notes

- Run `npm run dev` before the room fills. The first grading run compiles the worker, so clear
  one rung yourself while people are sitting down.
- Keep `solutions.html` open on the second screen. It has every rubric, prompt, hint, solution
  and failing variant on one page, and it filters with `/`.
- Progress lives in localStorage. Reset it from the Progress menu between sessions if you are
  demoing the "concept cleared" path, because it only fires once.
- Every typed rung erases its types and grades at runtime, so an annotation the compiler would
  reject still runs. Say that if somebody asks why a deliberate type error did not stop them.
- Do not teach the graph as a dependency order. The links say "related to", and their direction
  came from however the upstream README happened to cross-reference. Ask it for concepts with
  no prerequisites and it offers comonad.

## What this day does not do

It does not get anyone to competence in 73 concepts. It gets them to competence in about five,
familiarity with about twenty, and a map plus a tool for the rest. Say that at the start. An
audience told honestly what six hours buys them is a different audience from one that works it
out at hour four.
