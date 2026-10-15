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

function formatDueDate(dateValue) {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(dateValue);

  return date.toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function registerDateTools(server) {

  // ==================================================
  // 17. GET DUE DATE
  // ==================================================

  server.registerTool(
    "get-due-date",
    {
      description:
        "Get the due date and due-date completion status of a Trello order.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const found = await findOrderCard(orderNumber);

        const card = await trelloRequest(
          `/cards/${found.id}?fields=name,url,due,dueComplete`
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Due Date: ${formatDueDate(card.due)}\n` +
                `Due Complete: ${card.dueComplete ? "Yes" : "No"}\n` +
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
  // 18. SET DUE DATE
  // ==================================================

  server.registerTool(
    "set-due-date",
    {
      description:
        "Set or change the due date of a Trello order. The dueDate input must be a valid ISO date/time.",

      inputSchema: z.object({
        orderNumber: z.string(),

        dueDate: z
          .string()
          .describe(
            "Due date in ISO 8601 format, for example 2026-09-25T16:00:00-07:00"
          )
      })
    },

    async ({ orderNumber, dueDate }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive it before setting a due date.`
          );
        }

        const parsedDate = new Date(dueDate);

        if (Number.isNaN(parsedDate.getTime())) {
          throw new Error(
            `"${dueDate}" is not a valid date.`
          );
        }

        const isoDate = parsedDate.toISOString();

        const updated = await trelloRequest(
          `/cards/${card.id}` +
          `?due=${encodeURIComponent(isoDate)}` +
          `&dueComplete=false`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Due date updated successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Due Date: ${formatDueDate(updated.due)}\n` +
                `Due Complete: No`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 19. COMPLETE DUE DATE
  // ==================================================

  server.registerTool(
    "complete-due-date",
    {
      description:
        "Mark the due date on a Trello order as complete.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived.`
          );
        }

        const current = await trelloRequest(
          `/cards/${card.id}?fields=name,due,dueComplete`
        );

        if (!current.due) {
          throw new Error(
            `Order ${orderNumber} does not have a due date.`
          );
        }

        if (current.dueComplete) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order ${orderNumber}'s due date is already marked complete.`
              }
            ]
          };
        }

        await trelloRequest(
          `/cards/${card.id}?dueComplete=true`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Due date marked complete successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Due Date: ${formatDueDate(current.due)}\n` +
                `Due Complete: Yes`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 20. CLEAR DUE DATE
  // ==================================================

  server.registerTool(
    "clear-due-date",
    {
      description:
        "Remove the due date from a Trello order.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived.`
          );
        }

        const current = await trelloRequest(
          `/cards/${card.id}?fields=name,due`
        );

        if (!current.due) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order ${orderNumber} does not currently have a due date.`
              }
            ]
          };
        }

        const oldDueDate = formatDueDate(current.due);

        await trelloRequest(
          `/cards/${card.id}?due=null&dueComplete=false`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Due date removed successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Previous Due Date: ${oldDueDate}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}