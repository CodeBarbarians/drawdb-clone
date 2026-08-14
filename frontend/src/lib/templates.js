import { makeColumn, makeTable, nextId } from "./dbTypes";

function col(name, type, overrides = {}) {
  return makeColumn({ name, type, ...overrides });
}

function pk(name = "id") {
  return col(name, "INTEGER", { pk: true, notNull: true, autoIncrement: true });
}

function fk(name, overrides = {}) {
  return col(name, "INTEGER", { notNull: true, ...overrides });
}

function table(name, position, columns) {
  return makeTable({ name, position, columns });
}

// sqlExport.js puts the FK column on `targetTable` and has it reference
// `sourceTable` (the PK side) — i.e. source is the "one" side, target is the
// "many" side holding the foreign key. Call this as
// rel(childTableWithFkColumn, fkColumn, parentTableWithPk, pkColumn).
function rel(childTable, childColumn, parentTable, parentColumn, cardinality = "one_to_many") {
  return {
    id: nextId("rel"),
    sourceTableId: parentTable.id,
    sourceColumnId: parentColumn.id,
    targetTableId: childTable.id,
    targetColumnId: childColumn.id,
    name: `fk_${childTable.name}_${childColumn.name}`,
    cardinality,
    updateConstraint: "No action",
    deleteConstraint: "No action",
  };
}

function ecommerce() {
  const users = table("users", { x: 60, y: 60 }, [
    pk(),
    col("email", "VARCHAR(255)", { notNull: true, unique: true }),
    col("full_name", "VARCHAR(255)"),
    col("created_at", "TIMESTAMP"),
  ]);
  const categories = table("categories", { x: 60, y: 380 }, [pk(), col("name", "VARCHAR(255)", { notNull: true })]);
  const products = table("products", { x: 460, y: 380 }, [
    pk(),
    fk("category_id"),
    col("name", "VARCHAR(255)", { notNull: true }),
    col("price", "NUMERIC(10,2)", { notNull: true }),
    col("stock", "INTEGER", { notNull: true, defaultValue: "0" }),
  ]);
  const addresses = table("addresses", { x: 460, y: 60 }, [
    pk(),
    fk("user_id"),
    col("line1", "VARCHAR(255)", { notNull: true }),
    col("city", "VARCHAR(255)", { notNull: true }),
    col("postal_code", "VARCHAR(255)"),
  ]);
  const orders = table("orders", { x: 900, y: 60 }, [
    pk(),
    fk("user_id"),
    fk("address_id"),
    col("status", "VARCHAR(255)", { notNull: true, defaultValue: "pending" }),
    col("created_at", "TIMESTAMP"),
  ]);
  const orderItems = table("order_items", { x: 900, y: 380 }, [
    pk(),
    fk("order_id"),
    fk("product_id"),
    col("quantity", "INTEGER", { notNull: true, defaultValue: "1" }),
    col("unit_price", "NUMERIC(10,2)", { notNull: true }),
  ]);

  return {
    tables: [users, categories, products, addresses, orders, orderItems],
    relationships: [
      rel(addresses, addresses.columns[1], users, users.columns[0]),
      rel(products, products.columns[1], categories, categories.columns[0]),
      rel(orders, orders.columns[1], users, users.columns[0]),
      rel(orders, orders.columns[2], addresses, addresses.columns[0]),
      rel(orderItems, orderItems.columns[1], orders, orders.columns[0]),
      rel(orderItems, orderItems.columns[2], products, products.columns[0]),
    ],
    notes: [],
    enums: [],
    subjectAreas: [],
  };
}

function blogCms() {
  const users = table("users", { x: 60, y: 60 }, [
    pk(),
    col("username", "VARCHAR(255)", { notNull: true, unique: true }),
    col("email", "VARCHAR(255)", { notNull: true, unique: true }),
  ]);
  const categories = table("categories", { x: 60, y: 380 }, [pk(), col("name", "VARCHAR(255)", { notNull: true })]);
  const posts = table("posts", { x: 460, y: 200 }, [
    pk(),
    fk("author_id"),
    fk("category_id"),
    col("title", "VARCHAR(255)", { notNull: true }),
    col("body", "TEXT"),
    col("published_at", "TIMESTAMP"),
  ]);
  const comments = table("comments", { x: 900, y: 60 }, [
    pk(),
    fk("post_id"),
    fk("user_id"),
    col("body", "TEXT", { notNull: true }),
    col("created_at", "TIMESTAMP"),
  ]);
  const tags = table("tags", { x: 900, y: 380 }, [pk(), col("name", "VARCHAR(255)", { notNull: true, unique: true })]);
  const postTags = table("post_tags", { x: 460, y: 520 }, [pk(), fk("post_id"), fk("tag_id")]);

  return {
    tables: [users, categories, posts, comments, tags, postTags],
    relationships: [
      rel(posts, posts.columns[1], users, users.columns[0]),
      rel(posts, posts.columns[2], categories, categories.columns[0]),
      rel(comments, comments.columns[1], posts, posts.columns[0]),
      rel(comments, comments.columns[2], users, users.columns[0]),
      rel(postTags, postTags.columns[1], posts, posts.columns[0]),
      rel(postTags, postTags.columns[2], tags, tags.columns[0]),
    ],
    notes: [],
    enums: [],
    subjectAreas: [],
  };
}

function saasMultiTenant() {
  const organizations = table("organizations", { x: 60, y: 200 }, [
    pk(),
    col("name", "VARCHAR(255)", { notNull: true }),
    col("created_at", "TIMESTAMP"),
  ]);
  const users = table("users", { x: 60, y: 520 }, [
    pk(),
    col("email", "VARCHAR(255)", { notNull: true, unique: true }),
    col("full_name", "VARCHAR(255)"),
  ]);
  const memberships = table("memberships", { x: 460, y: 360 }, [
    pk(),
    fk("organization_id"),
    fk("user_id"),
    col("role", "VARCHAR(255)", { notNull: true, defaultValue: "member" }),
  ]);
  const projects = table("projects", { x: 900, y: 60 }, [
    pk(),
    fk("organization_id"),
    col("name", "VARCHAR(255)", { notNull: true }),
  ]);
  const tasks = table("tasks", { x: 900, y: 380 }, [
    pk(),
    fk("project_id"),
    fk("assignee_id", { notNull: false }),
    col("title", "VARCHAR(255)", { notNull: true }),
    col("status", "VARCHAR(255)", { notNull: true, defaultValue: "todo" }),
  ]);
  const invitations = table("invitations", { x: 460, y: 60 }, [
    pk(),
    fk("organization_id"),
    col("email", "VARCHAR(255)", { notNull: true }),
    col("status", "VARCHAR(255)", { notNull: true, defaultValue: "pending" }),
  ]);

  return {
    tables: [organizations, users, memberships, projects, tasks, invitations],
    relationships: [
      rel(memberships, memberships.columns[1], organizations, organizations.columns[0]),
      rel(memberships, memberships.columns[2], users, users.columns[0]),
      rel(projects, projects.columns[1], organizations, organizations.columns[0]),
      rel(tasks, tasks.columns[1], projects, projects.columns[0]),
      rel(tasks, tasks.columns[2], users, users.columns[0]),
      rel(invitations, invitations.columns[1], organizations, organizations.columns[0]),
    ],
    notes: [],
    enums: [],
    subjectAreas: [],
  };
}

function taskTracker() {
  const users = table("users", { x: 60, y: 60 }, [
    pk(),
    col("username", "VARCHAR(255)", { notNull: true, unique: true }),
  ]);
  const boards = table("boards", { x: 60, y: 380 }, [
    pk(),
    fk("owner_id"),
    col("name", "VARCHAR(255)", { notNull: true }),
  ]);
  const columns = table("columns", { x: 460, y: 380 }, [
    pk(),
    fk("board_id"),
    col("name", "VARCHAR(255)", { notNull: true }),
    col("position", "INTEGER", { notNull: true, defaultValue: "0" }),
  ]);
  const cards = table("cards", { x: 900, y: 380 }, [
    pk(),
    fk("column_id"),
    col("title", "VARCHAR(255)", { notNull: true }),
    col("description", "TEXT"),
  ]);
  const cardAssignees = table("card_assignees", { x: 900, y: 60 }, [pk(), fk("card_id"), fk("user_id")]);
  const comments = table("comments", { x: 460, y: 60 }, [
    pk(),
    fk("card_id"),
    fk("user_id"),
    col("body", "TEXT", { notNull: true }),
  ]);

  return {
    tables: [users, boards, columns, cards, cardAssignees, comments],
    relationships: [
      rel(boards, boards.columns[1], users, users.columns[0]),
      rel(columns, columns.columns[1], boards, boards.columns[0]),
      rel(cards, cards.columns[1], columns, columns.columns[0]),
      rel(cardAssignees, cardAssignees.columns[1], cards, cards.columns[0]),
      rel(cardAssignees, cardAssignees.columns[2], users, users.columns[0]),
      rel(comments, comments.columns[1], cards, cards.columns[0]),
      rel(comments, comments.columns[2], users, users.columns[0]),
    ],
    notes: [],
    enums: [],
    subjectAreas: [],
  };
}

// Each factory is called fresh per use so every created diagram gets its own
// unique table/column/relationship ids (nextId() is a shared, ever-incrementing
// counter) rather than sharing references with any previously created diagram.
export const DIAGRAM_TEMPLATES = [
  { key: "ecommerce", name: "E-commerce", description: "Users, products, categories, orders and order items.", tableCount: 6, build: ecommerce },
  { key: "blog", name: "Blog / CMS", description: "Authors, posts, categories, comments and tags.", tableCount: 6, build: blogCms },
  { key: "saas", name: "SaaS multi-tenant", description: "Organizations, memberships, projects and tasks.", tableCount: 6, build: saasMultiTenant },
  { key: "tasks", name: "Task tracker", description: "Boards, columns, cards and assignees.", tableCount: 6, build: taskTracker },
];
