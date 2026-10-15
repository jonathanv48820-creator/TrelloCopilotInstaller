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

export function registerCardTools(server) {

  // ==================================================
  // 9. GET CARD
  // ==================================================

  server.registerTool(
    "get-card",
    {
      description:
        "Get detailed information about a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const found = await findOrderCard(orderNumber);

        const card = await trelloRequest(
          `/cards/${found.id}` +
          `?fields=name,desc,url,idBoard,idList,closed,due,dueComplete,dateLastActivity`
        );

        const [board, list] = await Promise.all([
          trelloRequest(
            `/boards/${card.idBoard}?fields=name`
          ),

          trelloRequest(
            `/lists/${card.idList}?fields=name`
          )
        ]);

        return {
          content: [
            {
              type: "text",
              text:
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Board: ${board.name}\n` +
                `List: ${list.name}\n` +
                `Archived: ${card.closed ? "Yes" : "No"}\n` +
                `Due Date: ${card.due || "None"}\n` +
                `Due Complete: ${card.dueComplete ? "Yes" : "No"}\n` +
                `Last Activity: ${card.dateLastActivity || "Unknown"}\n\n` +
                `Description:\n${card.desc || "No description"}\n\n` +
                `URL: ${card.url}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 10. GET CARD DESCRIPTION
  // ==================================================

  server.registerTool(
    "get-card-description",
    {
      description:
        "Read the description of a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const found = await findOrderCard(orderNumber);

        const card = await trelloRequest(
          `/cards/${found.id}?fields=name,desc,url`
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n\n` +
                `Description:\n` +
                `${card.desc || "No description"}\n\n` +
                `URL: ${card.url}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 11. UPDATE CARD DESCRIPTION
  // ==================================================

  server.registerTool(
    "update-card-description",
    {
      description:
        "Replace the description of a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string(),

        description: z
          .string()
          .describe("The new Trello card description")
      })
    },

    async ({ orderNumber, description }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive the order before changing its description.`
          );
        }

        const updated = await trelloRequest(
          `/cards/${card.id}` +
          `?desc=${encodeURIComponent(description)}`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Description updated successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${updated.name}\n\n` +
                `New Description:\n${updated.desc}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}