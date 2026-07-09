"use strict";

const plugin = {
  activate(ctx) {
    ctx.logger.info("骰子与随机数插件已激活");
  },

  deactivate() {},

  onMessage(message) {
    if (message && message.type === "ping") {
      return { ok: true };
    }
    return null;
  }
};

exports.default = plugin;
module.exports = plugin;
