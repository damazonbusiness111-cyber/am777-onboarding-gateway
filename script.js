(function () {
  // TODO: Replace with your deployed Google Apps Script Web App URL (see Code.gs + README.md)
  var APPS_SCRIPT_URL = 'REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL';
  var AGREEMENT_VERSION = 'V1.0';

  // ---------------------------------------------------------------------
  // Route configuration — single source of truth for all 5 onboarding
  // routes. Adding a new route or field only requires editing this object,
  // not duplicating markup or flow logic.
  // ---------------------------------------------------------------------
  var ROUTES = {
    va: {
      label: 'VA Outreach Collaborator',
      chip: 'Collaborator',
      idPrefix: 'AM777-VA',
      sheetTab: 'VA Agreement Submissions',
      description: 'For approved outreach collaborators helping AM777 with prospect research, outreach, follow-ups, CRM updates, and qualified lead movement.',
      confirmStatement: 'CONFIRMED — I understand the AM777 VA collaboration terms, CRM update requirement, approved pricing rule, expense deduction rule, and revenue/dividend payout logic.',
      extraFields: [
        { id: 'applicationId', label: 'Application ID', required: false, type: 'text', placeholder: 'If you have one' },
        { id: 'outreachExperience', label: 'Outreach Experience', required: true, type: 'textarea', placeholder: 'Briefly describe your outreach / prospecting experience' },
        { id: 'availableTime', label: 'Available Time', required: true, type: 'text', placeholder: 'e.g. 15-20 hrs/week, evenings PH time' },
        { id: 'paymentMethod', label: 'Preferred Payment Method', required: true, type: 'text', placeholder: 'GCash, Bank transfer, PayPal, etc.' },
        { id: 'paymentDetails', label: 'Payment Details', required: false, type: 'text', placeholder: 'Account name / number' }
      ]
    },
    admin: {
      label: 'Admin / Closing Partner',
      chip: 'Operator',
      idPrefix: 'AM777-ADM',
      sheetTab: 'Admin Agreement Submissions',
      description: 'For operators supporting AM777 with lead review, CRM control, follow-up direction, client movement, closing support, and internal coordination.',
      confirmStatement: 'CONFIRMED — I understand the AM777 admin collaboration terms, no-ownership rule, approved pricing rule, CRM responsibility, confidentiality requirement, and payout eligibility logic.',
      extraFields: [
        { id: 'adminRoleType', label: 'Admin Role Type', required: true, type: 'select', options: ['Lead Review', 'CRM Control', 'Closing Support', 'Internal Coordination', 'Mixed / Other'] },
        { id: 'scopeOfSupport', label: 'Scope of Support', required: true, type: 'textarea', placeholder: 'What will you be handling day to day?' },
        { id: 'crmExperience', label: 'CRM / Closing Experience', required: true, type: 'textarea', placeholder: 'Relevant experience with CRM tools or closing deals' },
        { id: 'availability', label: 'Availability', required: true, type: 'text', placeholder: 'e.g. 20 hrs/week, flexible' },
        { id: 'paymentMethod', label: 'Payment Method', required: false, type: 'text', placeholder: 'GCash, Bank transfer, PayPal, etc.' }
      ]
    },
    perks: {
      label: 'Perks-Based Supporter',
      chip: 'Supporter',
      idPrefix: 'AM777-PERK',
      sheetTab: 'Perks-Based Supporter Submissions',
      description: 'For individuals supporting AM777 tools, software, AI stack, GPU, hardware, or development resources in exchange for non-cash supporter perks.',
      confirmStatement: 'CONFIRMED — I understand this is perks-based AM777 support with no equity, no revenue-share, no repayment, and no guaranteed return.',
      extraFields: [
        { id: 'supportAmount', label: 'Support Amount (PHP)', required: true, type: 'number', placeholder: 'e.g. 1500' },
        { id: 'supportType', label: 'Support Type', required: true, type: 'select', options: ['Cash Contribution', 'Software / Tool License', 'Hardware / GPU', 'Development Resource', 'Other'] },
        { id: 'supportPurpose', label: 'Support Purpose', required: true, type: 'text', placeholder: 'What is this support going toward?' },
        { id: 'perkTier', label: 'Selected Perk Tier', required: true, type: 'select', options: ['Supporter (PHP 500-999)', 'Builder Supporter (PHP 1,000-2,999)', 'Stack Sponsor (PHP 3,000-4,999)', 'Infrastructure Sponsor (PHP 5,000-9,999)', 'Ecosystem Patron (PHP 10,000+)'] },
        { id: 'recognitionPreference', label: 'Recognition Preference', required: true, type: 'select', options: ['Public mention is fine', 'Prefer to stay anonymous'] }
      ]
    },
    funder: {
      label: 'Revenue-Share Funder',
      chip: 'Funder',
      idPrefix: 'AM777-FND',
      sheetTab: 'Revenue-Share Funder Submissions',
      description: 'For approved funders supporting a specific AM777 initiative through a capped, project-based revenue-share structure. Subject to review and approval.',
      confirmStatement: 'CONFIRMED — I understand the AM777 revenue-share funding terms, no-equity rule, no-guarantee rule, approved cost deduction, project-specific revenue-share limit, reporting process, and payout eligibility logic.',
      extraFields: [
        { id: 'contributionAmount', label: 'Contribution Amount Proposed (PHP)', required: true, type: 'number', placeholder: 'e.g. 25000' },
        { id: 'fundingType', label: 'Funding Type', required: true, type: 'select', options: ['One-time contribution', 'Staged / milestone-based'] },
        { id: 'fundedInitiative', label: 'Funded Initiative', required: true, type: 'text', placeholder: 'Which project/initiative are you funding?' },
        { id: 'proposedShareTerms', label: 'Proposed Share Terms', required: true, type: 'text', placeholder: 'e.g. 10% of net revenue' },
        { id: 'proposedCap', label: 'Proposed Cap', required: true, type: 'text', placeholder: 'e.g. capped at 2x contribution' },
        { id: 'proposedTermLength', label: 'Proposed Term Length', required: true, type: 'text', placeholder: 'e.g. 12 months' },
        { id: 'reportingCadence', label: 'Reporting Cadence', required: true, type: 'select', options: ['Monthly', 'Quarterly'] },
        { id: 'paymentMethod', label: 'Payment Method', required: true, type: 'text', placeholder: 'GCash, Bank transfer, etc.' },
        { id: 'paymentDetails', label: 'Payment Details', required: false, type: 'text', placeholder: 'Account name / number' }
      ]
    },
    capital: {
      label: 'Formal Capital Inquiry',
      chip: 'Inquiry Only',
      idPrefix: 'AM777-CAP-INQ',
      sheetTab: 'Formal Capital Inquiries',
      description: 'For larger funding or capital-related discussions requiring separate review. This route is an inquiry only and does not create automatic approval.',
      confirmStatement: 'CONFIRMED — I understand this is only a formal capital inquiry and does not create an accepted arrangement, ownership right, repayment right, or revenue-share agreement.',
      extraFields: [
        { id: 'proposedAmountRange', label: 'Proposed Amount / Range', required: true, type: 'text', placeholder: 'e.g. PHP 200,000 - 500,000' },
        { id: 'inquiryType', label: 'Inquiry Type', required: true, type: 'select', options: ['Equity discussion', 'Loan discussion', 'Partnership discussion', 'Other / Not sure yet'] },
        { id: 'businessBackground', label: 'Business Background', required: true, type: 'textarea', placeholder: 'Your relevant background' },
        { id: 'messageIntent', label: 'Message / Intent', required: true, type: 'textarea', placeholder: 'What are you hoping to explore?' },
        { id: 'preferredContactMethod', label: 'Preferred Contact Method', required: true, type: 'text', placeholder: 'Email, WhatsApp, call, etc.' }
      ]
    }
  };

  var STEP_WELCOME = 'welcome';
  var STEP_ROUTE = 'route';
  var STEP_CONTEXT = 'context';
  var STEP_COMMON = 'common';
  var STEP_EXTRA = 'extra';
  var STEP_SIGN = 'sign';
  var STEP_CONFIRM = 'confirm';
  var STEP_ORDER = [STEP_WELCOME, STEP_ROUTE, STEP_CONTEXT, STEP_COMMON, STEP_EXTRA, STEP_SIGN, STEP_CONFIRM];

  var state = { routeKey: null };

  function $(id) { return document.getElementById(id); }

  function stepIndex(step) { return STEP_ORDER.indexOf(step); }

  function goToStep(step) {
    document.querySelectorAll('.step').forEach(function (el) { el.classList.remove('active'); });
    var target = document.querySelector('.step[data-step="' + step + '"]');
    if (target) target.classList.add('active');

    var totalCounted = STEP_ORDER.length - 1; // confirmation screen isn't counted
    var idx = Math.min(stepIndex(step), totalCounted);
    var pct = Math.round((idx / totalCounted) * 100);
    $('progressFill').style.width = Math.max(4, pct) + '%';
    $('stepNum').textContent = idx + 1;
    $('stepTotal').textContent = totalCounted + 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (step === STEP_SIGN) {
      // Reading getBoundingClientRect() forces the browser to compute layout
      // on demand, so calling this synchronously (right after the class
      // change that makes the canvas visible) is reliable — no need to wait
      // on requestAnimationFrame, which some environments never fire.
      resizeCanvas();
    }
  }
  window.goToStep = goToStep;

  // ---------------------------------------------------------------------
  // Route selection
  // ---------------------------------------------------------------------
  window.selectRoute = function (routeKey) {
    state.routeKey = routeKey;
    document.querySelectorAll('.route-card').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.route === routeKey);
    });
  };

  window.confirmRouteSelection = function () {
    if (!state.routeKey) {
      $('routeError').style.display = 'block';
      return;
    }
    $('routeError').style.display = 'none';
    renderRouteContext();
    goToStep(STEP_CONTEXT);
  };

  function renderRouteContext() {
    var route = ROUTES[state.routeKey];
    $('contextChip').textContent = route.chip;
    $('contextTitle').textContent = route.label;
    $('contextDescription').textContent = route.description;
  }

  // ---------------------------------------------------------------------
  // Common fields validation
  // ---------------------------------------------------------------------
  function setFieldError(fieldWrapId, isInvalid) {
    var el = $(fieldWrapId);
    if (!el) return;
    el.classList.toggle('invalid', !!isInvalid);
  }

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  window.validateCommonFields = function () {
    var valid = true;

    var fullName = $('fullName').value.trim();
    setFieldError('f_fullName', !fullName); if (!fullName) valid = false;

    var email = $('email').value.trim();
    var emailInvalid = !email || !isValidEmail(email);
    setFieldError('f_email', emailInvalid); if (emailInvalid) valid = false;

    var mobile = $('mobile').value.trim();
    setFieldError('f_mobile', !mobile); if (!mobile) valid = false;

    var location = $('location').value.trim();
    setFieldError('f_location', !location); if (!location) valid = false;

    var fbLink = $('fbLink').value.trim();
    setFieldError('f_fbLink', !fbLink); if (!fbLink) valid = false;

    if (valid) {
      renderExtraFields();
      goToStep(STEP_EXTRA);
    }
  };

  // ---------------------------------------------------------------------
  // Route-specific extra fields — rendered dynamically from ROUTES config
  // ---------------------------------------------------------------------
  function renderExtraFields() {
    var route = ROUTES[state.routeKey];
    var container = $('extraFieldsContainer');
    container.innerHTML = '';

    route.extraFields.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.id = 'f_extra_' + f.id;

      var label = document.createElement('label');
      label.setAttribute('for', 'extra_' + f.id);
      label.textContent = f.label;
      if (f.required) {
        var req = document.createElement('span'); req.className = 'req'; req.textContent = '*'; label.appendChild(req);
      } else {
        var opt = document.createElement('span'); opt.className = 'opt'; opt.textContent = 'optional'; label.appendChild(opt);
      }
      wrap.appendChild(label);

      var input;
      if (f.type === 'select') {
        input = document.createElement('select');
        var blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Select an option'; input.appendChild(blank);
        f.options.forEach(function (opt) {
          var o = document.createElement('option'); o.value = opt; o.textContent = opt; input.appendChild(o);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.placeholder = f.placeholder || '';
      } else {
        input = document.createElement('input');
        input.type = f.type;
        input.placeholder = f.placeholder || '';
      }
      input.id = 'extra_' + f.id;
      wrap.appendChild(input);

      var err = document.createElement('div');
      err.className = 'error-text';
      err.textContent = f.label + ' is required.';
      wrap.appendChild(err);

      container.appendChild(wrap);
    });
  }

  window.validateExtraFields = function () {
    var route = ROUTES[state.routeKey];
    var valid = true;

    route.extraFields.forEach(function (f) {
      if (!f.required) return;
      var el = $('extra_' + f.id);
      var empty = !el.value.trim();
      setFieldError('f_extra_' + f.id, empty);
      if (empty) valid = false;
    });

    if (valid) {
      renderSignStep();
      goToStep(STEP_SIGN);
    }
  };

  function renderSignStep() {
    var route = ROUTES[state.routeKey];
    $('confirmStatementText').textContent = route.confirmStatement;
  }

  // ---------------------------------------------------------------------
  // Signature canvas
  // ---------------------------------------------------------------------
  var canvas = $('sigCanvas');
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var hasDrawn = false;

  function resizeCanvas() {
    var ratio = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return; // still hidden, nothing to do yet
    var dataUrl = hasDrawn ? canvas.toDataURL() : null;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dataUrl) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = dataUrl;
    }
  }
  window.addEventListener('resize', resizeCanvas);

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
  function startDraw(e) { drawing = true; hasDrawn = true; var p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
  function moveDraw(e) { if (!drawing) return; var p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
  function endDraw() { drawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  window.clearSignature = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
  };

  // ---------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------
  function generateFallbackId(idPrefix) {
    var d = new Date();
    var stamp = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    return idPrefix + '-' + stamp + '-' + rand;
  }

  window.submitAgreement = function () {
    var route = ROUTES[state.routeKey];
    var valid = true;

    var typedSig = $('typedSig').value.trim();
    setFieldError('f_typedSig', !typedSig); if (!typedSig) valid = false;

    setFieldError('f_drawnSig', !hasDrawn); if (!hasDrawn) valid = false;

    var confirmPhrase = $('confirmPhrase').value.trim();
    var phraseInvalid = confirmPhrase.toUpperCase() !== 'CONFIRMED';
    setFieldError('f_confirmPhrase', phraseInvalid); if (phraseInvalid) valid = false;

    if (!valid) return;

    var submitBtn = $('submitBtn');
    var submitError = $('submitError');
    submitError.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    var recordId = generateFallbackId(route.idPrefix);
    var timestamp = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

    var extraData = {};
    route.extraFields.forEach(function (f) {
      extraData[f.id] = $('extra_' + f.id).value.trim();
    });

    var payload = {
      routeType: state.routeKey,
      sheetTab: route.sheetTab,
      agreementVersion: AGREEMENT_VERSION,
      recordId: recordId,
      timestamp: timestamp,
      fullName: $('fullName').value.trim(),
      email: $('email').value.trim(),
      mobile: $('mobile').value.trim(),
      location: $('location').value.trim(),
      fbLink: $('fbLink').value.trim(),
      extra: extraData,
      typedSignature: typedSig,
      drawnSignature: canvas.toDataURL('image/png'),
      confirmPhrase: confirmPhrase,
      confirmStatement: route.confirmStatement
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (data) {
        var finalId = (data && data.recordId) ? data.recordId : recordId;
        $('confirmName').textContent = payload.fullName || 'there';
        $('confirmId').textContent = finalId;
        $('confirmTimestamp').textContent = timestamp;
        $('confirmRoute').textContent = route.label;
        goToStep(STEP_CONFIRM);
      })
      .catch(function () {
        submitError.style.display = 'block';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      });
  };
})();

// =========================================================================
// FAQ Concierge — self-contained snippet, independent of the route engine
// above. Reference-only: answers questions about the gateway, does not
// collect data or replace the actual onboarding form.
// =========================================================================
(function () {
  var FAQ_DATA = [
    {
      q: 'What\'s the difference between the routes?',
      a: 'Each route is a different kind of relationship with AM777: VA and Admin are working collaborations paid through commission. Perks Supporter is non-cash support in exchange for perks — no equity, no return. Revenue-Share Funder is capital tied to a specific project\'s revenue, capped and time-limited. Formal Capital Inquiry is just a conversation starter for larger discussions — it doesn\'t create any agreement on its own.'
    },
    {
      q: 'How is VA / Admin commission calculated?',
      a: 'Commission = (Client Payment − Approved Expenses) × your agreed %. It\'s based on net revenue after real costs, not the client\'s full payment, and it only counts if the lead is logged in the CRM.'
    },
    {
      q: 'Is a Revenue-Share contribution guaranteed a return?',
      a: 'No. It\'s a revenue-share, not a loan or equity stake — your share depends on how the specific funded initiative actually performs, with an agreed cap and term length. There is no guaranteed return.'
    },
    {
      q: 'What happens after I submit?',
      a: 'Nothing is auto-approved. Your submission is recorded with a unique Record ID and reviewed by the AM777 team. If approved, you\'ll receive next-step instructions specific to your route.'
    },
    {
      q: 'Is my information kept confidential?',
      a: 'Yes. AM777 protects internal systems, client details, pricing, workflows, and private operating documents — and the same confidentiality is expected from you regarding anything you gain access to.'
    },
    {
      q: 'What is InfraMind777?',
      a: 'AM777 Automation Solutions operates under the broader InfraMind777 ecosystem — the parent platform focused on problem mapping, expectation setting, and digital systems. This gateway is specific to AM777 onboarding.'
    }
  ];

  var launcher = document.getElementById('conciergeLauncher');
  var panel = document.getElementById('concierge');
  var closeBtn = document.getElementById('conciergeClose');
  var thread = document.getElementById('chatThread');
  var optionsBox = document.getElementById('faqOptions');
  var greeted = false;

  function addBubble(text, sender) {
    var el = document.createElement('div');
    el.className = 'chat-bubble ' + sender;
    el.textContent = text;
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
    return el;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'typing-bubble';
    el.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
    return el;
  }

  function renderQuestionList() {
    optionsBox.innerHTML = '';
    FAQ_DATA.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.q;
      btn.addEventListener('click', function () { askQuestion(i); });
      optionsBox.appendChild(btn);
    });
  }

  function askQuestion(i) {
    var item = FAQ_DATA[i];
    addBubble(item.q, 'user');
    optionsBox.innerHTML = '';
    var typing = showTyping();

    setTimeout(function () {
      typing.remove();
      addBubble(item.a, 'bot');

      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'faq-back';
      backBtn.textContent = '← Back to questions';
      backBtn.addEventListener('click', function () {
        backBtn.remove();
        renderQuestionList();
      });
      thread.appendChild(backBtn);
      thread.scrollTop = thread.scrollHeight;
    }, 550);
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (!greeted) {
      greeted = true;
      addBubble('Hi — I can answer common questions about this onboarding gateway. Pick one below, or close this and use the form above for your actual submission.', 'bot');
      renderQuestionList();
    }
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  launcher.addEventListener('click', function () {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);
})();
