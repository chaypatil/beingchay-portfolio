const MIRROR_STOP_WORDS = new Set([
  "a","about","am","an","and","are","as","at","be","because","but","can","chay",
  "did","do","does","for","from","had","has","have","he","his","how","i","if",
  "in","is","it","like","me","of","on","or","so","that","the","this","to","was",
  "what","when","where","which","who","why","with","would","you","your"
]);

const TOPIC_ROUTES = [
  {
    terms:["ambition","ambitious","legacy","success"],
    nodes:["pothos","glory","agency"],
    reply:"for chay, ambition is pothos given agency: chase what feels unreachable, then prove it through work that changes something beyond him. status alone doesn’t clear the bar. small hobby, obviously."
  },
  {
    terms:["control","preparation","procrastination","systems"],
    nodes:["preparation","agency","information-gap"]
  },
  {
    terms:["music","sound","techno","rave"],
    nodes:["sound","fallout","schranz"]
  },
  {
    terms:["mind","mirror","consciousness"],
    nodes:["consciousness","cloud-consciousness","information-gap"]
  },
  {
    terms:["adhd","focus","attention"],
    nodes:["adhd","adhd-initiation-fog","adhd-urgency-focus"]
  }
];

export function normalizeMirrorText(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function mirrorTerms(value) {
  return normalizeMirrorText(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(term => term.length > 2 && !MIRROR_STOP_WORDS.has(term));
}

function topicRoute(question) {
  const terms = new Set(mirrorTerms(question));
  return TOPIC_ROUTES.find(route => route.terms.some(term => terms.has(term)));
}

export function mirrorConceptReply(question) {
  const route = topicRoute(question);
  return route?.reply ? { text:route.reply, nodes:route.nodes } : null;
}

export function rankMirrorNodes(question, nodes) {
  const normalizedQuestion = normalizeMirrorText(question);
  const terms = mirrorTerms(question);
  const route = topicRoute(question);
  const routePriority = new Map((route?.nodes || []).map((id, index) => [id, 30 - index * 4]));
  return nodes
    .filter(node => node.privacy !== "locked")
    .map(node => {
      const label = normalizeMirrorText(node.label);
      const haystack = normalizeMirrorText([
        node.label,
        node.type,
        node.summary,
        node.status,
        node.note,
        ...(node.relations || []).flat()
      ].join(" "));
      let score = routePriority.get(node.id) || 0;
      if (normalizedQuestion.includes(label) && label.length > 3) score += 22;
      for (const term of terms) {
        const labelWords = new Set(label.split(/[^a-z0-9]+/));
        if (labelWords.has(term)) score += 10;
        else if (label.includes(term)) score += 6;
        else if (haystack.includes(term)) score += 2;
      }
      return { node, score };
    })
    .filter(entry => entry.score >= 2)
    .sort((a, b) => b.score - a.score || b.node.r - a.node.r)
    .slice(0, 3);
}

export function rankVaultRecords(question, records, { alignedNodeIds = [] } = {}) {
  const terms = mirrorTerms(question);
  if (!terms.length) return [];
  const aligned = new Set(alignedNodeIds);
  return records
    .filter(record => record.privacy !== "redacted")
    .map(record => {
      const title = normalizeMirrorText(`${record.title} ${record.path}`);
      const content = normalizeMirrorText(record.content);
      const nodeIds = record.nodeIds || [];
      const titleMatches = terms.filter(term => title.includes(term)).length;
      const nodeMatches = terms.filter(term => nodeIds.some(id => normalizeMirrorText(id).includes(term))).length;
      const contentMatches = terms.filter(term => content.includes(term)).length;
      const alignedMatches = nodeIds.filter(id => aligned.has(id)).length;
      const strong = titleMatches > 0
        || nodeMatches > 0
        || (terms.length >= 2 && contentMatches >= 2 && alignedMatches > 0);
      const score = titleMatches * 14 + nodeMatches * 10 + contentMatches * 2 + alignedMatches * 6;
      return { record, score, strong, titleMatches, nodeMatches, contentMatches, alignedMatches };
    })
    .filter(entry => entry.strong && entry.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function asksForVaultEvidence(question) {
  return /\b(exact|quote|source|vault|wrote|written|said|evidence)\b/i.test(question);
}
