// Script pour contourner le problème de CSP WebSocket
(function() {
    // Supprimer toutes les balises meta CSP existantes
    const existingCSP = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    existingCSP.forEach(meta => meta.remove());
    
    // Ajouter notre propre CSP qui autorise les WebSockets
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self' https: data: blob:; connect-src 'self' https: wss: ws: wss://" + window.location.host + "; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; frame-src *;";
    document.head.insertBefore(meta, document.head.firstChild);
    
    console.log('CSP fixé pour autoriser WebSocket vers:', window.location.host);
})();