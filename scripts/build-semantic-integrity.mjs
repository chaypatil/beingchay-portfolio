import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { publicNodes, publicEdges } from "../consciousness/graph-data.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "consciousness", "semantic", "semantic-model.json");
const PUBLIC_NODES = publicNodes.filter(node => !node.id.startsWith("locked-"));
const GENERATED_ON = "2026-07-30";
const HISTORICAL_TEN_IDS = new Set([
  "hermetic-philosophy",
  "singularity",
  "self-belief-scaling",
  "multidimensional-self",
  "predestination",
  "illusion-not-fake",
  "god-as-ethos",
  "aham-brahmasmi",
  "information-theory-of-life",
  "emergence-entropy"
]);
const ADHD_CLUSTER_IDS = new Set([
  "adhd",
  "adhd-initiation-fog",
  "adhd-urgency-focus",
  "adhd-burst-rhythm",
  "adhd-forced-shutdown",
  "adhd-context-switching",
  "adhd-visible-progress",
  "adhd-novelty-decay",
  "adhd-sleep-window",
  "adhd-rejection-spike",
  "adhd-restless-current"
]);

const hash = value => crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
const copyOf = node => ({
  title:node.label,
  summary:node.summary,
  source:node.source,
  note:node.note
});

const SOURCE_DEFS = {
  "src-clusters": ["meta", "P0", "_meta/clusters.md", true],
  "src-private-operating-profile": ["profile", "P2", "private profile artifact; exact path retained in private audit", true],
  "src-private-preparation-profile": ["profile", "P2", "private preparation artifact; exact path retained in private audit", true],
  "src-massive-action": ["memory", "P1", "cognitive-mirror/inbox/2026-05-24-massive-action-and-bias-towards-success.md", true],
  "src-pothos": ["entity", "P0", "entities/topics/Pothos.md", true],
  "src-private-love": ["session", "P2", "private relationship session; exact path retained in private audit", true],
  "src-glory": ["entity", "P0", "entities/topics/Glory.md", true],
  "src-adhd-public-safe": ["public_safe_distillation", "P0", "cognitive-mirror/consciousness-site/consciousness-dataset-portable.json / activation-model; Chay direction 2026-07-30", true],
  "src-manifestation": ["entity", "P0", "entities/topics/Manifestation.md", true],
  "src-synchronicity": ["entity", "P0", "entities/topics/Synchronicity.md", true],
  "src-public-c2x": ["public_page", "P0", "beingchay.com/portfolio; no canonical Chay OS source located", false],
  "src-anrxyst": ["session", "P1", "sessions/2026-05-09-00-content-engine-substance-format-voice.md", true],
  "src-fallout": ["entity", "P0", "entities/topics/Fallout.md", true],
  "src-sound-map": ["entity", "P0", "multiple artist/topic records; no sufficient sound thesis source located", true],
  "src-information-gap": ["entity", "P0", "entities/topics/Information Asymmetry.md", true],
  "src-mirror-vision": ["session", "P1", "sessions/2026-05-03-01-cognitive-mirror-vision.md", true],
  "src-system-gap": ["system_observation", "P0", "Phase 1.5 archive-coverage observation", false],
  "src-cloud": ["memory", "P1", "cognitive-mirror/memory/project_cloud_consciousness.md", true],
  "src-manifestation-session": ["session", "P2", "sessions/2026-05-08-00-manifestation-arc-cloud-consciousness.md", true],
  "src-chay-mahavakyas-direction": ["user_direction", "P0", "Chay approval on 2026-07-29; source citations intentionally pending", false],
  "src-aristocrat": ["session", "P1", "sessions/2026-05-03-01-cognitive-mirror-vision.md", true],
  "src-purple": ["session", "P1", "sessions/2026-05-03-04-kanye-creative-influences-purple.md", true],
  "src-schranz": ["entity", "P0", "entities/topics/Schranz.md", true],
  "src-private-suits": ["session", "P2", "private transition session; exact path retained in private audit", true],
  "src-klangkuenstler": ["entity", "P0", "entities/people/Klangkuenstler.md", true],
  "src-kanye": ["entity", "P0", "entities/people/Kanye West.md", true],
  "src-alexander": ["entity", "P0", "entities/people/Alexander the Great.md", true],
  "src-non-arrival": ["session", "P1", "sessions/2026-06-18-00-goa-purva-conviction-dream-life.md", true],
  "src-hierarchy": ["session", "P1", "inbox/2026-05-09.md and sessions/2026-05-03-04-kanye-creative-influences-purple.md", true],
  "src-private-solitude": ["session", "P2", "private self-report session; exact path retained in private audit", true],
  "src-private-voices": ["profile", "P2", "private cognitive profile; exact path retained in private audit", true]
};

// Fields:
// id, source, locator, excerpt, actual claim, proposed distillation, expression,
// epistemic, status, privacy, verdict, provenance, failure reasons, relationships,
// variants, temporal scope, role, approval, blocker.
const ROWS = [
  ["cluster-self","src-clusters","lines 14-15","Identity, ADHD patterns, emotional processing, philosophy of self, mental loops, spiraling, energy management.","Self is the vault's primary home for the inner world.","Archive index for identity, emotion, activation and inner loops.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["adhd","spiral","movement","love"],[],"current taxonomy","archive_mother","proposed"],
  ["cluster-work","src-clusters","lines 17-18","Career, money, execution, professional output and survival logistics.","Work is the structural home for career, money, execution and survival logistics.","Archive index for work; private employer detail remains withheld.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["preparation","massive-action","c2x"],[],"current taxonomy","archive_mother","proposed"],
  ["cluster-creative","src-clusters","lines 20-21","Music, art, content, content strategy, taste.","Creative is the structural home for music, art, content and taste.","Archive index for creative media, projects and influences.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["anrxyst","fallout","sound","purple"],[],"current taxonomy","archive_mother","proposed"],
  ["cluster-knowledge","src-clusters","lines 23-24","Things that aren't directly mine but inform my thinking.","Knowledge holds research and others' philosophy without making it Chay's belief.","Archive index separating external knowledge from personal claims.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["hermetic-philosophy","singularity","information-gap"],[],"current taxonomy","archive_mother","proposed"],
  ["cluster-systems","src-clusters","lines 26-27","Tools, automations, the cognitive mirror itself, workflows, infrastructure, prompts.","Systems is the structural home for the vault, workflows and capture infrastructure.","Archive index for the machinery that operates the other drawers.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["consciousness","self-model-gap","cloud-consciousness"],[],"current taxonomy","archive_mother","proposed"],
  ["agency","src-private-operating-profile","agency heading","Lack of agency — complaining without acting, learned helplessness.","Agency is an explicit value and evaluative standard.","A recurring preference for action over learned helplessness.","faithful_paraphrase","value","documented","P0","keep","private_hash",[],["massive-action","preparation"],[],"current profile","display_node","proposed"],
  ["preparation","src-private-preparation-profile","preparation risk heading","Am I building toward something real, or am I just getting really good at preparing to build?","Preparation creates leverage but can replace execution; 85/15 is a self-estimate.","Systems are useful only when they serve shipped work.","synthesis","interpretation","supported","P0","tighten","private_hash",["estimated ratio can read as measurement"],["massive-action","consciousness"],["The infrastructure is valuable and can also become avoidance."],"current profile estimate","display_node","proposed"],
  ["massive-action","src-massive-action","lines 15-19","Blind reiterations of vague sense of solutions will always lead you out of this turmoil.","Action is preferred to circular strategizing when uncertainty blocks progress.","Choose a workable move that generates evidence instead of strategizing in circles.","faithful_paraphrase","value","documented","P0","keep","exact",[],["agency","preparation"],[],"2026-05 operating note","display_node","proposed"],
  ["pothos","src-pothos","line 13","Vision is the destiny. Pothos is the fuel.","Pothos names the longing that powers Chay's pursuit of Vision.","Pothos is the fuel; Vision is its destination.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["glory","alexander","non-arrival"],[],"active framework since 2026-05","display_node","proposed"],
  ["love","src-private-love","private source; locator withheld","private excerpt withheld","The source contains stories, names and personal instances that require one-by-one privacy review.","Private layer. Stories, names, personal instances, interpretations and source notes are withheld.","synthesis","interpretation","unknown","P2","tighten","private_hash",["public copy previously exposed a relationship synthesis","privacy review is not yet complete"],[],[],"private historical material","thematic_mother","proposed","Review each Love record and relation before any public release."],
  ["glory","src-glory","lines 14-22","Glory is the only thing that gives immortality to a mortal man.","Glory means lasting influence on how humans think, not literal immortality or status.","Glory is continuity through influence on thought, not fame or literal survival.","faithful_paraphrase","value","documented","P0","keep","exact",[],["pothos","cloud-consciousness","alexander"],[],"active definition since 2026-05","display_node","proposed"],
  ["adhd","src-adhd-public-safe","activation-model + Chay direction 2026-07-30","ADHD is a documented part of my life; add my documented traits as baby nodes.","Chay explicitly identifies ADHD as a major documented part of his life and asks for its lived traits to remain distinct.","ADHD indexes Chay's lived activation, attention, work-rhythm, emotional, sleep and restlessness patterns.","synthesis","interpretation","documented","P0","split","exact",["the former single node collapsed several distinct documented traits"],["adhd-initiation-fog","adhd-urgency-focus","adhd-burst-rhythm","adhd-forced-shutdown","adhd-context-switching","adhd-visible-progress","adhd-novelty-decay","adhd-sleep-window","adhd-rejection-spike","adhd-restless-current","solitude","voices"],[],"lifelong pattern; documented and expanded 2026-07-30","thematic_mother","approved"],
  ["adhd-initiation-fog","src-adhd-public-safe","activation-model / initiation","Required tasks can produce fog even when their importance is understood.","Chay can understand and care about a required task while still being unable to initiate it.","Knowing and caring do not guarantee ignition; required tasks can still produce initiation fog.","faithful_paraphrase","interpretation","documented","P0","split","exact",[],["adhd","adhd-forced-shutdown","preparation"],[],"recurring self-observation","display_child","approved"],
  ["adhd-urgency-focus","src-adhd-public-safe","activation-model / urgency","I explode under pressure and my focus becomes laser sharp.","Real stakes and approaching deadlines can sharply increase Chay's short-term focus.","Urgency can flip diffuse attention into sharp short-term focus without becoming the ideal way to work.","faithful_paraphrase","interpretation","documented","P0","split","exact",[],["adhd","adhd-burst-rhythm"],[],"recurring self-observation","display_child","approved"],
  ["adhd-burst-rhythm","src-adhd-public-safe","activation-model / burst rhythm","Short, intense work windows are followed by low-activation periods.","Chay's usable energy and output often arrive in bursts rather than a linear all-day rhythm.","Output arrives in intense windows followed by genuine recovery needs.","faithful_paraphrase","interpretation","documented","P0","split","exact",[],["adhd","adhd-urgency-focus","adhd-visible-progress"],[],"recurring self-observation","display_child","approved"],
  ["adhd-forced-shutdown","src-adhd-public-safe","activation-model / forced effort","If I force myself to do things even if my brain fog is there, my body literally renders me to sleepy mode.","Forcing effort through initiation fog can produce sleepiness or cognitive shutdown for Chay.","More force through the fog can produce shutdown instead of usable effort.","faithful_paraphrase","interpretation","documented","P0","split","exact",["does not explain every episode of fatigue"],["adhd","adhd-initiation-fog"],[],"recurring self-observation","display_child","approved"],
  ["adhd-context-switching","src-adhd-public-safe","operating-manual public-safe implication","Context switching is the largest recurring drain on usable attention.","Changing domains, tools or task frames carries a disproportionate activation cost for Chay.","Context switching is a major energy cost; a clear opening move helps the transition.","faithful_paraphrase","interpretation","documented","P0","split","exact",[],["adhd","solitude"],[],"current operating model","display_child","approved"],
  ["adhd-visible-progress","src-adhd-public-safe","operating-manual public-safe implication","Visible output helps attention remain attached to the task.","Chay's engagement lasts longer when forward motion is tangible and visible.","Visible evidence of progress helps attention remain attached without devaluing invisible work.","faithful_paraphrase","interpretation","documented","P0","split","exact",[],["adhd","adhd-burst-rhythm"],[],"current operating model","display_child","approved"],
  ["adhd-novelty-decay","src-adhd-public-safe","operating-manual historical estimate","Plans often hold for days before novelty wears off.","New systems can lose activation power when their novelty fades; the recorded duration is only an estimate.","Novelty decay is a recurring system risk, not a measured three-to-seven-day law.","faithful_paraphrase","interpretation","documented","P0","split","exact",["the duration is a working estimate rather than measurement"],["adhd","preparation"],[],"historical working model","display_child","approved"],
  ["adhd-sleep-window","src-adhd-public-safe","self-report public-safe paraphrase","Missing the first sleepy window makes sleep initiation harder.","Chay reports a narrow sleepiness window whose loss makes falling asleep substantially harder.","A narrow sleep window is a lived timing sensitivity, not a public sleep-disorder claim.","faithful_paraphrase","interpretation","documented","P0","split","exact",["clinical sleep context remains private"],["adhd","solitude"],[],"recurring self-observation","display_child","approved"],
  ["adhd-rejection-spike","src-adhd-public-safe","RSD public-safe loop","Perceived failure can trigger perfectionism, avoidance and inconsistency.","Perceived rejection, criticism or falling short can produce a fast crash and urge to exit or restart.","A rejection spike can feed perfectionism and avoidance; personal incidents remain private.","faithful_paraphrase","interpretation","documented","P0","split","exact",["RSD is not presented as a standalone DSM diagnosis"],["adhd","preparation","spiral"],[],"recurring experiential vocabulary","display_child","approved"],
  ["adhd-restless-current","src-adhd-public-safe","operating-manual public-safe implication","Racing internal debate and physical restlessness can occur together.","Chay reports inner restlessness, fidgeting and several concurrent lines of thought.","Outward inattentiveness can coexist with a restless body and loud internal debate.","faithful_paraphrase","interpretation","documented","P0","split","exact",["overlap with Two Voices must not imply literal separate selves"],["adhd","movement","voices"],[],"current operating model","display_child","approved"],
  ["spiral","src-private-operating-profile","spiral pattern heading","Real thinking produces options; the spiral only produces verdicts.","A recurring future-catastrophizing pattern is distinguished from analysis by whether options appear.","The spiral produces verdicts; useful analysis produces options.","faithful_paraphrase","interpretation","documented","P0","keep","private_hash",[],["movement","adhd"],[],"current operating model","display_node","proposed"],
  ["movement","src-private-operating-profile","spiral breaker heading","Spiral breaker: Physical movement.","Movement is a self-reported intervention for shifting cognitive state.","Physical motion is a practical state-change intervention, not a universal treatment claim.","faithful_paraphrase","preference","documented","P0","keep","private_hash",[],["spiral"],[],"current intervention","display_node","proposed"],
  ["manifestation","src-manifestation","line 23","I have chosen a story, I have chosen a timeline that resonates with me so much that it becomes true.","Chay links conviction, identity adoption and aligned action; causal metaphysics remains personal belief.","Conviction selects a story and changes attention and action; stronger causal claims remain hypothesis.","synthesis","belief","documented","P0","keep","exact",[],["synchronicity","self-belief-scaling","predestination"],["Literal timeline alignment and behavioral selection coexist in the record."],"evolving belief","display_node","proposed"],
  ["synchronicity","src-synchronicity","lines 25-38","We are merely the radio signals through which the ethos comes into reality.","Chay interprets selected recurrences through attention and alignment; Jung similarity is secondhand.","Synchronicity is Chay's attentional interpretation, not settled supernatural causation or verified Jung scholarship.","synthesis","interpretation","documented","P0","keep","exact",[],["manifestation","hermetic-philosophy"],[],"current interpretation","display_node","proposed"],
  ["c2x","src-public-c2x","public page","Buying the best AI model isn't enough. It needs to know how your business works.","The public page states a context-to-execution practice, but no canonical Chay OS evidence was located.","C2X is a public project index pending canonical vault capture.","faithful_paraphrase","plan","unknown","P0","insufficient_source","blocked",["public page substituted for canonical evidence"],["cluster-work"],[],"current project","display_node","proposed","Create or identify a canonical Chay OS project record."],
  ["anrxyst","src-anrxyst","lines 15-18","Most AI content engines collapse all three and produce slop.","Anrxyst separates substance, format and voice in a multi-domain creative system.","A creative platform whose production method keeps substance, format and voice distinct.","synthesis","plan","documented","P0","keep","exact",[],["information-gap","purple","sound"],[],"active project","display_node","proposed"],
  ["fallout","src-fallout","lines 14-38","Fallout is Chay's rave and hard-techno platform.","Fallout is a public creative platform shaped by live music, scene-building and cultural influence.","An India-focused hard-techno and rave platform built from lived scene experience.","faithful_paraphrase","plan","documented","P0","keep","exact",[],["schranz","klangkuenstler","sound"],[],"active project","display_node","proposed"],
  ["sound","src-sound-map","distributed artist references","Schranz, hard techno, dekbass and artist references.","The vault documents several musical influences, but not the full memory-indexing and regulation thesis in one sufficient source.","Music is a major influence; the broader psychological thesis requires listening-history evidence.","synthesis","interpretation","unknown","P0","insufficient_source","blocked",["distributed references were promoted into a broad thesis"],["schranz","klangkuenstler","fallout"],[],"incomplete archive coverage","display_node","proposed","Add a canonical sound/listening-history record or narrow the display copy."],
  ["information-gap","src-information-gap","lines 20-34","Even the truth I speak needs to be put in a catchy format where people would listen.","Information can be lost through death or failed translation; communicators must bridge the decoding gap.","A civilizational and content-level concern about transferring what is in one mind to another.","synthesis","belief","documented","P0","keep","exact",[],["cloud-consciousness","anrxyst"],[],"active thesis","display_node","proposed"],
  ["consciousness","src-mirror-vision","lines 18-23","Fill gaps in my philosophy, my work patterns, my thinking.","The mirror is meant to preserve evidence, expose gaps and eventually support execution without claiming personhood.","An inspectable computational self-model whose archive remains distinct from the person.","synthesis","plan","documented","P0","keep","exact",[],["self-model-gap","cloud-consciousness"],[],"active project","question","proposed"],
  ["self-model-gap","src-system-gap","coverage observation","Some parts of a life are absent because they were never captured or cannot fit the current model.","Archive incompleteness is a system observation, not a belief attributed to Chay.","A standing question that makes missing evidence visible.","inference","interpretation","supported","P0","keep","system_observation",[],["consciousness"],[],"continuous","question","proposed"],
  ["cloud-consciousness","src-cloud","lines 9-18","The Brain vault is v0 of the Cloud Consciousness project.","The current vault is a prototype of a long-horizon persistence project rooted in Chay's childhood thought experiment.","The vault is v0 of Cloud Consciousness; future BCI-like capability remains aspirational.","synthesis","plan","documented","P0","keep","exact",[],["consciousness","information-gap","glory"],[],"childhood origin, active project","question","proposed"],
  ["hermetic-philosophy","src-manifestation-session","§27 / line 323","the universe is mental or at least that's what I've heard","Chay adopts a secondhand Hermetic frame and links it to shared consciousness.","A received Hermetic frame: individual minds as expressions of shared consciousness.","faithful_paraphrase","belief","documented","P0","rewrite","exact",["theory laundering in pre-audit copy","causal claim exceeded source"],["manifestation","synchronicity","god-as-ethos","aham-brahmasmi","multidimensional-self"],[],"belief stated 2026-05","display_node","approved"],
  ["singularity","src-manifestation-session","§31 / lines 359-365","Singularity is basically when the entirety of the universe is conscious.","Chay uses singularity for a personal cosmological endpoint, not AI takeoff alone.","A personal hypothesis in which all matter becomes conscious.","faithful_paraphrase","hypothesis","documented","P0","tighten","exact",[],["information-theory-of-life","emergence-entropy","cloud-consciousness"],[],"hypothesis stated 2026-05","display_node","approved"],
  ["self-belief-scaling","src-manifestation-session","§27 / lines 309-323","if I can convince one unit of consciousness ... I can again put this at scale","Chay hypothesizes that extreme self-conviction changes action, presentation and social influence.","Self-conviction may scale through behavior and influence; this is theory, not proof.","faithful_paraphrase","hypothesis","documented","P0","rewrite","exact",["causal certainty exceeded source","source itself says nuances are skipped"],["manifestation","hermetic-philosophy"],[],"hypothesis stated 2026-05","display_node","approved"],
  ["multidimensional-self","src-manifestation-session","§26 and §42 / lines 301-305, 476-504","Whenever I make a decision ... these are portals into those timelines.","Chay uses a timeline image, then later explains it through actions and consequences.","Choices are described as portals; a later variant reframes them as consequence chains.","synthesis","belief","documented","P0","tighten","exact",["earlier copy flattened historical variants"],["predestination","manifestation"],["Literal timeline language and later action-consequence clarification must both remain."],"evolving belief in one session","display_node","approved"],
  ["predestination","src-manifestation-session","§28 / line 331","when you believe in something, that's when you're destined to be whatever it is that you believe in","Chay reframes destiny as the consequences of repeated belief and action.","Destiny is the echo of repeated beliefs and actions, not a guaranteed external script.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["manifestation","multidimensional-self"],[],"interpretation stated 2026-05","display_node","approved"],
  ["illusion-not-fake","src-manifestation-session","§41 / line 474","illusion does not mean that it's obsolete ... everything to you is real","Chay rejects the idea that calling reality illusory removes its consequences.","Illusion does not mean fake; consequences remain real within lived experience.","faithful_paraphrase","belief","documented","P0","keep","exact",[],["god-as-ethos","multidimensional-self"],[],"belief stated 2026-05","display_node","approved"],
  ["god-as-ethos","src-manifestation-session","§25-26 and §30 / lines 293-305, 343-345","It's the totality of all of the possibilities ... all at once.","Chay defines God/ethos as total existence across possibilities and experiments across religious/scientific registers.","A personal definition of God as totality; cross-register equivalence is not established science.","faithful_paraphrase","belief","documented","P0","rewrite","exact",["religious and scientific registers were presented as settled equivalence"],["hermetic-philosophy","illusion-not-fake"],[],"belief stated 2026-05","display_node","approved"],
  ["aham-brahmasmi","src-manifestation-session","§45 / lines 510-516","I am the universe. I am the Brahma. I am a slice of that entire ocean.","Chay describes a finite unit of consciousness as a slice of the same larger whole.","A finite perspective is a slice of the ocean without becoming separate from the ocean.","faithful_paraphrase","belief","documented","P0","split","exact",["Tathāgatagarbha was unsupported prompt contamination","the earlier display collapsed a personal belief into a four-part collection"],["four-mahavakyas","hermetic-philosophy"],[],"personal claim stated 2026-05","display_node","approved"],
  ["four-mahavakyas","src-chay-mahavakyas-direction","user direction · 2026-07-29","Mahāvākyas is my personal node too.","Chay wants the four declarations held together as a personal philosophy node, distinct from the slice-and-whole belief.","A personal philosophical collection of four declarations; source citations remain pending.","faithful_paraphrase","interpretation","tentative","P0","keep","user_direction",[],["aham-brahmasmi","mahavakya-prajnanam","mahavakya-aham","mahavakya-tat-tvam","mahavakya-ayam-atma"],[],"approved as a personal node on 2026-07-29","thematic_mother","approved"],
  ["mahavakya-prajnanam","src-chay-mahavakyas-direction","user direction · 2026-07-29","Consciousness is Brahman.","This meaning is part of Chay's personal four-declaration collection; source citation remains pending.","Prajñānam Brahma — consciousness is Brahman.","faithful_paraphrase","interpretation","tentative","P0","keep","user_direction",[],["four-mahavakyas"],[],"personal collection; source pending","display_child","approved"],
  ["mahavakya-aham","src-chay-mahavakyas-direction","user direction · 2026-07-29","I am Brahman.","This meaning is part of Chay's personal four-declaration collection, not the name of his separate slice-and-whole belief.","Aham Brahmāsmi — I am Brahman.","faithful_paraphrase","interpretation","tentative","P0","keep","user_direction",[],["four-mahavakyas"],[],"personal collection; source pending","display_child","approved"],
  ["mahavakya-tat-tvam","src-chay-mahavakyas-direction","user direction · 2026-07-29","You are That.","This meaning is part of Chay's personal four-declaration collection; source citation remains pending.","Tat Tvam Asi — you are That.","faithful_paraphrase","interpretation","tentative","P0","keep","user_direction",[],["four-mahavakyas"],[],"personal collection; source pending","display_child","approved"],
  ["mahavakya-ayam-atma","src-chay-mahavakyas-direction","user direction · 2026-07-29","This Self is Brahman.","This meaning is part of Chay's personal four-declaration collection; source citation remains pending.","Ayam Ātmā Brahma — this Self is Brahman.","faithful_paraphrase","interpretation","tentative","P0","keep","user_direction",[],["four-mahavakyas"],[],"personal collection; source pending","display_child","approved"],
  ["information-theory-of-life","src-manifestation-session","§31-32 / lines 359-371","collecting, preserving, and sustaining information","Chay hypothesizes that life preserves/transmits information and technology may extend that process.","A personal philosophy of life as information preservation, not a neutral biological definition.","faithful_paraphrase","hypothesis","documented","P0","rewrite","exact",["personal theory was presented as neutral fact"],["singularity","cloud-consciousness"],[],"hypothesis stated 2026-05","display_node","approved"],
  ["emergence-entropy","src-manifestation-session","§31 / line 363","emergent properties ... battling with forces of entropy","Chay frames emergence and entropy as a cosmological tension.","A personal cosmological hypothesis about complexity and entropy.","faithful_paraphrase","hypothesis","documented","P0","rewrite","exact",["unsupported personal-ambition analogy existed in pre-audit copy"],["singularity","information-theory-of-life"],[],"hypothesis stated 2026-05","display_node","approved"],
  ["aristocrat-philosophy","src-aristocrat","lines 21 and 89","I believe the best philosophy arises when all of the survival, safety, physiological, and romantic needs are met.","Automation should handle repetitive survival work so time can return to depth and thought.","Automate repetitive necessity to manufacture time for philosophy and original thought.","faithful_paraphrase","value","documented","P0","keep","exact",[],["consciousness","preparation"],[],"active operating principle","display_node","proposed"],
  ["purple","src-purple","line 213","It should glow like a star core.","Purple is an explicit visual preference and cross-project signature; broader associations are synthesis.","Purple is a recurring visual signature; specific associations should remain labeled synthesis.","synthesis","preference","documented","P0","keep","exact",[],["anrxyst","pothos"],[],"current aesthetic preference","display_node","proposed"],
  ["schranz","src-schranz","lines 12-30","Schranz was this chance for me to shape the alternate culture that was coming into India.","Schranz is Fallout's sonic identity and a forecasted cultural opportunity.","Schranz is a sonic identity and forecast, not an established market fact.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["fallout","sound","klangkuenstler"],[],"active influence","display_node","proposed"],
  ["harvey-specter","src-private-suits","line 153","The movies and the things that I see that really resonate with me shape me a lot.","Suits supplied a fictional identity scaffold during a private transition.","Suits is evidence of media being used as an identity scaffold; the triggering event stays private.","synthesis","memory","documented","P0","keep","private_hash",[],["kanye"],[],"historical influence","display_node","proposed"],
  ["klangkuenstler","src-klangkuenstler","lines 12-33; origin session lines 261-275","that one song has completely reshaped not just mine but everybody around me's life","A track and later live set catalyzed Chay's route into heartbreak techno and Fallout.","A musical discovery became a scene and then a platform; wider impact is self-reported.","synthesis","memory","documented","P0","keep","exact",[],["schranz","fallout","sound"],[],"2025 origin memory","display_node","proposed"],
  ["kanye","src-kanye","lines 16-84; creative session line 80","I want to make my own Graduation.","Graduation is a creative proof-of-concept for conviction and cross-domain world-building, held with caution.","Graduation is an influence and ambition reference, not evidence of achieved equivalence.","synthesis","interpretation","documented","P0","keep","exact",[],["purple","anrxyst"],[],"active influence","display_node","proposed"],
  ["alexander","src-alexander","lines 27-57","If I were not Alexander, I would be Diogenes.","Alexander is Chay's historical anchor for Pothos, preserved with failure/cost counter-evidence.","Alexander is an influence and cautionary anchor, not identity equivalence.","synthesis","interpretation","documented","P0","keep","exact",[],["pothos","glory"],["Boundary-pushing influence coexists with early death and a short-lived empire."],"active historical comparison","display_node","proposed"],
  ["non-arrival","src-non-arrival","line 37","Never happy, only content is the structural cost of the drive, not a failure at being happy.","Chay describes desire as fueled by distance and arrival as quieting the engine.","Non-arrival is a reported cost of Pothos, not a universal law of desire.","faithful_paraphrase","interpretation","documented","P0","keep","exact",[],["pothos"],[],"reported 2026-06","display_node","proposed"],
  ["hierarchy-question","src-hierarchy","inbox line 50; creative session lines 242-254","For 100 to be a hundred, it needs a hundred ones.","Chay rejects hierarchy as intrinsic value while also pursuing ranked influence; the conflict is unresolved.","Preserve the tension between non-hierarchical value and ranked ambition as an open question.","synthesis","interpretation","disputed","P0","keep","exact",[],["glory","cloud-consciousness"],["Every unit is constitutive and influence is still described through rank."],"unresolved","question","proposed"],
  ["solitude","src-private-solitude","self-report line 55","I'm my best version when I'm like 90% in solitude.","Chay reports that high-solitude conditions improve consistency and focus.","Solitude is self-reported infrastructure; the 90/10 ratio is personal, not prescriptive.","faithful_paraphrase","preference","documented","P0","keep","private_hash",[],["adhd","movement"],[],"self-report in 2026-05","display_node","proposed"],
  ["voices","src-private-voices","voice-pattern synthesis","Capture Voice 2's energy but translate it into concrete small commitments, don't dampen it.","The private profile models two recurring communication/activation modes; this is an editorial synthesis.","Two recurring modes are useful as a working synthesis, not literal separate selves.","synthesis","interpretation","tentative","P0","tighten","private_hash",["agent-authored profile synthesis can be mistaken for self-description"],["adhd","spiral"],[],"current profile model","display_node","proposed"]
];

const byId = new Map(PUBLIC_NODES.map(node => [node.id, node]));
if (ROWS.length !== PUBLIC_NODES.length) {
  throw new Error(`Audit rows (${ROWS.length}) must account for every public node (${PUBLIC_NODES.length}).`);
}
for (const row of ROWS) {
  if (!byId.has(row[0])) throw new Error(`Audit row references unknown public node: ${row[0]}`);
}

const sourceArtifacts = Object.entries(SOURCE_DEFS).map(([id, [kind, privacy, safeLocator, canonical]]) => ({
  id,
  kind,
  privacy,
  safeLocator,
  canonical
}));

const evidenceSpans = [];
const claims = [];
const nodes = [];
const revisions = [];
const approvalEvents = [];
const auditLedger = [];

for (const row of ROWS) {
  const [
    nodeId, sourceArtifactId, locator, excerpt, actualSourceClaim, proposedDistillation,
    expressionType, epistemicType, status, privacy, verdict, provenanceStatus,
    failureReasons, supportedRelationships, contradictionsOrVariants, temporalScope,
    graphRole, approvalState, blocker
  ] = row;
  const node = byId.get(nodeId);
  const sourceArtifact = sourceArtifacts.find(source => source.id === sourceArtifactId);
  const evidenceSpanId = `evidence-${nodeId}`;
  const claimId = `claim-${nodeId}`;
  const currentCopy = copyOf(node);
  const currentCopyHash = hash(JSON.stringify(currentCopy));
  const privateHashOnly = provenanceStatus === "private_hash";
  const decisionDate = HISTORICAL_TEN_IDS.has(nodeId)
    ? "2026-07-26"
    : ADHD_CLUSTER_IDS.has(nodeId)
      ? "2026-07-30"
      : approvalState === "approved"
        ? "2026-07-29"
        : GENERATED_ON;
  evidenceSpans.push(privateHashOnly ? {
    id:evidenceSpanId,
    sourceArtifactId,
    locator:"private locator withheld",
    privacy:sourceArtifact.privacy,
    representation:"private_hash",
    privateExcerptHash:hash(excerpt)
  } : {
    id:evidenceSpanId,
    sourceArtifactId,
    locator,
    privacy:"P0",
    representation:"safe_excerpt",
    safeExcerpt:excerpt
  });
  const externalContextIds = [];
  claims.push({
    id:claimId,
    text:proposedDistillation,
    expressionType,
    epistemicType,
    status,
    confidence:status === "unknown" ? 0 : status === "tentative" ? 0.45 : 0.78,
    importance:graphRole.includes("mother") ? 0.9 : 0.7,
    privacy,
    evidenceSpanIds:provenanceStatus === "blocked" ? [] : [evidenceSpanId],
    externalContextIds,
    approvalState,
    temporalScope
  });
  nodes.push({
    id:nodeId,
    graphRole,
    claimIds:externalContextIds.length ? [] : [claimId],
    externalContextIds,
    currentCopyHash
  });
  const revisionId = `revision-${nodeId}-current`;
  revisions.push({
    id:revisionId,
    nodeId,
    createdOn:decisionDate,
    contentHash:currentCopyHash,
    previousRevisionId:null,
    approvalState,
    reason:HISTORICAL_TEN_IDS.has(nodeId)
      ? "Completed ten-node audit was approved by Chay and applied before Phase 1.5."
      : ADHD_CLUSTER_IDS.has(nodeId)
        ? "Chay explicitly requested the documented ADHD mother-and-child cluster on 2026-07-30."
      : approvalState === "approved"
        ? "Chay explicitly approved this public-safe semantic decision on 2026-07-29."
      : "Deployed legacy copy is represented for review; deployment is not semantic approval.",
    immutable:true
  });
  approvalEvents.push({
    id:`approval-${nodeId}-current`,
    subjectId:claimId,
    state:approvalState,
    actor:approvalState === "approved" ? "chay" : "agent",
    date:decisionDate,
    evidence:approvalState === "approved"
      ? HISTORICAL_TEN_IDS.has(nodeId)
        ? "Chay explicitly authorized the completed ten-node correction pass."
        : ADHD_CLUSTER_IDS.has(nodeId)
          ? "Chay explicitly requested his documented ADHD traits in the brain scan and as baby nodes around an ADHD mother node."
        : "Chay explicitly approved the semantic split and personal Mahāvākyas node."
      : "Phase 1.5 classification proposal; no automatic promotion is permitted."
  });
  auditLedger.push({
    nodeId,
    sourceArtifactId,
    evidenceSpanId,
    actualSourceClaim,
    proposedDistillation,
    expressionType,
    epistemicType,
    status,
    privacy,
    temporalScope,
    supportedRelationships,
    contradictionsOrVariants,
    verdict,
    ...(HISTORICAL_TEN_IDS.has(nodeId) ? { historicalVerdict:nodeId === "aham-brahmasmi" ? "rewrite" : verdict } : {}),
    failureReasons,
    approvalState,
    provenanceStatus,
    ...(blocker ? { blocker } : {}),
    auditOrigin:HISTORICAL_TEN_IDS.has(nodeId)
      ? "completed-ten-node-audit-reconciled"
      : ADHD_CLUSTER_IDS.has(nodeId)
        ? "chay-decision-2026-07-30"
      : approvalState === "approved"
        ? "chay-decision-2026-07-29"
        : "phase-1.5"
  });
}

const addVariant = (nodeId, text, expressionType, epistemicType, status) => {
  const main = claims.find(claim => claim.id === `claim-${nodeId}`);
  const id = `claim-${nodeId}-historical-variant`;
  claims.push({
    ...main,
    id,
    text,
    expressionType,
    epistemicType,
    status,
    approvalState:"proposed"
  });
  nodes.find(node => node.id === nodeId).claimIds.push(id);
  return id;
};

const contradictionSets = [
  {
    id:"contradiction-multidimensional-registers",
    claimIds:["claim-multidimensional-self", addVariant("multidimensional-self", "The later account treats portals as an image for action and consequence rather than proof of timeline travel.", "faithful_paraphrase", "interpretation", "documented")],
    resolution:"preserve",
    note:"Literal cosmological language and the later behavioral clarification are distinct historical variants."
  },
  {
    id:"contradiction-hierarchy-influence",
    claimIds:["claim-hierarchy-question", addVariant("hierarchy-question", "The vision is also stated through a ranked ambition to become exceptionally influential.", "faithful_paraphrase", "value", "documented")],
    resolution:"unknown",
    note:"Do not resolve an explicitly open tension for neatness."
  },
  {
    id:"contradiction-manifestation-registers",
    claimIds:["claim-manifestation", addVariant("manifestation", "Some source passages use stronger metaphysical language about timelines and reality responding to conviction.", "faithful_paraphrase", "belief", "documented")],
    resolution:"preserve",
    note:"Behavioral mechanism and metaphysical belief must not be silently collapsed."
  }
];

const externalContexts = [];

const supported = new Set();
for (const entry of auditLedger) {
  for (const other of entry.supportedRelationships) {
    supported.add([entry.nodeId, other].sort().join("::"));
  }
}
const relations = publicEdges.filter(edge => {
  const fromId = Array.isArray(edge) ? edge[0] : edge.source || edge.from;
  const toId = Array.isArray(edge) ? edge[1] : edge.target || edge.to;
  return !String(fromId).startsWith("locked-") && !String(toId).startsWith("locked-");
}).map((edge, index) => {
  const fromId = Array.isArray(edge) ? edge[0] : edge.source || edge.from;
  const toId = Array.isArray(edge) ? edge[1] : edge.target || edge.to;
  const isSupported = supported.has([fromId, toId].sort().join("::"));
  return {
    id:`relation-legacy-${String(index + 1).padStart(3, "0")}`,
    fromId,
    toId,
    type:"influences",
    status:isSupported ? "supported" : "unknown",
    approvalState:"proposed",
    evidenceSpanIds:[]
  };
});
const ahamCurrent = revisions.find(revision => revision.nodeId === "aham-brahmasmi");
const ahamProposalText = "Separate the personal slice-and-whole belief from the personal Four Mahāvākyas collection.";
revisions.push({
  id:"revision-aham-brahmasmi-split-approved",
  nodeId:"aham-brahmasmi",
  createdOn:GENERATED_ON,
  contentHash:hash(ahamProposalText),
  previousRevisionId:ahamCurrent.id,
  approvalState:"approved",
  reason:ahamProposalText,
  immutable:true
});

const reviewQueue = [
  {
    id:"review-insufficient-sources",
    subjectIds:["c2x","sound"],
    decision:"Provide or approve canonical Chay OS sources for C2X and Sound; until then they remain insufficient_source.",
    material:true,
    status:"awaiting_chay"
  },
  {
    id:"review-privacy-structure",
    subjectIds:["private-layer-review","love"],
    decision:"Review private nodes, Love records, dates and relationship structure one by one before releasing any detail.",
    material:true,
    status:"awaiting_chay"
  },
  {
    id:"review-remaining-semantic-proposals",
    subjectIds:auditLedger.filter(entry => entry.approvalState === "proposed").map(entry => entry.nodeId),
    decision:"Review the Phase 1.5 classifications and proposed tightenings as one queue; deployment alone does not approve them.",
    material:true,
    status:"awaiting_chay"
  }
];

const model = {
  meta:{
    schemaVersion:"1.0.0",
    generatedBy:"scripts/build-semantic-integrity.mjs",
    generatedOn:GENERATED_ON,
    canonicalEvidenceRoot:"Chay OS/vault",
    publicSafety:"Public-safe projections only; private claims may retain P2/P3 labels and hashes, never excerpts or locators"
  },
  definitions:{
    vaultRecord:"One canonical Markdown artifact in Chay OS/vault. The current inventory contains 111.",
    graphRecord:`One record in publicNodes, including public semantic/display nodes and locked UI placeholders. The current graph contains ${publicNodes.length}.`,
    node:"A public graph record that indexes one or more claims or external-context records; it is never evidence.",
    motherNode:"A graph index with children. Five archive mothers index vault clusters; ADHD and Four Mahāvākyas are thematic mothers; Love is private pending review.",
    childNode:"A graph node subordinated to a mother for navigation or context. It does not inherit approval or evidence automatically.",
    placeholder:"A privacy-preserving UI position with no public claim. Eight placeholders are not one-to-one aliases for private people or vault records.",
    distillation:"A reviewable transformation from evidence and atomic claims into display copy, labeled by expression type and approval state.",
    sourceRecord:"A public-safe projection of a SourceArtifact. It may expose a safe excerpt or hash but never upgrades private source material to P0."
  },
  sourceArtifacts,
  evidenceSpans,
  claims,
  nodes,
  relations,
  contradictionSets,
  revisions,
  externalContexts,
  approvalEvents,
  auditLedger,
  reviewQueue
};

fs.mkdirSync(path.dirname(TARGET), { recursive:true });
fs.writeFileSync(TARGET, `${JSON.stringify(model, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(ROOT, TARGET)} (${auditLedger.length} audited public nodes)`);
