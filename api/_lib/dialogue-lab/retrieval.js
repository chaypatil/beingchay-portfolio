const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "but", "can",
  "could", "does", "for", "from", "have", "into", "just", "like", "maybe", "more",
  "not", "that", "the", "then", "there", "this", "was", "what", "when", "where", "which",
  "with", "would", "your"
]);

function terms(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term));
}

function retrieveApprovedRecords(query, records, { limit = 4 } = {}) {
  const queryTerms = [...new Set(terms(query))];
  if (!queryTerms.length) return [];
  return records
    .filter(record => record.approvalState === "approved")
    .map(record => {
      const title = terms(record.title || "");
      const body = terms([record.claim, record.content].join(" "));
      const tags = terms((record.tags || []).join(" "));
      const titleMatches = queryTerms.filter(term => title.includes(term)).length;
      const tagMatches = queryTerms.filter(term => tags.includes(term)).length;
      const bodyMatches = queryTerms.filter(term => body.includes(term)).length;
      const score = titleMatches * 12 + tagMatches * 8 + bodyMatches * 3;
      const strong = titleMatches > 0 || tagMatches > 0 || bodyMatches >= Math.min(2, queryTerms.length);
      return { record, score, strong };
    })
    .filter(match => match.strong && match.score >= 6)
    .sort((a, b) => b.score - a.score || String(a.record.id).localeCompare(String(b.record.id)))
    .slice(0, limit)
    .map(match => match.record);
}

function findContradictions(records) {
  return records.flatMap(record => (record.contradictions || []).map(contradiction => ({
    recordId:record.id,
    text:contradiction.text,
    sourceId:contradiction.sourceId,
    temporalScope:contradiction.temporalScope || "unknown"
  })));
}

module.exports = { findContradictions, retrieveApprovedRecords, terms };
