"""The Dragonfly Decalogue — ten commandments of forecasting, wired to the engine."""

from typing import Any, Dict, List

COMMANDMENTS: List[Dict[str, Any]] = [
    {
        "number": 1,
        "title": "Triage",
        "body": "Focus on questions where hard work pays off. Skip the clocklike trivia and the cloudlike impossible; live in the middle band where effort moves the needle.",
        "engine_hook": "Every question carries a disagreement score — high spread across lenses flags a question worth more effort.",
    },
    {
        "number": 2,
        "title": "Break the problem into tractable sub-problems",
        "body": "Fermi-ize. Decompose the knowable from the unknowable, then attack the knowable parts with arithmetic instead of adjectives.",
        "engine_hook": "The eight-feature vector IS the decomposition: base rate, trend, evidence, inertia, crowd, expertise, horizon, volatility.",
    },
    {
        "number": 3,
        "title": "Strike a balance between inside and outside views",
        "body": "Anchor on the reference class first, then adjust for what makes this case special — never the reverse.",
        "engine_hook": "Reference Class runs unadorned; Expert Panel is shrunk 25% back toward it.",
    },
    {
        "number": 4,
        "title": "Strike a balance between under- and overreacting to evidence",
        "body": "Update often, update small. Belief revision is a dial, not a switch.",
        "engine_hook": "The Bayesian Updater adds a bounded log-likelihood ratio (|log LR| ≤ 4) to the prior's log-odds.",
    },
    {
        "number": 5,
        "title": "Look for clashing causal forces",
        "body": "Hold the thesis and the antithesis in mind simultaneously. Dragonfly eye: thousands of lenses, one image.",
        "engine_hook": "Trend Extrapolation pushes; Status-Quo Anchor and Volatility Damper pull back.",
    },
    {
        "number": 6,
        "title": "Distinguish as many degrees of doubt as the problem permits",
        "body": "Not 'maybe'. 0.63. Granularity is measurable skill — rounding forecasts to thirds destroys accuracy.",
        "engine_hook": "Probabilities are reported to four decimals and never collapsed to buckets.",
    },
    {
        "number": 7,
        "title": "Strike a balance between under- and overconfidence",
        "body": "Prudence and decisiveness are both failure modes at the extremes. Calibrate, don't posture.",
        "engine_hook": "Extremizing exponent a = 1.5 sharpens the pooled log-odds; the [0.01, 0.99] clamp stops false certainty.",
    },
    {
        "number": 8,
        "title": "Look for the errors behind your mistakes",
        "body": "Post-mortem every resolution, but beware hindsight bias — the past always looks more inevitable than it was.",
        "engine_hook": "The calibration report decomposes Brier into reliability, resolution and uncertainty.",
    },
    {
        "number": 9,
        "title": "Bring out the best in others",
        "body": "Precision questioning, constructive confrontation, perspective taking. Teams of forecasters beat individuals.",
        "engine_hook": "Eight independent agents are pooled, never overruled by a single lens.",
    },
    {
        "number": 10,
        "title": "Master the error-balancing bicycle",
        "body": "You cannot learn to ride from a manual. Practice with rapid, unambiguous feedback is the only teacher.",
        "engine_hook": "A 200-question resolved benchmark re-scores the ensemble on every request.",
    },
    {
        "number": 11,
        "title": "Don't treat commandments as commandments",
        "body": "Guidelines are the beginning of judgement, not a substitute for it.",
        "engine_hook": "Every weight in weights.json is editable — download the bundle and disagree with us.",
    },
]
