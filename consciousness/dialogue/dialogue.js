const state = { password:"", sessionId:null, mode:"listen", busy:false, ended:false };
const $ = selector => document.querySelector(selector);

async function request(action, payload = {}) {
  const response = await fetch("/api/dialogue-lab", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    credentials:"same-origin",
    cache:"no-store",
    body:JSON.stringify({ password:state.password, action, payload })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "Dialogue Lab unavailable");
  return body;
}

function setBusy(busy) {
  state.busy = busy;
  $("#lab-input").disabled = busy;
  $("#lab-form button[type='submit']").disabled = busy;
  $("#lab-status").textContent = busy ? "thinking" : state.ended ? "review" : "private session";
}

function message(role, text, followUpQuestion) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.append(paragraph);
  if (followUpQuestion) {
    const question = document.createElement("span");
    question.className = "follow-up";
    question.textContent = followUpQuestion;
    article.append(question);
  }
  $("#lab-conversation").append(article);
  article.scrollIntoView({ block:"end", behavior:"smooth" });
}

function evidenceSection(title, values) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  const paragraph = document.createElement("p");
  heading.textContent = title;
  paragraph.textContent = Array.isArray(values) ? values.filter(Boolean).join("\n") : values || "None";
  section.append(heading, paragraph);
  return section;
}

function renderEvidence(evidence) {
  const root = $("#evidence-content");
  root.replaceChildren();
  const material = (evidence.relevantPastMaterial || []).map(item => `${item.title} [${item.expressionType}]${item.excerpt ? ` — ${item.excerpt}` : ""}`);
  const links = (evidence.inferredLinks || []).map(item => typeof item === "string" ? item : `${item.from} → ${item.to}: ${item.why || "inferred"}`);
  const contradictions = (evidence.contradictions || []).map(item => `${item.text} (${item.temporalScope})`);
  root.append(
    evidenceSection("Relevant past material", material),
    evidenceSection("Exact sources", evidence.exactSources),
    evidenceSection("Inferred links", links),
    evidenceSection("Contradiction / change", contradictions),
    evidenceSection("Still uncertain", evidence.uncertainty),
    evidenceSection("Possible model update", evidence.possibleModelUpdate?.interpretation || "None")
  );
}

$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  state.password = $("#lab-password").value;
  $("#auth-error").textContent = "";
  try {
    const session = await request("start", { mode:state.mode });
    state.sessionId = session.id;
    $("#auth-card").hidden = true;
    $("#dialogue-app").hidden = false;
    $("#lab-status").textContent = "private session";
    $("#lab-input").focus();
  } catch (error) {
    state.password = "";
    $("#auth-error").textContent = error.message;
    $("#lab-password").select();
  }
});

document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
}));

$("#lab-form").addEventListener("submit", async event => {
  event.preventDefault();
  const input = $("#lab-input");
  const text = input.value.trim();
  if (!text || state.busy || state.ended) return;
  message("chay", text);
  input.value = "";
  setBusy(true);
  try {
    const result = await request("turn", { sessionId:state.sessionId, text, mode:state.mode });
    message("mirror", result.response, result.followUpQuestion);
    renderEvidence(result.evidence);
  } catch (error) {
    message("mirror", `I could not continue this private session: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

function proposalCard(proposal) {
  const article = document.createElement("article");
  article.className = "proposal";
  article.dataset.proposalId = proposal.id;
  const title = document.createElement("h3");
  title.textContent = proposal.type.replaceAll("_", " ");
  const source = document.createElement("blockquote");
  source.textContent = proposal.sourceWording;
  const interpretation = document.createElement("p");
  interpretation.textContent = proposal.interpretation;
  const reason = document.createElement("small");
  reason.textContent = `${proposal.reason} / confidence ${Math.round(proposal.confidence * 100)}% / ${proposal.privacy}`;
  const actions = document.createElement("div");
  actions.className = "proposal-actions";
  for (const action of ["accept", "edit", "reject", "supersede"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.textContent = action;
    actions.append(button);
  }
  article.append(title, source, interpretation, reason, actions);
  return article;
}

$("#end-session").addEventListener("click", async () => {
  if (state.busy || state.ended) return;
  setBusy(true);
  try {
    const review = await request("end", { sessionId:state.sessionId });
    state.ended = true;
    $("#review-summary").textContent = review.summary || "No material model changes proposed.";
    $("#proposal-list").replaceChildren(...review.proposals.map(proposalCard));
    $("#review-dialog").showModal();
  } catch (error) {
    message("mirror", `The private review could not be generated: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$("#proposal-list").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".proposal");
  const action = button.dataset.action;
  const payload = { sessionId:state.sessionId, proposalId:card.dataset.proposalId, action };
  if (action === "edit") payload.editedInterpretation = prompt("Edit the interpretation before accepting:") || "";
  if (action === "supersede") payload.supersedesId = prompt("Existing claim ID to supersede:") || "";
  try {
    const result = await request("decide", payload);
    card.querySelector(".proposal-actions").textContent = result.proposal.status;
  } catch (error) {
    alert(error.message);
  }
});

$("#download-session").addEventListener("click", async () => {
  try {
    const exported = await request("export", { sessionId:state.sessionId });
    const url = URL.createObjectURL(new Blob([exported.content], { type:"text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
});

$("#review-close").addEventListener("click", () => $("#review-dialog").close());
