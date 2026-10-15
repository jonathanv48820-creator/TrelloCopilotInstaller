const API_KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;

export function checkCredentials() {
  if (!API_KEY || !TOKEN) {
    throw new Error(
      "TRELLO_API_KEY and TRELLO_TOKEN environment variables are required."
    );
  }
}

export async function trelloRequest(path, options = {}) {
  checkCredentials();

  const separator = path.includes("?") ? "&" : "?";

  const url =
    `https://api.trello.com/1${path}` +
    `${separator}key=${encodeURIComponent(API_KEY)}` +
    `&token=${encodeURIComponent(TOKEN)}`;

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Trello API error ${response.status}: ${errorText}`
    );
  }

  const text = await response.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

export async function findOrderCard(orderNumber) {
  const normalizedOrder =
    String(orderNumber).trim().toLowerCase();

  if (!normalizedOrder) {
    throw new Error(
      "An order number is required."
    );
  }

  // Search Trello first.
  const search = await trelloRequest(
    `/search?query=${encodeURIComponent(normalizedOrder)}` +
    `&modelTypes=cards` +
    `&card_fields=name,url,idBoard,idList,closed,desc,due,dueComplete`
  );

  let cards = search.cards || [];

  // Match the order number at the beginning of the card name.
  let matches = cards.filter((card) => {
    const name =
      card.name.trim().toLowerCase();

    return (
      name === normalizedOrder ||
      name.startsWith(`${normalizedOrder} /`) ||
      name.startsWith(`${normalizedOrder}/`) ||
      name.startsWith(`${normalizedOrder} `)
    );
  });

  /*
    If Trello Search did not return the card,
    fall back to checking cards on every board
    accessible to the integration account.

    This is especially useful for newly-created
    cards that may not immediately appear in search.
  */
  if (matches.length === 0) {
    const boards = await trelloRequest(
      `/members/me/boards?filter=open&fields=name`
    );

    const boardCardGroups =
      await Promise.all(
        boards.map((board) =>
          trelloRequest(
            `/boards/${board.id}/cards` +
            `?filter=all` +
            `&fields=name,url,idBoard,idList,closed,desc,due,dueComplete`
          )
        )
      );

    cards = boardCardGroups.flat();

    matches = cards.filter((card) => {
      const name =
        card.name.trim().toLowerCase();

      return (
        name === normalizedOrder ||
        name.startsWith(`${normalizedOrder} /`) ||
        name.startsWith(`${normalizedOrder}/`) ||
        name.startsWith(`${normalizedOrder} `)
      );
    });
  }

  if (matches.length === 0) {
    throw new Error(
      `No Trello card found for order ${orderNumber}.`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `More than one Trello card matches order ${orderNumber}.`
    );
  }

  return matches[0];
}


export async function getBoardLists(boardId) {
  return trelloRequest(
    `/boards/${boardId}/lists?filter=open&fields=name`
  );
}

export async function findList(boardId, listName) {
  const lists = await getBoardLists(boardId);

  const matches = lists.filter(
    (list) =>
      list.name.trim().toLowerCase() ===
      listName.trim().toLowerCase()
  );

  if (matches.length === 0) {
    const availableLists = lists
      .map((list) => list.name)
      .join(", ");

    throw new Error(
      `List "${listName}" was not found. ` +
      `Available lists: ${availableLists}`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `More than one list named "${listName}" was found.`
    );
  }

  return matches[0];
}