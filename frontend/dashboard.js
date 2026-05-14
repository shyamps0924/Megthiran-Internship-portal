(function () {
  const authButton = document.getElementById('authButton');
  const detailsButton = document.getElementById('detailsButton');
  const detailsPanel = document.getElementById('detailsPanel');

  function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  function syncAuthUi() {
    authButton.textContent = isLoggedIn() ? 'Logout' : 'Login';
  }

  authButton.addEventListener('click', function () {
    if (isLoggedIn()) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    window.location.href = 'login.html';
  });

  detailsButton.addEventListener('click', function () {
    const isOpen = detailsPanel.classList.toggle('is-open');
    detailsButton.textContent = isOpen ? 'Hide Details' : 'View Details';
    detailsButton.setAttribute('aria-expanded', String(isOpen));
  });

  syncAuthUi();
})();
