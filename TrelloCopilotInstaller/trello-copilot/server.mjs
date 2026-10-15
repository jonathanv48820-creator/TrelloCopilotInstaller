import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { registerOrderTools } from "./tools/orders.mjs";
import { registerCardTools } from "./tools/cards.mjs";
import { registerCommentTools } from "./tools/comments.mjs";
import { registerLabelTools } from "./tools/labels.mjs";
import { registerDateTools } from "./tools/dates.mjs";
import { registerAttachmentTools } from "./tools/attachments.mjs";
import { registerCustomFieldTools } from "./tools/customfields.mjs";

serveStdio(() => {
  const server = new McpServer({
    name: "trello-copilot",
    version: "1.0.0"
  });

  registerOrderTools(server);
  registerCardTools(server);
  registerCommentTools(server);
  registerLabelTools(server);
  registerDateTools(server);
  registerAttachmentTools(server);
  registerCustomFieldTools(server);

  return server;
});