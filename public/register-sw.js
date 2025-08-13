if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Détection automatique du chemin de base
    const basePath = window.location.pathname.startsWith('/liberchat') ? '/liberchat' : '';
    navigator.serviceWorker.register(basePath + '/service-worker.js');
  });
}
