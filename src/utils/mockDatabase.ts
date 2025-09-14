// Simple in-memory database for development
interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

interface Board {
  _id: string;
  title: string;
  bgcolor: string;
  author: string;
  permissionList: string[];
  isPublic: boolean;
}

interface List {
  id: string;
  title: string;
  boardId: string;
  authorId: string;
  position: number;
  closed: boolean;
}

interface Card {
  id: string;
  name: string;
  authorId: string;
  description: string;
  position: number;
  createdAt: number;
  boardId: string;
  listId: string;
}

// In-memory storage
const mockDB: {
  users: User[];
  boards: Board[];
  lists: List[];
  cards: Card[];
  templates: any[];
  workspaces: any[];
  comments: any[];
  activity: any[];
} = {
  users: [],
  boards: [],
  lists: [],
  cards: [],
  templates: [],
  workspaces: [],
  comments: [],
  activity: []
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

export async function insert(collection: string, data: any): Promise<string> {
  const id = generateId();
  const newItem = { ...data, _id: id, id };
  
  console.log(`Inserting into ${collection}:`, newItem);
  
  switch (collection) {
    case 'users':
      mockDB.users.push(newItem);
      console.log('Current users in DB:', mockDB.users.length);
      break;
    case 'boards':
      mockDB.boards.push(newItem);
      break;
    case 'lists':
      mockDB.lists.push(newItem);
      break;
    case 'cards':
      mockDB.cards.push(newItem);
      break;
    case 'templates':
      mockDB.templates.push(newItem);
      break;
    case 'workspaces':
      mockDB.workspaces.push(newItem);
      break;
    case 'comments':
      mockDB.comments.push(newItem);
      break;
    case 'activity':
      mockDB.activity.push(newItem);
      break;
    default:
      console.log(`Unknown collection: ${collection}`);
  }
  
  console.log(`Generated ID: ${id}`);
  return id;
}

// Alias for insert
export const create = insert;

export async function insertMany(collection: string, data: any[]): Promise<string[]> {
  const ids: string[] = [];
  for (const item of data) {
    const id = await insert(collection, item);
    ids.push(id);
  }
  return ids;
}

export async function find(
  collection: string,
  filter: any = {},
  projection: string[] = [],
  sort: any = {}
): Promise<any[]> {
  let items: any[] = [];
  
  switch (collection) {
    case 'users':
      items = mockDB.users;
      break;
    case 'boards':
      items = mockDB.boards;
      break;
    case 'lists':
      items = mockDB.lists;
      break;
    case 'cards':
      items = mockDB.cards;
      break;
    case 'templates':
      items = mockDB.templates;
      break;
    case 'workspaces':
      items = mockDB.workspaces;
      break;
    case 'comments':
      items = mockDB.comments;
      break;
    case 'activity':
      items = mockDB.activity;
      break;
  }

  console.log(`Finding in ${collection} with filter:`, filter);
  console.log(`Available items:`, items);

  // Simple filtering with support for complex queries
  let filteredItems = items.filter(item => {
    return matchesFilter(item, filter);
  });

  console.log(`Filtered items:`, filteredItems);

  // Return items with _id intact for authentication
  return filteredItems;
}

// Helper function to match complex filters
function matchesFilter(item: any, filter: any): boolean {
  for (const key in filter) {
    const filterValue = filter[key];
    const itemValue = item[key];
    
    if (typeof filterValue === 'object' && filterValue !== null) {
      if (filterValue.$ne !== undefined) {
        if (itemValue === filterValue.$ne) return false;
      } else if (filterValue.$in !== undefined) {
        if (!filterValue.$in.includes(itemValue)) return false;
      } else if (filterValue.$gte !== undefined) {
        if (itemValue < filterValue.$gte) return false;
      } else if (filterValue.$lte !== undefined) {
        if (itemValue > filterValue.$lte) return false;
      } else if (filterValue.$or !== undefined) {
        const orMatches = filterValue.$or.some((orFilter: any) => matchesFilter(item, orFilter));
        if (!orMatches) return false;
      }
    } else {
      if (itemValue !== filterValue) return false;
    }
  }
  return true;
}

// Find by ID helper
export async function findById(collection: string, id: string): Promise<any | null> {
  const results = await find(collection, { id });
  return results.length > 0 ? results[0] : null;
}

export async function update(
  collection: string,
  idOrFilter: string | any,
  newData?: any
): Promise<boolean> {
  let items: any[] = [];
  let filter: any;
  let updateData: any;
  
  // Handle both update(collection, id, data) and update(collection, filter, data)
  if (typeof idOrFilter === 'string') {
    filter = { id: idOrFilter };
    updateData = newData;
  } else {
    filter = idOrFilter;
    updateData = newData;
  }
  
  switch (collection) {
    case 'users':
      items = mockDB.users;
      break;
    case 'boards':
      items = mockDB.boards;
      break;
    case 'lists':
      items = mockDB.lists;
      break;
    case 'cards':
      items = mockDB.cards;
      break;
    case 'templates':
      items = mockDB.templates;
      break;
    case 'workspaces':
      items = mockDB.workspaces;
      break;
    case 'comments':
      items = mockDB.comments;
      break;
    case 'activity':
      items = mockDB.activity;
      break;
  }

  const itemIndex = items.findIndex(item => matchesFilter(item, filter));

  if (itemIndex !== -1) {
    items[itemIndex] = { ...items[itemIndex], ...updateData };
    return true;
  }
  
  return false;
}

export async function remove(collection: string, filter: any = {}): Promise<boolean> {
  let items: any[] = [];
  
  switch (collection) {
    case 'users':
      items = mockDB.users;
      break;
    case 'boards':
      items = mockDB.boards;
      break;
    case 'lists':
      items = mockDB.lists;
      break;
    case 'cards':
      items = mockDB.cards;
      break;
    case 'templates':
      items = mockDB.templates;
      break;
    case 'workspaces':
      items = mockDB.workspaces;
      break;
    case 'comments':
      items = mockDB.comments;
      break;
    case 'activity':
      items = mockDB.activity;
      break;
  }

  const initialLength = items.length;
  const filteredItems = items.filter(item => !matchesFilter(item, filter));

  // Update the collection
  switch (collection) {
    case 'users':
      mockDB.users = filteredItems;
      break;
    case 'boards':
      mockDB.boards = filteredItems;
      break;
    case 'lists':
      mockDB.lists = filteredItems;
      break;
    case 'cards':
      mockDB.cards = filteredItems;
      break;
    case 'templates':
      mockDB.templates = filteredItems;
      break;
    case 'workspaces':
      mockDB.workspaces = filteredItems;
      break;
    case 'comments':
      mockDB.comments = filteredItems;
      break;
    case 'activity':
      mockDB.activity = filteredItems;
      break;
  }

  return filteredItems.length < initialLength;
}

// Delete by ID helper
export async function deleteById(collection: string, id: string): Promise<boolean> {
  return remove(collection, { id });
}

export async function removeMany(collection: string, filter: any = {}): Promise<boolean> {
  return remove(collection, filter);
}
