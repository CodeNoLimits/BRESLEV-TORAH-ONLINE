// Fichier : proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001; // Port pour le proxy

// Autorise les requêtes depuis ton front-end Replit
app.use(cors());

// Le proxy qui relaie les appels vers Sefaria
app.use('/sefaria-api', createProxyMiddleware({
    target: 'https://www.sefaria.org', // La véritable API Sefaria
    changeOrigin: true,
    pathRewrite: {
        '^/sefaria-api': '/api', // Réécrit l'URL pour correspondre à la structure de Sefaria
    },
    onError: (err, req, res) => {
        console.error('Erreur du proxy:', err);
        res.status(500).send('Erreur du serveur proxy.');
    }
}));

app.listen(PORT, () => {
    console.log(`[Proxy] Serveur mandataire démarré et écoutant sur le port ${PORT}`);
});