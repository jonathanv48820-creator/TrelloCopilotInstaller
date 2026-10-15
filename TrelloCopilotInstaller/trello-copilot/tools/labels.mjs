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

async function getBoardLabels(boardId) {
  return trelloRequest(
    `/boards/${boardId}/labels?limit=1000&fields=name,color`
  );
}

async function findBoardLabel(boardId, labelName) {
  const labels = await getBoardLabels(boardId);

  const matches = labels.filter(
    (label) =>
      (label.name || "").trim().toLowerCase() ===
      labelName.trim().toLowerCase()
  );

  if (matches.length === 0) {
    const availableLabels = labels
      .filter((label) => label.name)
      .map(
        (label) =>
          `${label.name}${label.color ? ` (${label.color})` : ""}`
      )
      .join(", ");

    throw new Error(
      `Label "${labelName}" was not found on this board.` +
      (availableLabels
        ? ` Available labels: ${availableLabels}`
        : "")
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `More than one label named "${labelName}" was found. ` +
      `No changes were made.`
    );
  }

  return matches[0];
}

export function registerLabelTools(server) {

  // ==================================================
  // 14. GET LABELS
  // ==================================================

  server.registerTool(
    "get-labels",
    {
      description:
        "Show all labels currently assigned to a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const found = await findOrderCard(orderNumber);

        const card = await trelloRequest(
          `/cards/${found.id}?fields=name,url&labels=all`
        );

        const labels = card.labels || [];

        if (labels.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order: ${orderNumber}\n` +
                  `Card: ${card.name}\n\n` +
                  `No labels are currently assigned.`
              }
            ]
          };
        }

        const lines = labels.map(
          (label, index) => {
            const name =
              label.name && label.name.trim()
                ? label.name
                : "(Unnamed label)";

            return (
              `${index + 1}. ${name}` +
              `${label.color ? ` [${label.color}]` : ""}`
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
                `LABELS\n\n` +
                lines.join("\n")
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ==================================================
  // 15. ADD LABEL
  // ==================================================

  server.registerTool(
    "add-label",
    {
      description:
        "Add an existing board label to a Trello order card by label name.",

      inputSchema: z.object({
        orderNumber: z.string(),

        labelName: z
          .string()
          .min(1)
          .describe(
            "The existing Trello label name, such as RUSH or HOLD"
          )
      })
    },

    async ({ orderNumber, labelName }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive it before adding a label.`
          );
        }

        const label = await findBoardLabel(
          card.idBoard,
          labelName
        );

        const currentCard = await trelloRequest(
          `/cards/${card.id}?fields=name,url&labels=all`
        );

        const alreadyAssigned =
          (currentCard.labels || []).some(
            (existing) => existing.id === label.id
          );

        if (alreadyAssigned) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order ${orderNumber} already has the ` +
                  `"${label.name}" label.`
              }
            ]
          };
        }

        await trelloRequest(
          `/cards/${card.id}/idLabels` +
          `?value=${encodeURIComponent(label.id)}`,
          {
            method: "POST"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Label added successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Label: ${label.name}\n` +
                `Color: ${label.color || "None"}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ==================================================
  // 16. REMOVE LABEL
  // ==================================================

  server.registerTool(
    "remove-label",
    {
      description:
        "Remove an existing label from a Trello order card by label name.",

      inputSchema: z.object({
        orderNumber: z.string(),

        labelName: z
          .string()
          .min(1)
          .describe(
            "The Trello label name to remove"
          )
      })
    },

    async ({ orderNumber, labelName }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive it before removing a label.`
          );
        }

        const currentCard = await trelloRequest(
          `/cards/${card.id}?fields=name,url&labels=all`
        );

        const matches =
          (currentCard.labels || []).filter(
            (label) =>
              (label.name || "").trim().toLowerCase() ===
              labelName.trim().toLowerCase()
          );

        if (matches.length === 0) {
          throw new Error(
            `Order ${orderNumber} does not have a label ` +
            `named "${labelName}".`
          );
        }

        if (matches.length > 1) {
          throw new Error(
            `More than one assigned label named ` +
            `"${labelName}" was found. No label was removed.`
          );
        }

        const label = matches[0];

        await trelloRequest(
          `/cards/${card.id}/idLabels/${label.id}`,
          {
            method: "DELETE"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Label removed successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Removed Label: ${label.name}\n` +
                `Color: ${label.color || "None"}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}