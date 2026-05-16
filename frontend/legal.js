(function () {
  function formatEffectiveDate() {
    return 'May 15, 2026';
  }

  function initLegalPage() {
    const backLink = document.querySelector('[data-legal-back]');
    const title = document.body.dataset.legalTitle || 'Legal';
    const slug = document.body.dataset.legalSlug;
    const effectiveDateNode = document.querySelector('[data-legal-effective-date]');
    const contentNode = document.querySelector('[data-legal-content]');
    const legalDocuments = window.LEGAL_DOCUMENTS || {};
    const legalDocument = slug ? legalDocuments[slug] : null;

    if (document.title && title) {
      document.title = title + ' | Megthiran';
    }

    if (backLink) {
      backLink.addEventListener('click', function (event) {
        if (window.history.length > 1) {
          event.preventDefault();
          window.history.back();
        }
      });
    }

    if (!legalDocument || !contentNode) {
      return;
    }

    if (effectiveDateNode) {
      effectiveDateNode.textContent = 'Effective Date: ' + formatEffectiveDate();
    }

    contentNode.innerHTML = legalDocument.contentHtml;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLegalPage);
  } else {
    initLegalPage();
  }
})();
