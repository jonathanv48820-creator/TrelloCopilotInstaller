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

function getOptionName(field, optionId) {
  const option = (field.options || []).find(
    (item) => item.id === optionId
  );

  return option?.value?.text || optionId || "(No value)";
}

function formatFieldValue(field, item) {
  if (!item) {
    return "(Empty)";
  }

  if (field.type === "list") {
    return getOptionName(field, item.idValue);
  }

  if (!item.value) {
    return "(Empty)";
  }

  switch (field.type) {
    case "text":
      return item.value.text ?? "(Empty)";

    case "number":
      return item.value.number ?? "(Empty)";

    case "date":
      return item.value.date ?? "(Empty)";

    case "checkbox":
      return item.value.checked === "true" ||
        item.value.checked === true
        ? "Yes"
        : "No";

    default:
      return JSON.stringify(item.value);
  }
}

async function getBoardCustomFields(boardId) {
  return trelloRequest(
    `/boards/${boardId}/customFields`
  );
}

async function findCustomField(boardId, fieldName) {
  const fields = await getBoardCustomFields(boardId);

  const matches = fields.filter(
    (field) =>
      field.name.trim().toLowerCase() ===
      fieldName.trim().toLowerCase()
  );

  if (matches.length === 0) {
    const available = fields
      .map((field) => `${field.name} (${field.type})`)
      .join(", ");

    throw new Error(
      `Custom field "${fieldName}" was not found.` +
      (available
        ? ` Available custom fields: ${available}`
        : " This board does not have any custom fields.")
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `More than one custom field named "${fieldName}" was found.`
    );
  }

  return matches[0];
}

export function registerCustomFieldTools(server) {

  // ==================================================
  // 22. GET CUSTOM FIELDS
  // ==================================================

  server.registerTool(
    "get-custom-fields",
    {
      description:
        "Show all custom fields available on the board containing a Trello order.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        const board = await trelloRequest(
          `/boards/${card.idBoard}?fields=name`
        );

        const fields = await getBoardCustomFields(
          card.idBoard
        );

        if (!fields || fields.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Board: ${board.name}\n\n` +
                  `No custom fields were found.`
              }
            ]
          };
        }

        const lines = fields.map(
          (field, index) => {
            let output =
              `${index + 1}. ${field.name}\n` +
              `Type: ${field.type}`;

            if (
              field.type === "list" &&
              field.options?.length
            ) {
              const options = field.options
                .map(
                  (option) =>
                    option.value?.text || "(Unnamed)"
                )
                .join(", ");

              output += `\nOptions: ${options}`;
            }

            return output;
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Board: ${board.name}\n\n` +
                `CUSTOM FIELDS\n\n` +
                lines.join("\n\n") +
                `\n\nTotal: ${fields.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ==================================================
  // 23. GET CUSTOM FIELD VALUES
  // ==================================================

  server.registerTool(
    "get-custom-field-values",
    {
      description:
        "Show all custom field values for a Trello order card.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card = await findOrderCard(orderNumber);

        const [fields, items] = await Promise.all([
          getBoardCustomFields(card.idBoard),

          trelloRequest(
            `/cards/${card.id}/customFieldItems`
          )
        ]);

        if (!fields || fields.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order: ${orderNumber}\n` +
                  `Card: ${card.name}\n\n` +
                  `No custom fields are configured on this board.`
              }
            ]
          };
        }

        const lines = fields.map((field) => {
          const item = (items || []).find(
            (value) =>
              value.idCustomField === field.id
          );

          return (
            `${field.name}: ` +
            `${formatFieldValue(field, item)}`
          );
        });

        return {
          content: [
            {
              type: "text",
              text:
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n\n` +
                `CUSTOM FIELD VALUES\n\n` +
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
  // 24. UPDATE CUSTOM FIELD
  // ==================================================

  server.registerTool(
    "update-custom-field",
    {
      description:
        "Update a custom field on a Trello order. Supports text, number, date, checkbox, and dropdown fields.",

      inputSchema: z.object({
        orderNumber: z.string(),

        fieldName: z
          .string()
          .min(1)
          .describe("The exact custom field name"),

        value: z
          .string()
          .describe(
            "The new value. For checkboxes use true/false or yes/no. For dropdowns use the option name."
          )
      })
    },

    async ({
      orderNumber,
      fieldName,
      value
    }) => {
      try {
        const card = await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived. ` +
            `Unarchive it before updating a custom field.`
          );
        }

        const field = await findCustomField(
          card.idBoard,
          fieldName
        );

        let body;

        switch (field.type) {

          // --------------------------------------------
          // TEXT
          // --------------------------------------------

          case "text":
            body = {
              value: {
                text: value
              }
            };
            break;

          // --------------------------------------------
          // NUMBER
          // --------------------------------------------

          case "number": {
            const number = Number(value);

            if (!Number.isFinite(number)) {
              throw new Error(
                `"${value}" is not a valid number.`
              );
            }

            body = {
              value: {
                number: String(number)
              }
            };

            break;
          }

          // --------------------------------------------
          // DATE
          // --------------------------------------------

          case "date": {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
              throw new Error(
                `"${value}" is not a valid date.`
              );
            }

            body = {
              value: {
                date: date.toISOString()
              }
            };

            break;
          }

          // --------------------------------------------
          // CHECKBOX
          // --------------------------------------------

          case "checkbox": {
            const normalized =
              value.trim().toLowerCase();

            let checked;

            if (
              normalized === "true" ||
              normalized === "yes" ||
              normalized === "1" ||
              normalized === "checked"
            ) {
              checked = "true";
            } else if (
              normalized === "false" ||
              normalized === "no" ||
              normalized === "0" ||
              normalized === "unchecked"
            ) {
              checked = "false";
            } else {
              throw new Error(
                `Checkbox value must be true/false or yes/no.`
              );
            }

            body = {
              value: {
                checked
              }
            };

            break;
          }

          // --------------------------------------------
          // DROPDOWN / LIST
          // --------------------------------------------

          case "list": {
            const optionMatches =
              (field.options || []).filter(
                (option) =>
                  (option.value?.text || "")
                    .trim()
                    .toLowerCase() ===
                  value.trim().toLowerCase()
              );

            if (optionMatches.length === 0) {
              const availableOptions =
                (field.options || [])
                  .map(
                    (option) =>
                      option.value?.text
                  )
                  .filter(Boolean)
                  .join(", ");

              throw new Error(
                `Dropdown option "${value}" was not found.` +
                (availableOptions
                  ? ` Available options: ${availableOptions}`
                  : "")
              );
            }

            if (optionMatches.length > 1) {
              throw new Error(
                `More than one dropdown option named "${value}" was found.`
              );
            }

            body = {
              idValue: optionMatches[0].id
            };

            break;
          }

          default:
            throw new Error(
              `Unsupported custom field type: ${field.type}`
            );
        }

        await trelloRequest(
          `/cards/${card.id}` +
          `/customField/${field.id}/item`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Custom field updated successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${card.name}\n` +
                `Field: ${field.name}\n` +
                `Type: ${field.type}\n` +
                `New Value: ${value}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}