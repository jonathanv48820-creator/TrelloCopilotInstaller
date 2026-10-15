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

export function registerCommentTools(server) {

  // ==================================================
  // 12. GET COMMENTS
  // ==================================================

  server.registerTool(
    "get-comments",
    {
      description:
        "Get comments from a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        const comments = await trelloRequest(
          `/cards/${card.id}/actions` +
          `?filter=commentCard` +
          `&fields=data,date` +
          `&memberCreator=true` +
          `&memberCreator_fields=fullName,username` +
          `&limit=1000`
        );

        if (!comments || comments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order: ${orderNumber}\n` +
                  `Card: ${card.name}\n\n` +
                  `No comments found.`
              }
            ]
          };
        }

        const lines = comments.map(
          (comment, index) => {
            const author =
              comment.memberCreator?.fullName ||
              comment.memberCreator?.username ||
              "Unknown";

            const text =
              comment.data?.text || "(No text)";

            const date =
              comment.date || "Unknown date";

            return (
              `${index + 1}. ${author}\n` +
              `Date: ${date}\n` +
              `${text}`
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
                `COMMENTS\n\n` +
                lines.join("\n\n") +
                `\n\nTotal Comments: ${comments.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ==================================================
  // 13. ADD COMMENT
  // ==================================================

  server.registerTool(
    "add-comment",
    {
      description:
        "Add a comment to a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string(),

        comment: z
          .string()
          .min(1)
          .describe("The comment to add to the Trello card")
      })
    },

    async ({ orderNumber, comment }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive it before adding a comment.`
          );
        }

        const result = await trelloRequest(
          `/cards/${card.id}/actions/comments` +
          `?text=${encodeURIComponent(comment)}`,
          {
            method: "POST"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Comment added successfully.\n\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n\n` +
                `Comment:\n${comment}\n\n` +
                `Comment ID: ${result.id || "Unknown"}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}