// After Luna instance is created and initialized
if (luna) {
  (global as any).luna = luna;
  logger.info('🌙 Luna instance exposed globally for CLI access');
  logger.info('💻 Try: luna.cli.status(), luna.cli.help()');
}
