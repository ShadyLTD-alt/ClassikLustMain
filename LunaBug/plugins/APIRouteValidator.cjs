
// LunaBug/plugins/APIRouteValidator/index.mjs

export class APIRouteValidator {
  constructor(luna) {
    this.luna = luna;
    this.registeredRoutes = new Map();
    this.failedRoutes = [];
    this.duplicateRoutes = [];
  }

  async init() {
    console.log('🔍 [APIRouteValidator] Initializing...');
    this.luna.on('route:register', this.validateRoute.bind(this));
    this.luna.on('server:ready', this.auditAllRoutes.bind(this));
  }

  validateRoute(route) {
    const { method, path, handler } = route;
    const routeKey = `${method}:${path}`;

    // Check for duplicates
    if (this.registeredRoutes.has(routeKey)) {
      this.duplicateRoutes.push({
        route: routeKey,
        original: this.registeredRoutes.get(routeKey),
        duplicate: route,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ [APIRouteValidator] DUPLICATE ROUTE: ${routeKey}`);
      return false;
    }

    // Check handler is valid
    if (typeof handler !== 'function') {
      this.failedRoutes.push({
        route: routeKey,
        reason: 'Handler is not a function',
        handler: typeof handler
      });
      console.error(`❌ [APIRouteValidator] INVALID HANDLER: ${routeKey}`);
      return false;
    }

    // Check path format
    if (!path.startsWith('/')) {
      this.failedRoutes.push({
        route: routeKey,
        reason: 'Path must start with /',
        path
      });
      console.error(`❌ [APIRouteValidator] INVALID PATH: ${path}`);
      return false;
    }

    this.registeredRoutes.set(routeKey, route);
    console.log(`✅ [APIRouteValidator] Registered: ${routeKey}`);
    return true;
  }

  async auditAllRoutes() {
    console.log('\n🔍 [APIRouteValidator] ========== ROUTE AUDIT ==========');
    console.log(`Total Routes: ${this.registeredRoutes.size}`);
    console.log(`Failed Routes: ${this.failedRoutes.length}`);
    console.log(`Duplicate Routes: ${this.duplicateRoutes.length}`);

    if (this.failedRoutes.length > 0) {
      console.error('\n❌ FAILED ROUTES:');
      this.failedRoutes.forEach(r => {
        console.error(`  - ${r.route}: ${r.reason}`);
      });
    }

    if (this.duplicateRoutes.length > 0) {
      console.error('\n⚠️  DUPLICATE ROUTES:');
      this.duplicateRoutes.forEach(r => {
        console.error(`  - ${r.route}`);
      });
    }

    // Group by prefix
    const routesByPrefix = this.groupRoutesByPrefix();
    console.log('\n📋 ROUTES BY PREFIX:');
    for (const [prefix, routes] of Object.entries(routesByPrefix)) {
      console.log(`  ${prefix}: ${routes.length} routes`);
    }

    console.log('===========================================\n');

    return {
      total: this.registeredRoutes.size,
      failed: this.failedRoutes,
      duplicates: this.duplicateRoutes,
      byPrefix: routesByPrefix
    };
  }

  groupRoutesByPrefix() {
    const grouped = {};
    for (const [key, route] of this.registeredRoutes) {
      const prefix = route.path.split('/').slice(0, 3).join('/') || '/';
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(route);
    }
    return grouped;
  }

  getReport() {
    return {
      registered: Array.from(this.registeredRoutes.values()),
      failed: this.failedRoutes,
      duplicates: this.duplicateRoutes
    };
  }
}

export 