(function () {
  const card = document.getElementById('verifyCard');
  const params = new URLSearchParams(window.location.search);
  const internId = String(params.get('internId') || '').trim().toUpperCase();

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderInvalid(message) {
    card.className = 'verify-card verify-card-invalid';
    card.innerHTML = [
      '<div class="verify-status verify-status-invalid">',
      '<span class="verify-mark" aria-hidden="true">&#10060;</span>',
      '<div>',
      '<p class="verify-kicker">Certificate Status</p>',
      '<h2>&#10060; Invalid Certificate</h2>',
      '<p>' + escapeHtml(message || 'This certificate has not been issued by Megthiran Internship Program.') + '</p>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderError() {
    card.className = 'verify-card verify-card-error';
    card.innerHTML = [
      '<div class="verify-status verify-status-invalid">',
      '<span class="verify-mark" aria-hidden="true">!</span>',
      '<div>',
      '<p class="verify-kicker">Verification Unavailable</p>',
      '<h2>Unable to verify right now</h2>',
      '<p>Please check the Intern ID and try again in a moment.</p>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderVerified(certificate) {
    const rows = [
      ['Student Name', certificate.studentName],
      ['Intern ID', certificate.internId],
      ['Domain Name', certificate.domainName],
      ['Domain ID', certificate.domainId],
      ['Package', certificate.package],
      ['Completed Status', certificate.completedStatus],
      ['Issued By', certificate.issuedBy],
    ];

    card.className = 'verify-card verify-card-valid';
    card.innerHTML = [
      '<div class="verify-status verify-status-valid">',
      '<span class="verify-mark" aria-hidden="true">&#9989;</span>',
      '<div>',
      '<p class="verify-kicker">Certificate Status</p>',
      '<h2>&#9989; Certificate Verified</h2>',
      '<p>This internship completion certificate is valid and issued by Megthiran Internship Program.</p>',
      '</div>',
      '</div>',
      '<dl class="verify-details">',
      rows.map(function (row) {
        return '<div><dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1] || '-') + '</dd></div>';
      }).join(''),
      '</dl>',
    ].join('');
  }

  async function verifyCertificate() {
    if (!internId) {
      renderInvalid('This certificate has not been issued by Megthiran Internship Program.');
      return;
    }

    try {
      const records = Array.isArray(window.MEGTHIRAN_CERTIFICATE_RECORDS)
        ? window.MEGTHIRAN_CERTIFICATE_RECORDS
        : [];
      const certificate = records.find(function (record) {
        return String(record.internId || '').trim().toUpperCase() === internId;
      });

      if (!certificate) {
        renderInvalid('This certificate has not been issued by Megthiran Internship Program.');
        return;
      }

      renderVerified(certificate);
    } catch (error) {
      renderError();
    }
  }

  verifyCertificate();
})();
