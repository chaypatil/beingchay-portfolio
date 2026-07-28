// Artistic associations only: which drawer of the head each public theme sits in.
// `weight` is visual emphasis for that metaphor, not evidence or a claim about the body.

export const NODE_REGION = {
  "cluster-self": {
    region: "insula",
    weight: 0.9,
    why: "It is the archive drawer for inner state, identity and self-observation."
  },
  "cluster-work": {
    region: "prefrontal",
    weight: 0.86,
    why: "It groups execution, planning, money and professional decisions."
  },
  "cluster-creative": {
    region: "temporal",
    weight: 0.84,
    why: "It gathers music, art, taste, expression and cultural memory."
  },
  "cluster-knowledge": {
    region: "parietal",
    weight: 0.9,
    why: "It groups external frameworks, metaphysics and system-level theories."
  },
  "cluster-systems": {
    region: "prefrontal",
    weight: 0.92,
    why: "It contains the tools and workflows used to operate the wider archive."
  },
  "agency": {
    region: "prefrontal",
    weight: 0.95,
    why: "Self-authorship, decisions, and steering place it in the planning drawer."
  },
  "preparation": {
    region: "cerebellum",
    weight: 0.86,
    why: "Systems, rehearsal, and repeated scaffolding fit the craft-and-practice drawer."
  },
  "massive-action": {
    region: "motor",
    weight: 0.96,
    why: "It leaves circular thought through forceful, visible action."
  },
  love: {
    region: "limbic",
    weight: 0.9,
    why: "It gathers attachment, longing, memory, freedom and protection into one mother node."
  },
  "pothos": {
    region: "limbic",
    weight: 0.98,
    why: "Longing, distance, and desire as fuel give it emotional gravity."
  },
  "glory": {
    region: "limbic",
    weight: 0.88,
    why: "Continuity and lasting influence appear here as emotionally charged ambition."
  },
  "adhd": {
    region: "brainstem",
    weight: 0.76,
    why: "Urgency, stimulation, and switching on make this a momentum drawer."
  },
  "spiral": {
    region: "insula",
    weight: 0.9,
    why: "Private inner weather hardens into verdicts, making it an inward-friction theme."
  },
  "movement": {
    region: "motor",
    weight: 0.99,
    why: "It explicitly uses physical movement to change the state of thought."
  },
  "manifestation": {
    region: "occipital",
    weight: 0.82,
    why: "It starts with a chosen image and identity, then acts toward that pictured future."
  },
  "synchronicity": {
    region: "parietal",
    weight: 0.84,
    why: "It gathers recurring signals into patterns and asks how fragments become meaning."
  },
  "c2x": {
    region: "motor",
    weight: 0.93,
    why: "Situated business knowledge becomes systems that act, not merely describe."
  },
  "anrxyst": {
    region: "parietal",
    weight: 0.86,
    why: "It joins philosophy, art, music, and technology into one cross-domain structure."
  },
  "fallout": {
    region: "motor",
    weight: 0.84,
    why: "Private taste becomes events, objects, and community through physical execution."
  },
  "sound": {
    region: "temporal",
    weight: 0.99,
    why: "Music, memory indexing, emotional regulation, and culture are its full terrain."
  },
  "information-gap": {
    region: "temporal",
    weight: 0.94,
    why: "It translates inner information into forms another mind can receive."
  },
  "consciousness": {
    region: "parietal",
    weight: 0.92,
    why: "It is where the archive's separate pieces become one system-level map."
  },
  "self-model-gap": {
    region: "prefrontal",
    weight: 0.82,
    why: "It asks what the current model cannot see and therefore cannot steer by."
  },
  "cloud-consciousness": {
    region: "parietal",
    weight: 0.96,
    why: "It joins memory, persistence, systems, and identity into one long-range structure."
  },
  "hermetic-philosophy": {
    region: "parietal",
    weight: 0.8,
    why: "It connects belief, possibility, and a larger imagined mental whole."
  },
  "singularity": {
    region: "parietal",
    weight: 0.88,
    why: "It imagines separate complexity joining into one universe-scale pattern."
  },
  "self-belief-scaling": {
    region: "prefrontal",
    weight: 0.86,
    why: "It links identity, conviction, choices, and execution across scales."
  },
  "multidimensional-self": {
    region: "parietal",
    weight: 0.82,
    why: "It arranges possible selves and timelines inside one larger identity structure."
  },
  "predestination": {
    region: "prefrontal",
    weight: 0.8,
    why: "It frames repeated belief and action as the script shaping later choices."
  },
  "illusion-not-fake": {
    region: "occipital",
    weight: 0.92,
    why: "It asks how a perceived or constructed world can still remain real."
  },
  "god-as-ethos": {
    region: "parietal",
    weight: 0.84,
    why: "It gathers universes, timelines, and explanatory languages into one imagined whole."
  },
  "aham-brahmasmi": {
    region: "insula",
    weight: 0.8,
    why: "It gathers four self-and-reality declarations around Chay's slice-and-whole idea."
  },
  "mahavakya-prajnanam": {
    region: "insula",
    weight: 0.72,
    why: "It frames consciousness itself as the ground of reality."
  },
  "mahavakya-aham": {
    region: "insula",
    weight: 0.82,
    why: "It is the declaration Chay directly connects to his own identity model."
  },
  "mahavakya-tat-tvam": {
    region: "insula",
    weight: 0.68,
    why: "It turns the relation between self and ultimate reality into an address."
  },
  "mahavakya-ayam-atma": {
    region: "insula",
    weight: 0.7,
    why: "It identifies the experienced self with the larger reality."
  },
  "information-theory-of-life": {
    region: "parietal",
    weight: 0.94,
    why: "It treats collecting, preserving, and transmitting information as one system."
  },
  "emergence-entropy": {
    region: "parietal",
    weight: 0.86,
    why: "It pictures complexity building and dissolving across personal and cosmic scales."
  },
  "aristocrat-philosophy": {
    region: "prefrontal",
    weight: 0.92,
    why: "It designs systems that free attention for philosophy and original thought."
  },
  "purple": {
    region: "occipital",
    weight: 0.99,
    why: "Colour, scarcity, luxury, mystery, and recognition form one visual signature."
  },
  "schranz": {
    region: "cerebellum",
    weight: 0.9,
    why: "Speed, repetition, pressure, and timing fit the rhythm-and-craft drawer."
  },
  "harvey-specter": {
    region: "temporal",
    weight: 0.88,
    why: "A television story becomes an identity scaffold, not merely entertainment."
  },
  "klangkuenstler": {
    region: "temporal",
    weight: 0.96,
    why: "A musical discovery becomes memory, heartbreak texture, scene, and catalyst."
  },
  "kanye": {
    region: "temporal",
    weight: 0.93,
    why: "It holds music, story, self-expression, and world-building as one influence."
  },
  "alexander": {
    region: "temporal",
    weight: 0.82,
    why: "A historical story becomes a narrative anchor for ambition and its cost."
  },
  "non-arrival": {
    region: "limbic",
    weight: 0.96,
    why: "Desire survives through distance, while arrival quiets the engine behind it."
  },
  "hierarchy-question": {
    region: "prefrontal",
    weight: 0.84,
    why: "It holds an unresolved values decision about rank, equality, and influence."
  },
  "solitude": {
    region: "insula",
    weight: 0.94,
    why: "It protects inner conditions, energy, sleep, and focus from outside noise."
  },
  "voices": {
    region: "temporal",
    weight: 0.9,
    why: "Two modes of speech and self-narration compete over tone, energy, and promise."
  }
};
