/* Portfolio animations: scroll reveals, the setter race, the Peoplebox role-tagging loop
   and the Ticombo event watcher. Every scene renders from a single clock value, so
   replay = reset the clock, and reduced-motion users get the finished state. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function initials(name) {
    return name.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }
  function setHTML(el, html) { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

  /* Plays a scene when it scrolls into view; exposes play() for the replay button. */
  function runner(root, render, simTotal, realTotal) {
    var start = null, raf = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(simTotal, ((now - start) / realTotal) * simTotal);
      render(t);
      if (t < simTotal) raf = requestAnimationFrame(frame);
    }
    function play() {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { render(simTotal); return; }
      start = null; render(0); raf = requestAnimationFrame(frame);
    }
    render(reduce ? simTotal : 0);
    if (!reduce) {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); play(); } });
        }, { threshold: 0, rootMargin: '0px 0px -25% 0px' });
        io.observe(root);
      } else { play(); }
    }
    var btn = root.querySelector('[data-replay]');
    if (btn) btn.addEventListener('click', play);
  }

  /* ---------------- Scroll reveals ---------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); rio.unobserve(e.target); } });
      }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });
      revealEls.forEach(function (el) { rio.observe(el); });
    }
  }

  /* ---------------- Race: by hand vs the AI setter ---------------- */
  var LEADS = [
    { n: 'Priya N.', c: 'AI', t: 'warm', d: "Hey Priya, here's the guide you asked for: [link]. Quick one, are you replying to leads by hand right now or with a tool?" },
    { n: 'Marcus T.', c: 'We do outreach by hand, reply rate is under 2%. AI', t: 'hot', d: "Hey Marcus, saw the under 2% reply rate on manual outreach, this guide breaks that down: [link]. Is that on connection requests or follow-ups?" },
    { n: 'Aisha K.', c: 'Interested', t: 'cold', d: "Hey Aisha, here's the guide: [link]. Hope it's useful." },
    { n: 'Daniel R.', c: 'AI, our SDRs lose half a day to replies', t: 'hot', d: "Hey Daniel, half a day of SDR time on replies is exactly what this fixes: [link]. How many comments does one post usually pull?" },
    { n: 'GrowthBot', c: 'Check out our tool, DM me', t: 'skip', d: 'A vendor pitch, not a lead. Skipped.' },
    { n: 'Tom B.', c: 'AI', t: 'warm', d: "Hey Tom, here's the guide: [link]. Are you focused more on volume or on quality right now?" },
    { n: 'Leah M.', c: '+1', t: 'cold', d: "Hey Leah, here's the guide: [link]. Hope it's useful." },
    { n: 'Elena V.', c: 'Tried two tools, both sounded robotic. AI', t: 'hot', d: "Hey Elena, robotic-sounding tools are the usual problem, this shows how to avoid it: [link]. Which two did you try?" },
    { n: 'Sam O.', c: 'AI pls', t: 'warm', d: "Hey Sam, here's the guide: [link]. Are you doing this by hand right now or with a tool?" },
    { n: 'Jay P.', c: '@Ravi you need this', t: 'skip', d: 'Just a tag, nobody asked for anything. Skipped.' }
  ];
  var TAG = { hot: 'Hot', warm: 'Warm', cold: 'Cold', skip: 'Skip' };
  // the same six steps on both sides; only the time each one takes is different
  var STEP_NAMES = ['Open', 'Profile', 'Score', 'Mark', 'Write', 'Send'];
  var MANUAL_STEPS = [20, 60, 40, 10, 140, 30];  // seconds, about 5 minutes a lead
  var AI_STEPS = [2, 5, 6, 2, 12, 3];            // seconds, about 30 seconds a lead

  function stepAt(steps, p) {
    var total = steps.reduce(function (a, b) { return a + b; }, 0), acc = 0;
    for (var i = 0; i < steps.length; i++) { acc += steps[i]; if (p * total < acc) return i; }
    return steps.length - 1;
  }
  function nowText(step, lead, ai) {
    var first = lead.n.split(' ')[0];
    switch (step) {
      case 0: return 'Opening the comments';
      case 1: return 'Checking ' + first + '’s profile';
      case 2: return 'Evaluating what ' + first + ' wrote';
      case 3: return 'Marking ' + first + ' as ' + TAG[lead.t].toLowerCase();
      case 4: return lead.t === 'skip' ? 'Skipping, nothing to answer' : 'Writing a personal message to ' + first;
      default: return ai ? (lead.t === 'skip' ? 'Filtered out' : 'Queued for a human to send') : 'Sending to ' + first;
    }
  }

  document.querySelectorAll('[data-race]').forEach(function (root) {
    var SIM = 600, REAL = 14000;
    var lanes = {};
    ['manual', 'ai'].forEach(function (key) {
      var lane = root.querySelector('[data-lane="' + key + '"]');
      var list = lane.querySelector('[data-list]');
      list.innerHTML = '';
      var rows = LEADS.map(function (lead) {
        var li = document.createElement('li');
        li.className = 'lead';
        li.innerHTML = '<span class="lead-avatar">' + initials(lead.n) + '</span>' +
          '<span class="lead-text"><b>' + esc(lead.n) + '</b> <i>commented “' + esc(lead.c) + '”</i></span>' +
          '<span class="lead-status"></span>';
        list.appendChild(li);
        return { el: li, status: li.querySelector('.lead-status') };
      });
      var steps = lane.querySelector('[data-steps]');
      steps.innerHTML = STEP_NAMES.map(function (s) { return '<span>' + s + '</span>'; }).join('');
      lanes[key] = { rows: rows, clock: lane.querySelector('[data-clock]'), now: lane.querySelector('[data-now]'),
        steps: steps.children, done: lane.querySelector('[data-done]'), detail: lane.querySelector('[data-detail]') };
    });

    function lightStep(lane, idx) {
      for (var i = 0; i < lane.steps.length; i++) {
        lane.steps[i].className = i < idx ? 'is-past' : (i === idx ? 'is-on' : '');
      }
    }

    function render(t) {
      var visible = Math.ceil(Math.min(1, t / 30) * LEADS.length);
      // by hand
      var m = lanes.manual, mPer = 300, mDone = 0, mActive = null;
      m.rows.forEach(function (row, i) {
        row.el.classList.toggle('is-in', i < visible || t >= SIM);
        var s = i * mPer, e = s + mPer;
        if (t >= e) { mDone++; row.el.classList.remove('is-active'); setHTML(row.status, '<span class="pill pill--sent">Sent</span>'); }
        else if (t >= s && t < SIM) {
          row.el.classList.add('is-active');
          var p = (t - s) / mPer;
          mActive = { lead: LEADS[i], step: stepAt(MANUAL_STEPS, p) };
          setHTML(row.status, '<span class="lead-bar"><i style="width:' + Math.round(p * 100) + '%"></i></span>');
        } else { row.el.classList.remove('is-active'); setHTML(row.status, '<span class="pill">Waiting</span>'); }
      });
      m.clock.textContent = fmt(t);
      m.done.textContent = mDone;
      if (t >= SIM) {
        var warm = LEADS.filter(function (l, i) { return l.t === 'hot' && (i + 1) * mPer > SIM; }).length;
        setHTML(m.now, '10 minutes in');
        setHTML(m.detail, mDone + ' answered. ' + (10 - mDone) + ' still waiting, ' + warm + ' of them with a real problem to solve.');
        lightStep(m, -1);
      } else if (mActive) {
        setHTML(m.now, esc(nowText(mActive.step, mActive.lead, false)) + '<span class="caret"></span>');
        setHTML(m.detail, 'Lead ' + (LEADS.indexOf(mActive.lead) + 1) + ' of 10');
        lightStep(m, mActive.step);
      } else { setHTML(m.now, 'Waiting for comments'); setHTML(m.detail, '&nbsp;'); lightStep(m, -1); }

      // AI setter
      var a = lanes.ai, aPer = 30, aEnd = aPer * LEADS.length, aDone = 0, aActive = null;
      a.rows.forEach(function (row, i) {
        row.el.classList.toggle('is-in', i < visible || t >= SIM);
        var lead = LEADS[i], s = i * aPer, e = s + aPer;
        var tag = '<span class="pill pill--' + lead.t + '">' + TAG[lead.t] + '</span>';
        if (t >= e) {
          aDone++; row.el.classList.remove('is-active');
          setHTML(row.status, tag + (lead.t === 'skip' ? '' : '<span class="pill pill--sent">Ready</span>'));
        } else if (t >= s) {
          row.el.classList.add('is-active');
          var p = (t - s) / aPer, st = stepAt(AI_STEPS, p);
          aActive = { lead: lead, step: st, p: p };
          setHTML(row.status, st >= 3 ? tag : '<span class="pill pill--work">Reading</span>');
        } else { row.el.classList.remove('is-active'); setHTML(row.status, '<span class="pill">Waiting</span>'); }
      });
      a.clock.textContent = fmt(Math.min(t, aEnd));
      a.clock.classList.toggle('is-done', t >= aEnd);
      a.done.textContent = aDone;
      if (t >= aEnd) {
        var skipped = LEADS.filter(function (l) { return l.t === 'skip'; }).length;
        setHTML(a.now, 'All 10 handled in ' + fmt(aEnd));
        setHTML(a.detail, (10 - skipped) + ' personal messages ready for a human to send. ' + skipped + ' spam and tag comments filtered out.');
        lightStep(a, -1);
      } else if (aActive) {
        setHTML(a.now, esc(nowText(aActive.step, aActive.lead, true)) + '<span class="caret"></span>');
        if (aActive.step === 4 && aActive.lead.t !== 'skip') {
          var total = AI_STEPS.reduce(function (x, y) { return x + y; }, 0);
          var ws = (AI_STEPS[0] + AI_STEPS[1] + AI_STEPS[2] + AI_STEPS[3]) / total, we = ws + AI_STEPS[4] / total;
          var q = Math.min(1, Math.max(0, (aActive.p - ws) / (we - ws)));
          setHTML(a.detail, '“' + esc(aActive.lead.d.slice(0, Math.ceil(q * aActive.lead.d.length))) + '”');
        } else {
          setHTML(a.detail, 'Lead ' + (LEADS.indexOf(aActive.lead) + 1) + ' of 10');
        }
        lightStep(a, aActive.step);
      } else { setHTML(a.now, 'Waiting for comments'); setHTML(a.detail, '&nbsp;'); lightStep(a, -1); }
    }

    runner(root, render, SIM, REAL);
  });

  /* ---------------- Peoplebox: teaching the model to read job roles ---------------- */
  var ROLES = [
    { r: 'SDE-3, Platform', d: 'Backend', s: 'Senior' },
    { r: 'Frontend Developer, React', d: 'Frontend', s: 'Mid' },
    { r: 'Data Engineer II', d: 'Data', s: 'Mid' },
    { r: 'Staff SRE', d: 'DevOps', s: 'Staff' },
    { r: 'Junior QA Automation', d: 'QA', s: 'Junior' },
    { r: 'ML Engineer, Search', d: 'ML', s: 'Mid' },
    { r: 'Engineering Manager, Payments', d: 'Backend', s: 'Manager' },
    { r: 'Sr. Backend Engineer (Go)', d: 'Backend', s: 'Senior' }
  ];

  document.querySelectorAll('[data-roles]').forEach(function (root) {
    var SIM = 100, REAL = 11000;
    var list = root.querySelector('[data-role-list]');
    list.innerHTML = '';
    var rows = ROLES.map(function (role) {
      var li = document.createElement('li');
      li.className = 'role';
      li.innerHTML = '<span class="role-title">' + esc(role.r) + '</span><span class="role-tags"></span><span class="role-check"></span>';
      list.appendChild(li);
      return { el: li, tags: li.querySelector('.role-tags'), check: li.querySelector('.role-check') };
    });
    var bar = root.querySelector('[data-meter] i');
    var meterLabel = root.querySelector('[data-meter-label]');
    var round = root.querySelector('[data-round]');
    var match = root.querySelector('[data-match]');
    var phase = root.querySelector('[data-phase]');

    function render(t) {
      // 0-60: roles arrive, get tagged by annotators, then reviewed
      rows.forEach(function (row, i) {
        var a = i * 6, tagAt = a + 3, reviewAt = a + 5;
        row.el.classList.toggle('is-in', t >= a);
        var role = ROLES[i];
        setHTML(row.tags, t >= tagAt ? '<span class="pill pill--warm">' + role.d + '</span><span class="pill">' + role.s + '</span>' : '');
        setHTML(row.check, t >= reviewAt ? 'Reviewed' : '');
        row.el.classList.toggle('is-active', t >= a && t < reviewAt + 1);
      });
      // accuracy climbs with each fine-tuning round, landing at 98%
      var p = Math.min(1, Math.max(0, (t - 20) / 60));
      var r = t < 20 ? 0 : (p < 0.34 ? 1 : (p < 0.67 ? 2 : 3));
      bar.style.width = Math.round((t < 20 ? 0.08 : 0.3 + p * 0.68) * 100) + '%';
      setHTML(round, r ? 'Fine-tuning round ' + r : 'Collecting labelled roles');
      setHTML(meterLabel, t >= 80 ? '98% accuracy' : (t < 20 ? 'Model is guessing' : 'Getting sharper…'));
      root.classList.toggle('is-done', t >= 80);
      setHTML(phase, t < 20 ? 'Annotators tag every role by domain and seniority' : (t < 80 ? 'Reviewed labels feed each fine-tuning round' : 'The model now reads roles like a recruiter'));
      match.classList.toggle('is-in', t >= 85);
    }

    runner(root, render, SIM, REAL);
  });

  /* ---------------- Ticombo: live events listed automatically ---------------- */
  var EVENTS = [
    { e: 'Arena show', w: 'Copenhagen', s: 'Venue calendar' },
    { e: 'Festival day pass', w: 'Berlin', s: 'Promoter page' },
    { e: 'Club night', w: 'Amsterdam', s: 'Box office' },
    { e: 'Stadium tour date', w: 'Stockholm', s: 'Venue calendar' },
    { e: 'Comedy special', w: 'Oslo', s: 'Promoter page' }
  ];

  document.querySelectorAll('[data-events]').forEach(function (root) {
    var SIM = 100, REAL = 10000;
    var sources = root.querySelectorAll('[data-source]');
    var feed = root.querySelector('[data-feed]');
    var board = root.querySelector('[data-board]');
    feed.innerHTML = ''; board.innerHTML = '';
    var fRows = EVENTS.map(function (ev) {
      var li = document.createElement('li');
      li.className = 'ev';
      li.innerHTML = '<span class="pill pill--work">New</span><span>' + esc(ev.e) + ' · ' + esc(ev.w) + '</span><i>' + esc(ev.s) + '</i>';
      feed.appendChild(li);
      return li;
    });
    var bRows = EVENTS.map(function (ev) {
      var li = document.createElement('li');
      li.className = 'listing';
      li.innerHTML = '<b>' + esc(ev.e) + '</b><span>' + esc(ev.w) + '</span><span class="pill pill--sent">Listed</span>';
      board.appendChild(li);
      return li;
    });
    var count = root.querySelector('[data-listed]');

    function render(t) {
      var listed = 0;
      EVENTS.forEach(function (ev, i) {
        var found = 10 + i * 15, listAt = found + 7;
        fRows[i].classList.toggle('is-in', t >= found);
        fRows[i].classList.toggle('is-active', t >= found && t < listAt);
        bRows[i].classList.toggle('is-in', t >= listAt);
        if (t >= listAt) listed++;
        sources.forEach(function (src) {
          if (src.getAttribute('data-source') === ev.s && t >= found && t < listAt) src.classList.add('is-hit');
        });
      });
      sources.forEach(function (src) {
        var hit = EVENTS.some(function (ev, i) { var f = 10 + i * 15; return ev.s === src.getAttribute('data-source') && t >= f && t < f + 7; });
        src.classList.toggle('is-hit', hit);
      });
      count.textContent = listed;
    }

    runner(root, render, SIM, REAL);
  });
})();
