import * as z from "zod/v4";
import fs from "node:fs/promises";

import {
  trelloRequest,
  findOrderCard,
  findList,
  getBoardLists
} from "../trello-api.mjs";

const ARCHIVE_FILE = new URL(
  "../archive-history.json",
  import.meta.url
);

async function readArchiveHistory() {
  try {
    const data = await fs.readFile(ARCHIVE_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeArchiveHistory(history) {
  await fs.writeFile(
    ARCHIVE_FILE,
    JSON.stringify(history, null, 2),
    "utf8"
  );
}

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

export function registerOrderTools(server) {

  // ==================================================
  // 1. FIND ORDER
  // ==================================================

  server.registerTool(
    "find-order",
    {
      description:
        "Find a Trello order by order number and show its card, board, list, archive status, and URL.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card =
          await findOrderCard(orderNumber);

        const [board, list] =
          await Promise.all([
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
  // 2. MOVE ORDER
  // ==================================================

  server.registerTool(
    "move-order",
    {
      description:
        "Move an order card to another list on the same Trello board.",

      inputSchema: z.object({
        orderNumber: z.string(),
        destinationList: z.string()
      })
    },

    async ({
      orderNumber,
      destinationList
    }) => {

      try {
        const card =
          await findOrderCard(orderNumber);

        if (card.closed) {
          throw new Error(
            `Order ${orderNumber} is archived and cannot be moved.`
          );
        }

        const currentList =
          await trelloRequest(
            `/lists/${card.idList}?fields=name`
          );

        const destination =
          await findList(
            card.idBoard,
            destinationList
          );

        if (
          destination.id ===
          card.idList
        ) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order ${orderNumber} is already in ` +
                  `${destination.name}.`
              }
            ]
          };
        }

        await trelloRequest(
          `/cards/${card.id}` +
          `?idList=${encodeURIComponent(destination.id)}`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order ${orderNumber} moved successfully.\n` +
                `Card: ${card.name}\n` +
                `From: ${currentList.name}\n` +
                `To: ${destination.name}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 3. ARCHIVE ORDER
  // ==================================================

  server.registerTool(
    "archive-order",
    {
      description:
        "Archive an order and remember its current list so it can be restored later.",

      inputSchema: z.object({
        orderNumber: z.string()
      })
    },

    async ({ orderNumber }) => {
      try {
        const card =
          await findOrderCard(orderNumber);

        if (card.closed) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Order ${orderNumber} is already archived.`
              }
            ]
          };
        }

        const [board, list] =
          await Promise.all([
            trelloRequest(
              `/boards/${card.idBoard}?fields=name`
            ),

            trelloRequest(
              `/lists/${card.idList}?fields=name`
            )
          ]);

        const history =
          await readArchiveHistory();

        history[orderNumber] = {
          cardId: card.id,
          cardName: card.name,
          boardId: card.idBoard,
          boardName: board.name,
          listId: card.idList,
          listName: list.name,
          archivedAt:
            new Date().toISOString()
        };

        await writeArchiveHistory(
          history
        );

        await trelloRequest(
          `/cards/${card.id}?closed=true`,
          {
            method: "PUT"
          }
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order ${orderNumber} archived successfully.\n` +
                `Card: ${card.name}\n` +
                `Previous List: ${list.name}\n` +
                `Original location saved.`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 4. UNARCHIVE ORDER
  // ==================================================

  server.registerTool(
    "unarchive-order",
    {
      description:
        "Restore an archived order to its previous list or another specified list.",

      inputSchema: z.object({
        orderNumber: z.string(),
        destinationList:
          z.string().optional()
      })
    },

    async ({
      orderNumber,
      destinationList
    }) => {

      try {
        const history =
          await readArchiveHistory();

        const saved =
          history[orderNumber];

        if (!saved) {
          throw new Error(
            `No archive history found for order ${orderNumber}.`
          );
        }

        let targetListId =
          saved.listId;

        let targetListName =
          saved.listName;

        if (destinationList) {

          const target =
            await findList(
              saved.boardId,
              destinationList
            );

          targetListId =
            target.id;

          targetListName =
            target.name;

        } else {

          const original =
            await trelloRequest(
              `/lists/${saved.listId}?fields=name,closed`
            );

          if (original.closed) {
            throw new Error(
              `Original list "${saved.listName}" is archived. ` +
              `Specify another destination list.`
            );
          }
        }

        await trelloRequest(
          `/cards/${saved.cardId}` +
          `?closed=false` +
          `&idList=${encodeURIComponent(targetListId)}`,
          {
            method: "PUT"
          }
        );

        delete history[orderNumber];

        await writeArchiveHistory(
          history
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Order ${orderNumber} restored successfully.\n` +
                `Card: ${saved.cardName}\n` +
                `Restored To: ${targetListName}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 5. LIST ORDERS
  // ==================================================

  server.registerTool(
    "list-orders",
    {
      description:
        "Show all active Trello cards in a specified list on a specified board.",

      inputSchema: z.object({
        boardName: z.string(),
        listName: z.string()
      })
    },

    async ({
      boardName,
      listName
    }) => {

      try {
        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const boardMatches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (
          boardMatches.length !== 1
        ) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          boardMatches[0];

        const list =
          await findList(
            board.id,
            listName
          );

        const cards =
          await trelloRequest(
            `/lists/${list.id}/cards` +
            `?filter=open&fields=name,url`
          );

        if (!cards.length) {
          return {
            content: [
              {
                type: "text",
                text:
                  `${board.name} / ${list.name}\n` +
                  `No active cards found.`
              }
            ]
          };
        }

        const cardLines =
          cards.map(
            (card, index) =>
              `${index + 1}. ${card.name}\n${card.url}`
          );

        return {
          content: [
            {
              type: "text",
              text:
                `${board.name} / ${list.name}\n\n` +
                `${cardLines.join("\n\n")}\n\n` +
                `Total: ${cards.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 6. CREATE ORDER
  // ==================================================

  server.registerTool(
    "create-order",
    {
      description:
        "Create a new Trello order card in a specified board and list.",

      inputSchema: z.object({
        orderNumber: z.string(),
        name: z.string(),
        boardName: z.string(),
        listName: z.string()
      })
    },

    async ({
      orderNumber,
      name,
      boardName,
      listName
    }) => {

      try {
        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const boardMatches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (
          boardMatches.length !== 1
        ) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          boardMatches[0];

        const list =
          await findList(
            board.id,
            listName
          );

        // Make sure the order does not already exist.
        try {
          const existing =
            await findOrderCard(
              orderNumber
            );

          if (existing) {
            throw new Error(
              `Order ${orderNumber} already exists as "${existing.name}".`
            );
          }

        } catch (error) {

          if (
            error instanceof Error &&
            !error.message.startsWith(
              "No Trello card found"
            )
          ) {
            throw error;
          }
        }

        const cardName =
          `${orderNumber} / ${name}`.trim();

        const newCard =
          await trelloRequest(
            `/cards` +
            `?idList=${encodeURIComponent(list.id)}` +
            `&name=${encodeURIComponent(cardName)}`,
            {
              method: "POST"
            }
          );

        return {
          content: [
            {
              type: "text",
              text:
                `Order created successfully.\n` +
                `Order: ${orderNumber}\n` +
                `Card: ${newCard.name}\n` +
                `Board: ${board.name}\n` +
                `List: ${list.name}\n` +
                `URL: ${newCard.url}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 7. RENAME ORDER
  // ==================================================

  server.registerTool(
    "rename-order",
    {
      description:
        "Rename an order card while keeping the order number at the beginning of the card name.",

      inputSchema: z.object({
        orderNumber: z.string(),
        newName: z.string()
      })
    },

    async ({
      orderNumber,
      newName
    }) => {

      try {
        const card =
          await findOrderCard(
            orderNumber
          );

        const updatedName =
          `${orderNumber} / ${newName}`.trim();

        const updated =
          await trelloRequest(
            `/cards/${card.id}` +
            `?name=${encodeURIComponent(updatedName)}`,
            {
              method: "PUT"
            }
          );

        return {
          content: [
            {
              type: "text",
              text:
                `Order renamed successfully.\n` +
                `Old Name: ${card.name}\n` +
                `New Name: ${updated.name}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 8. LIST LISTS
  // ==================================================

  server.registerTool(
    "list-lists",
    {
      description:
        "Show all active lists on a Trello board.",

      inputSchema: z.object({
        boardName: z.string()
      })
    },

    async ({ boardName }) => {
      try {
        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const matches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (matches.length !== 1) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          matches[0];

        const lists =
          await getBoardLists(
            board.id
          );

        const lines =
          lists.map(
            (list, index) =>
              `${index + 1}. ${list.name}`
          );

        return {
          content: [
            {
              type: "text",
              text:
                `Board: ${board.name}\n\n` +
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
  // 9. LIST ARCHIVED ORDERS
  // ==================================================

  server.registerTool(
    "list-archived-orders",
    {
      description:
        "Show all archived Trello order cards on a specified board.",

      inputSchema: z.object({
        boardName: z.string()
      })
    },

    async ({ boardName }) => {
      try {
        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const matches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (matches.length !== 1) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          matches[0];

        const cards =
          await trelloRequest(
            `/boards/${board.id}/cards` +
            `?filter=closed` +
            `&fields=name,url,idList,closed`
          );

        if (!cards.length) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Board: ${board.name}\n\n` +
                  `No archived orders found.`
              }
            ]
          };
        }

        const lists =
          await trelloRequest(
            `/boards/${board.id}/lists` +
            `?filter=all&fields=name,closed`
          );

        const listMap =
          new Map(
            lists.map(
              (list) => [
                list.id,
                list.name
              ]
            )
          );

        const cardLines =
          cards.map(
            (card, index) => {

              const listName =
                listMap.get(
                  card.idList
                ) ||
                "Unknown List";

              return (
                `${index + 1}. ${card.name}\n` +
                `Previous/Current List: ${listName}\n` +
                `${card.url}`
              );
            }
          );

        return {
          content: [
            {
              type: "text",
              text:
                `ARCHIVED ORDERS\n` +
                `Board: ${board.name}\n\n` +
                `${cardLines.join("\n\n")}\n\n` +
                `Total Archived: ${cards.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 10. ARCHIVED ORDERS BY DATE
  // ==================================================

  server.registerTool(
    "archived-orders-by-date",
    {
      description:
        "Show Trello orders archived on a specific calendar date using Arizona time.",

      inputSchema: z.object({
        boardName: z.string(),

        date: z
          .string()
          .describe(
            "Date in YYYY-MM-DD format, for example 2026-09-21."
          )
      })
    },

    async ({
      boardName,
      date
    }) => {

      try {
        const dateMatch =
          /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            date.trim()
          );

        if (!dateMatch) {
          throw new Error(
            "Date must be in YYYY-MM-DD format."
          );
        }

        const [
          ,
          year,
          month,
          day
        ] = dateMatch;

        // Arizona remains UTC-7.
        const since =
          `${year}-${month}-${day}T07:00:00.000Z`;

        const nextDate =
          new Date(
            Date.UTC(
              Number(year),
              Number(month) - 1,
              Number(day) + 1
            )
          );

        const nextYear =
          nextDate.getUTCFullYear();

        const nextMonth =
          String(
            nextDate.getUTCMonth() + 1
          ).padStart(2, "0");

        const nextDay =
          String(
            nextDate.getUTCDate()
          ).padStart(2, "0");

        const before =
          `${nextYear}-${nextMonth}-${nextDay}` +
          `T07:00:00.000Z`;

        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const matches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (matches.length !== 1) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          matches[0];

        const actions =
          await trelloRequest(
            `/boards/${board.id}/actions` +
            `?filter=updateCard:closed` +
            `&since=${encodeURIComponent(since)}` +
            `&before=${encodeURIComponent(before)}` +
            `&limit=1000`
          );

        const archivedActions =
          actions.filter(
            (action) =>
              action.type ===
                "updateCard" &&
              action.data?.old?.closed ===
                false &&
              action.data?.card?.closed ===
                true
          );

        if (
          !archivedActions.length
        ) {
          return {
            content: [
              {
                type: "text",
                text:
                  `ARCHIVED ORDERS BY DATE\n` +
                  `Board: ${board.name}\n` +
                  `Date: ${date}\n\n` +
                  `No orders were archived on this date.`
              }
            ]
          };
        }

        const uniqueActions = [];
        const seenCards = new Set();

        for (
          const action of
          archivedActions
        ) {
          const cardId =
            action.data?.card?.id;

          if (
            !cardId ||
            seenCards.has(cardId)
          ) {
            continue;
          }

          seenCards.add(cardId);
          uniqueActions.push(action);
        }

        uniqueActions.sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        );

        const timeFormatter =
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone:
                "America/Phoenix",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            }
          );

        const lines =
          uniqueActions.map(
            (action, index) => {

              const card =
                action.data.card;

              const archivedTime =
                timeFormatter.format(
                  new Date(action.date)
                );

              return (
                `${index + 1}. ${card.name}\n` +
                `Archived: ${archivedTime}`
              );
            }
          );

        return {
          content: [
            {
              type: "text",
              text:
                `ARCHIVED ORDERS BY DATE\n` +
                `Board: ${board.name}\n` +
                `Date: ${date}\n` +
                `Timezone: Arizona\n\n` +
                `${lines.join("\n\n")}\n\n` +
                `Total Archived: ${uniqueActions.length}`
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );


  // ==================================================
  // 11. DAILY PRODUCTION REPORT
  // ==================================================

  server.registerTool(
    "daily-production-report",
    {
      description:
        "Generate a daily Trello production report showing active orders by list, due today, overdue, RUSH orders, hidden cards in archived lists, and orders completed/archived today.",

      inputSchema: z.object({
        boardName: z
          .string()
          .default(
            "Trigard Memorials"
          )
      })
    },

    async ({ boardName }) => {
      try {

        // ------------------------------------------
        // FIND BOARD
        // ------------------------------------------

        const boards =
          await trelloRequest(
            `/members/me/boards?filter=open&fields=name`
          );

        const boardMatches =
          boards.filter(
            (board) =>
              board.name
                .trim()
                .toLowerCase() ===
              boardName
                .trim()
                .toLowerCase()
          );

        if (
          boardMatches.length !== 1
        ) {
          throw new Error(
            `Could not uniquely find board "${boardName}".`
          );
        }

        const board =
          boardMatches[0];


        // ------------------------------------------
        // GET OPEN LISTS
        // ------------------------------------------

        const lists =
          await trelloRequest(
            `/boards/${board.id}/lists` +
            `?filter=open&fields=name`
          );

        const listMap =
          new Map(
            lists.map(
              (list) => [
                list.id,
                list.name
              ]
            )
          );

        const openListIds =
          new Set(
            lists.map(
              (list) =>
                list.id
            )
          );


        // ------------------------------------------
        // GET CARDS TRELL0 CONSIDERS OPEN
        // ------------------------------------------

        const cards =
          await trelloRequest(
            `/boards/${board.id}/cards` +
            `?filter=open` +
            `&fields=name,url,idList,due,dueComplete,labels,closed`
          );


        // ------------------------------------------
        // TRUE ACTIVE CARDS
        //
        // Trello can return card.closed=false cards
        // whose parent lists are archived.
        // Exclude those cards from active production.
        // ------------------------------------------

        const activeCards =
          cards.filter(
            (card) =>
              openListIds.has(
                card.idList
              )
          );

        const hiddenArchivedListCards =
          cards.filter(
            (card) =>
              !openListIds.has(
                card.idList
              )
          );


        // ------------------------------------------
        // COUNTS BY LIST
        // ------------------------------------------

        const listCounts =
          new Map();

        for (const list of lists) {
          listCounts.set(
            list.id,
            0
          );
        }

        for (
          const card of activeCards
        ) {
          const current =
            listCounts.get(
              card.idList
            ) || 0;

          listCounts.set(
            card.idList,
            current + 1
          );
        }

        const listLines =
          lists.map(
            (list) =>
              `${list.name}: ` +
              `${listCounts.get(list.id) || 0}`
          );


        // ------------------------------------------
        // ARIZONA DATE
        // ------------------------------------------

        const now =
          new Date();

        const arizonaDateParts =
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone:
                "America/Phoenix",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            }
          ).formatToParts(now);

        const dateParts = {};

        for (
          const part of
          arizonaDateParts
        ) {
          if (
            part.type !== "literal"
          ) {
            dateParts[part.type] =
              part.value;
          }
        }

        const today =
          `${dateParts.year}-` +
          `${dateParts.month}-` +
          `${dateParts.day}`;

        // Arizona is UTC-7 year-round.
        const todayStart =
          new Date(
            `${today}T07:00:00.000Z`
          );

        const tomorrowStart =
          new Date(
            todayStart.getTime() +
            24 * 60 * 60 * 1000
          );


        // ------------------------------------------
        // DUE TODAY / OVERDUE
        // ------------------------------------------

        const dueToday = [];
        const overdue = [];

        for (
          const card of activeCards
        ) {

          if (
            !card.due ||
            card.dueComplete
          ) {
            continue;
          }

          const dueDate =
            new Date(card.due);

          if (
            dueDate >= todayStart &&
            dueDate < tomorrowStart
          ) {
            dueToday.push(card);
          }

          if (
            dueDate < now
          ) {
            overdue.push(card);
          }
        }


        // ------------------------------------------
        // RUSH ORDERS
        // ------------------------------------------

        const rushCards =
          activeCards.filter(
            (card) =>
              (card.labels || []).some(
                (label) =>
                  label.name
                    ?.trim()
                    .toLowerCase() ===
                  "rush"
              )
          );


        // ------------------------------------------
        // COMPLETED / ARCHIVED TODAY
        // ------------------------------------------

        const actions =
          await trelloRequest(
            `/boards/${board.id}/actions` +
            `?filter=updateCard:closed` +
            `&since=${encodeURIComponent(
              todayStart.toISOString()
            )}` +
            `&before=${encodeURIComponent(
              tomorrowStart.toISOString()
            )}` +
            `&limit=1000`
          );

        const archivedActions =
          actions.filter(
            (action) =>
              action.type ===
                "updateCard" &&
              action.data?.old?.closed ===
                false &&
              action.data?.card?.closed ===
                true
          );

        const completedCards =
          new Map();

        for (
          const action of
          archivedActions
        ) {

          const card =
            action.data?.card;

          if (!card?.id) {
            continue;
          }

          if (
            !completedCards.has(
              card.id
            )
          ) {
            completedCards.set(
              card.id,
              {
                name:
                  card.name,
                date:
                  action.date
              }
            );
          }
        }


        // ------------------------------------------
        // DETAIL FORMATTER
        // ------------------------------------------

        const cardListText =
          (items) => {

            if (!items.length) {
              return "None";
            }

            return items
              .map(
                (card) => {

                  const listName =
                    listMap.get(
                      card.idList
                    ) ||
                    "Unknown List";

                  return (
                    `- ${card.name}` +
                    ` (${listName})`
                  );
                }
              )
              .join("\n");
          };


        // ------------------------------------------
        // INTERNAL CONSISTENCY CHECK
        // ------------------------------------------

        const countedActiveCards =
          Array.from(
            listCounts.values()
          ).reduce(
            (sum, count) =>
              sum + count,
            0
          );

        if (
          countedActiveCards !==
          activeCards.length
        ) {
          throw new Error(
            `Production report consistency error: ` +
            `active card count is ${activeCards.length}, ` +
            `but list counts total ${countedActiveCards}.`
          );
        }


        // ------------------------------------------
        // REPORT
        // ------------------------------------------

        const report =
          `DAILY PRODUCTION REPORT\n` +
          `Board: ${board.name}\n` +
          `Date: ${today}\n` +
          `Timezone: Arizona\n\n` +

          `ACTIVE ORDERS\n` +
          `${activeCards.length}\n\n` +

          `BY LIST\n` +
          `${listLines.join("\n")}\n\n` +

          `DUE TODAY\n` +
          `${dueToday.length}\n` +
          `${cardListText(dueToday)}\n\n` +

          `OVERDUE\n` +
          `${overdue.length}\n` +
          `${cardListText(overdue)}\n\n` +

          `RUSH\n` +
          `${rushCards.length}\n` +
          `${cardListText(rushCards)}\n\n` +

          `HIDDEN IN ARCHIVED LISTS\n` +
          `${hiddenArchivedListCards.length}\n\n` +

          `COMPLETED TODAY\n` +
          `${completedCards.size}`;

        return {
          content: [
            {
              type: "text",
              text: report
            }
          ]
        };

      } catch (error) {
        return errorResult(error);
      }
    }
  );
}