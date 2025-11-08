// DEBUG endpoint: returns the current req.player context
import { requireAuth } from './middleware/auth'

export default function registerDebugRoutes(app) {
    app.get('/api/debug/admin', requireAuth, (req, res) => {
        res.json({
            message: "Admin debug info",
            player: req.player
        });
    });
}