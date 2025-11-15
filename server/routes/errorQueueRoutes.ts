export function registerErrorQueueRoutes(app, luna) {
  app.get('/api/luna/errors', (req, res) => {
    res.json(luna.errorQueue.list());
  });
}