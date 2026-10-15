import * as z from "zod/v4";

import {
  trelloRequest,
  findOrderCard
} from "../trello-api.mjs";

function errorResult(error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text:
          error instanceof Error
            ? error.message
            : String(error)
      }
    ]
  };
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return "Unknown size";
  }

  const value = Number(bytes);

  if (Number.isNaN(value)) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} bytes`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function registerAttachmentTools(server) {

  // ==================================================
  // 21. GET ATTACHMENTS
  // ==================================================

  server.registerTool(
    "get-attachments",
    {
      description:
        "Show all attachments on a Trello order card, including attachment names, file types, sizes, dates, and URLs.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        const attachments = await trelloRequest(
          `/cards/${card.id}/attachments` +
          `?fields=name,url,mimeType,bytes,date,isUpload`
        );

        if (!attachments || attachments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order: ${orderNumber}\n` +
                  `Card: ${card.name}\n\n` +
                  `No attachments found.`
              }
            ]
          };
        }

        const lines = attachments.map(
          (attachment, index) => {
            const name =
              attachment.name || "(Unnamed attachment)";

            const type =
              attachment.mimeType || "Unknown";

            const size =
              formatBytes(attachment.bytes);

            const date =
              attachment.date || "Unknown";

            const source =
              attachment.isUpload
                ? "Uploaded file"
                : "Linked attachment";

            return (
              `${index + 1}. ${name}\n` +
              `Type: ${type}\n` +
              `Size: ${size}\n` +
              `Source: ${source}\n` +
              `Date: ${date}\n` +
              `URL: ${attachment.url}`
            );
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n\n` +
                `ATTACHMENTS\n\n` +
                lines.join("\n\n") +
                `\n\nTotal Attachments: ${attachments.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}