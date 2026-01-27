import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, pgEnum, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const accountStatusEnum = pgEnum("account_status", ["active", "inactive"]);
export const accountTypeEnum = pgEnum("account_type", ["petty", "bank", "cash"]);
export const accountPayableStatusEnum = pgEnum("account_payable_status", ["active", "inactive"]);
export const accountReceivableStatusEnum = pgEnum("account_receivable_status", ["active", "inactive"]);
export const purchaserStatusEnum = pgEnum("purchaser_status", ["active", "inactive"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "cancelled"]);
export const constructionCategoryEnum = pgEnum("construction_category", ["grey", "finishing", "both"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "transfer",
  "transfer_out",
  "transfer_in",
  "purchase",
  "purchase_return",
  "sale",
  "sale_return",
  "advance_purchase_inventory",
  "advance_sale_payment",
  "advance_purchase_payment",
  "advance_sale_inventory",
  "asset_purchase",
  "loan",
  "loan_return",
  "other_expense",
  "lost_and_damage",
  "pay_able",
  "receive_able",
  "payable_advance",
  "receivable_advance",
  "pay_able_client",
  "receive_able_vendor",
  "payroll",
  "fixed_utility",
  "fixed_expense",
  "miscellaneous"
]);
export const modeOfPaymentEnum = pgEnum("mode_of_payment", ["check", "cash", "bank_transfer", "pay_order"]);
export const payableStatusEnum = pgEnum("payable_status", ["pending", "partial_pending", "paid"]);
export const receivableStatusEnum = pgEnum("receivable_status", ["pending", "partial_pending", "paid"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "seller", "purchaser", "accountant"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  account_number: varchar("account_number", { length: 50 }).notNull().unique(),
  handler: varchar("handler", { length: 100 }),
  account_type: accountTypeEnum("account_type").notNull(),
  balance: real("balance").default(0.0).notNull(),
  status: accountStatusEnum("status").default("active").notNull(),
  city: varchar("city", { length: 100 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Account name is required").max(100, "Name must be 100 characters or less"),
  account_number: z.string().min(1, "Account number is required").max(50, "Account number must be 50 characters or less"),
  handler: z.string().max(100, "Handler must be 100 characters or less").optional(),
  account_type: z.enum(["petty", "bank", "cash"], { required_error: "Account type is required" }),
  balance: z.number().min(0, "Balance must be non-negative").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  city: z.string().min(1, "City is required").max(100, "City must be 100 characters or less"),
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("accountant").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Company Table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  company_name: varchar("company_name", { length: 200 }).notNull(),
  company_address: text("company_address"),
  city: varchar("city", { length: 100 }),
  tax_number: varchar("tax_number", { length: 50 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Name is required").max(150, "Name must be 150 characters or less"),
  email: z.string().email("Invalid email format").min(1, "Email is required").max(255, "Email must be 255 characters or less"),
  phone: z.string().max(30, "Phone number must be 30 characters or less").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "seller", "purchaser", "accountant"]).default("accountant"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Company = typeof companies.$inferSelect;

// Products Inventory Table
export const productsInventory = pgTable("products_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 150 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  quantity: real("quantity").default(0.0).notNull(),
  current_price: real("current_price").default(0.0).notNull(),
  product_category: varchar("product_category", { length: 100 }),
  construction_category: constructionCategoryEnum("construction_category"),
  company_id: varchar("company_id").references(() => companies.id),
  company_name: varchar("company_name", { length: 200 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory History Table
// Validation schemas for products inventory
export const insertProductSchema = createInsertSchema(productsInventory).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Product name is required").max(150, "Name must be 150 characters or less"),
  brand: z.string().max(100, "Brand must be 100 characters or less").optional(),
  unit: z.string().max(50, "Unit must be 50 characters or less").optional(),
  quantity: z.number().min(0, "Quantity must be non-negative").default(0),
  current_price: z.number().min(0, "Price must be non-negative").optional(),
  product_category: z.string().max(100, "Product category must be 100 characters or less").optional(),
  construction_category: z.enum(["grey", "finishing", "both"]).optional(),
  company_id: z.string().optional(),
  company_name: z.string().max(200, "Company name must be 200 characters or less").optional(),
});

// Type exports
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsInventory.$inferSelect;

// Account Payables Table
export const accountPayables = pgTable("account_payables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ap_id: varchar("ap_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  number: varchar("number", { length: 30 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  status: accountPayableStatusEnum("status").default("active").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  initial_balance: decimal("initial_balance", { precision: 15, scale: 2 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Account Payable Production Junction Table
export const accountPayableProductionJunction = pgTable("account_payable_production_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  account_payable_id: varchar("account_payable_id").notNull().references(() => accountPayables.id),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Validation schemas for account payables
export const insertAccountPayableSchema = createInsertSchema(accountPayables).omit({
  id: true,
  ap_id: true,
  balance: true,
  initial_balance: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Account Payable name is required").max(150, "Name must be 150 characters or less"),
  number: z.string().max(30, "Contact number must be 30 characters or less").optional(),
  address: z.string().optional(),
  city: z.string().max(100, "City must be 100 characters or less").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  initial_balance: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? val : val.toString();
  }),
});

// Validation schemas for account payable production junction
export const insertAccountPayableProductionJunctionSchema = createInsertSchema(accountPayableProductionJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  account_payable_id: z.string().min(1, "Account Payable ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
});

// Type exports for new tables
export type InsertAccountPayable = z.infer<typeof insertAccountPayableSchema>;
export type AccountPayable = typeof accountPayables.$inferSelect;
export type InsertAccountPayableProductionJunction = z.infer<typeof insertAccountPayableProductionJunctionSchema>;
export type AccountPayableProductionJunction = typeof accountPayableProductionJunction.$inferSelect;

// Relations for new tables
export const accountPayablesRelations = relations(accountPayables, ({ many }) => ({
  accountPayableProductionJunction: many(accountPayableProductionJunction),
  purchaserAccountPayableJunction: many(purchaserAccountPayableJunction),
  transactions: many(transactions),
  // payables table removed - use transactions table instead
}));

export const accountPayableProductionJunctionRelations = relations(accountPayableProductionJunction, ({ one }) => ({
  accountPayable: one(accountPayables, {
    fields: [accountPayableProductionJunction.account_payable_id],
    references: [accountPayables.id],
  }),
  product: one(productsInventory, {
    fields: [accountPayableProductionJunction.product_id],
    references: [productsInventory.id],
  }),
}));

// Account Receivables Table
export const accountReceivables = pgTable("account_receivables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ar_id: varchar("ar_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  number: varchar("number", { length: 30 }),
  cnic: varchar("cnic", { length: 25 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  status: accountReceivableStatusEnum("status").default("active").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  initial_balance: decimal("initial_balance", { precision: 15, scale: 2 }),
  construction_category: constructionCategoryEnum("construction_category"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Purchasers Table
export const purchasers = pgTable("purchasers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 150 }).notNull(),
  number: varchar("number", { length: 30 }),
  cnic: varchar("cnic", { length: 25 }),
  city: varchar("city", { length: 100 }),
  status: purchaserStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Purchasers Product Junction Table
export const purchasersProductJunction = pgTable("purchasers_product_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaser_id: varchar("purchaser_id").notNull().references(() => purchasers.id),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Invoices Table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  account_receivable_id: varchar("account_receivable_id").notNull().references(() => accountReceivables.id),
  invoice_number: varchar("invoice_number", { length: 50 }).notNull().unique(),
  total_amount: decimal("total_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: invoiceStatusEnum("status").default("pending").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Invoice Product Junction Table
export const invoiceProductJunction = pgTable("invoice_product_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoice_id: varchar("invoice_id").notNull().references(() => invoices.id),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id),
  units_of_product: integer("units_of_product").notNull(),
  amount_of_product: decimal("amount_of_product", { precision: 12, scale: 2 }).default("0.00").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Purchaser Account Payable Junction Table
export const purchaserAccountPayableJunction = pgTable("purchaser_account_payable_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaser_id: varchar("purchaser_id").notNull().references(() => purchasers.id),
  account_payable_id: varchar("account_payable_id").notNull().references(() => accountPayables.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Transactions Table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: transactionTypeEnum("type").notNull(),
  source_account_id: varchar("source_account_id").references(() => accounts.id),
  destination_account_id: varchar("destination_account_id").references(() => accounts.id),
  total_amount: decimal("total_amount", { precision: 15, scale: 2 }),
  opening_balance: decimal("opening_balance", { precision: 15, scale: 2 }),
  closing_balance: decimal("closing_balance", { precision: 15, scale: 2 }),
  description: text("description"),
  mode_of_payment: modeOfPaymentEnum("mode_of_payment"),
  paid_amount: decimal("paid_amount", { precision: 15, scale: 2 }),
  remaining_payment: decimal("remaining_payment", { precision: 15, scale: 2 }),
  date: timestamp("date"),
  purchase_invoice_number: varchar("purchase_invoice_number", { length: 50 }),
  sale_invoice_number: varchar("sale_invoice_number", { length: 50 }),
  payment_invoice_number: varchar("payment_invoice_number", { length: 50 }),
  receipt_invoice_number: varchar("receipt_invoice_number", { length: 50 }),
  account_payable_id: varchar("account_payable_id").references(() => accountPayables.id),
  account_receivable_id: varchar("account_receivable_id").references(() => accountReceivables.id),
  purchaser_id: varchar("purchaser_id").references(() => purchasers.id),
  profit_loss: decimal("profit_loss", { precision: 15, scale: 2 }),
  user_id: varchar("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Payables and Receivables tables removed - functionality moved to transactions table

// Batch Inventory Table
export const batchStatusEnum = pgEnum("batch_status", ["active", "exhausted", "expired"]);

export const batchInventory = pgTable("batch_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id, { onDelete: "cascade" }),
  batch_number: varchar("batch_number", { length: 100 }).notNull(),
  original_quantity: decimal("original_quantity", { precision: 15, scale: 2 }).notNull().default("0.00"),
  available_quantity: decimal("available_quantity", { precision: 15, scale: 2 }).notNull().default("0.00"),
  purchase_price_per_unit: decimal("purchase_price_per_unit", { precision: 15, scale: 2 }).notNull(),
  purchase_total_price: decimal("purchase_total_price", { precision: 15, scale: 2 }).notNull(),
  transaction_id: varchar("transaction_id").notNull().references(() => transactions.id),
  purchaser_id: varchar("purchaser_id").references(() => purchasers.id),
  purchase_date: timestamp("purchase_date").notNull(),
  status: batchStatusEnum("status").notNull().default("active"),
  unit: varchar("unit", { length: 50 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Batch Sale Junction Table
export const batchSaleJunction = pgTable("batch_sale_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transaction_product_junction_id: varchar("transaction_product_junction_id").notNull().references(() => transactionProductJunction.id, { onDelete: "cascade" }),
  batch_id: varchar("batch_id").notNull().references(() => batchInventory.id, { onDelete: "cascade" }),
  quantity_sold: decimal("quantity_sold", { precision: 15, scale: 2 }).notNull(),
  purchase_price_used: decimal("purchase_price_used", { precision: 15, scale: 2 }).notNull(),
  sale_price_per_unit: decimal("sale_price_per_unit", { precision: 15, scale: 2 }).notNull(),
  total_sale_amount: decimal("total_sale_amount", { precision: 15, scale: 2 }).notNull(),
  cogs_amount: decimal("cogs_amount", { precision: 15, scale: 2 }).notNull(),
  profit_amount: decimal("profit_amount", { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction Product Junction Table
export const transactionProductJunction = pgTable("transaction_product_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transaction_id: varchar("transaction_id").notNull().references(() => transactions.id),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  quantity_before: decimal("quantity_before", { precision: 15, scale: 2 }),
  quantity_after: decimal("quantity_after", { precision: 15, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  per_unit_rate: decimal("per_unit_rate", { precision: 15, scale: 2 }),
  unit_price: decimal("unit_price", { precision: 15, scale: 2 }),
  total_amount: decimal("total_amount", { precision: 15, scale: 2 }),
  batch_id: varchar("batch_id").references(() => batchInventory.id),
  notes: text("notes"),
  type: varchar("type", { length: 50 }),
  discount: decimal("discount", { precision: 15, scale: 2 }),
  discount_per_unit: decimal("discount_per_unit", { precision: 15, scale: 2 }),
  company_id: varchar("company_id").references(() => companies.id),
  company_name: varchar("company_name", { length: 200 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction Product Sale Junction Table
export const transactionProductSaleJunction = pgTable("transaction_product_sale_junction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transaction_id: varchar("transaction_id").notNull().references(() => transactions.id),
  product_id: varchar("product_id").notNull().references(() => productsInventory.id),
  batch_id: varchar("batch_id").notNull().references(() => batchInventory.id),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  q_before: decimal("q_before", { precision: 15, scale: 2 }).notNull(),
  q_after: decimal("q_after", { precision: 15, scale: 2 }).notNull(),
  purchase_price: decimal("purchase_price", { precision: 15, scale: 2 }).notNull(),
  sale_price: decimal("sale_price", { precision: 15, scale: 2 }).notNull(),
  profit_loss: decimal("profit_loss", { precision: 15, scale: 2 }).notNull(), // Can be negative for losses
  type: varchar("type", { length: 50 }),
  transaction_product_id: varchar("transaction_product_id").notNull().references(() => transactionProductJunction.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Validation schemas for account receivables
export const insertAccountReceivableSchema = createInsertSchema(accountReceivables).omit({
  id: true,
  ar_id: true,
  balance: true,
  initial_balance: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Account Receivable name is required").max(150, "Name must be 150 characters or less"),
  number: z.string().max(30, "Contact number must be 30 characters or less").optional(),
  cnic: z.string().max(25, "CNIC must be 25 characters or less").optional(),
  city: z.string().max(100, "City must be 100 characters or less").optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  construction_category: z.enum(["grey", "finishing", "both"]).optional(),
  initial_balance: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? val : val.toString();
  }),
});

// Validation schemas for purchasers
export const insertPurchaserSchema = createInsertSchema(purchasers).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  name: z.string().min(1, "Purchaser name is required").max(150, "Name must be 150 characters or less"),
  number: z.string().max(30, "Contact number must be 30 characters or less").optional(),
  cnic: z.string().max(25, "CNIC must be 25 characters or less").optional(),
  city: z.string().max(100, "City must be 100 characters or less").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Validation schemas for purchasers product junction
export const insertPurchasersProductJunctionSchema = createInsertSchema(purchasersProductJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  purchaser_id: z.string().min(1, "Purchaser ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
});

// Validation schemas for invoices
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  account_receivable_id: z.string().min(1, "Account Receivable ID is required"),
  invoice_number: z.string().min(1, "Invoice number is required").max(50, "Invoice number must be 50 characters or less"),
  total_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  status: z.enum(["pending", "paid", "cancelled"]).default("pending"),
});

// Validation schemas for invoice product junction
export const insertInvoiceProductJunctionSchema = createInsertSchema(invoiceProductJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  invoice_id: z.string().min(1, "Invoice ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  units_of_product: z.number().int().min(1, "Units must be at least 1"),
  amount_of_product: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
});

// Validation schemas for purchaser account payable junction
export const insertPurchaserAccountPayableJunctionSchema = createInsertSchema(purchaserAccountPayableJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  purchaser_id: z.string().min(1, "Purchaser ID is required"),
  account_payable_id: z.string().min(1, "Account Payable ID is required"),
});

// Validation schemas for transactions
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  type: z.enum([
    "deposit", "transfer", "purchase", "purchase_return", "sale", "sale_return",
    "advance_purchase_inventory", "advance_sale_payment", "advance_purchase_payment",
    "advance_sale_inventory", "asset_purchase", "loan", "loan_return",
    "other_expense", "lost_and_damage", "pay_able", "receive_able",
    "payable_advance", "receivable_advance", "pay_able_client", "receive_able_vendor",
    "payroll", "fixed_utility", "fixed_expense", "miscellaneous"
  ], { required_error: "Transaction type is required" }),
  source_account_id: z.string().nullable().optional(),
  destination_account_id: z.string().nullable().optional(),
  total_amount: z.string().optional(),
  opening_balance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid opening balance format").optional(),
  closing_balance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid closing balance format").optional(),
  description: z.string().optional(),
  mode_of_payment: z.enum(["check", "cash", "bank_transfer", "pay_order"]).optional(),
  paid_amount: z.string().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty strings
    return /^-?\d+(\.\d{1,2})?$/.test(val); // Allow negative values for overpayments
  }, "Invalid paid amount format").optional(),
  remaining_payment: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid remaining payment format").optional(), // Allow negative values for overpayments
  date: z.string().refine((val) => {
    if (!val) return true;
    // Accept both date (YYYY-MM-DD) and datetime (ISO) formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return dateRegex.test(val) || datetimeRegex.test(val) || !isNaN(Date.parse(val));
  }, "Invalid date format. Use YYYY-MM-DD or ISO datetime format").optional(),
  purchase_invoice_number: z.string().max(50, "Purchase invoice number must be 50 characters or less").optional(),
  sale_invoice_number: z.string().max(50, "Sale invoice number must be 50 characters or less").optional(),
  payment_invoice_number: z.string().max(50, "Payment invoice number must be 50 characters or less").optional(),
  receipt_invoice_number: z.string().max(50, "Receipt invoice number must be 50 characters or less").optional(),
  account_payable_id: z.string().nullable().optional(),
  account_receivable_id: z.string().nullable().optional(),
  purchaser_id: z.string().nullable().optional(),
  profit_loss: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid profit/loss format").optional(),
  user_id: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  // Validate total_amount based on transaction type
  if (data.total_amount && data.total_amount.trim() !== '') {
    // For pay_able_client and receive_able_vendor transactions, allow negative values
    // (account receivable balance can be negative for pay_able_client, account payable balance can be negative for receive_able_vendor)
    if (data.type === 'pay_able_client' || data.type === 'receive_able_vendor') {
      if (!/^-?\d+(\.\d{1,2})?$/.test(data.total_amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid total amount format",
          path: ["total_amount"],
        });
      }
    } else {
      // For all other transaction types, only allow positive values
      if (!/^\d+(\.\d{1,2})?$/.test(data.total_amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid total amount format",
          path: ["total_amount"],
        });
      }
    }
  }
});

// Payables and Receivables validation schemas removed - functionality moved to transactions

// Validation schemas for batch inventory
export const insertBatchInventorySchema = createInsertSchema(batchInventory).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  product_id: z.string().min(1, "Product ID is required"),
  batch_number: z.string().min(1, "Batch number is required").max(100, "Batch number must be 100 characters or less"),
  original_quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid original quantity format").optional(),
  available_quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid available quantity format").optional(),
  purchase_price_per_unit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid purchase price format"),
  purchase_total_price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid total price format"),
  transaction_id: z.string().min(1, "Transaction ID is required"),
  purchaser_id: z.string().optional().nullable(),
  status: z.enum(["active", "exhausted", "expired"]).optional(),
  unit: z.string().max(50, "Unit must be 50 characters or less").optional(),
  purchase_date: z.string().refine((val) => {
    if (!val) return true;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return dateRegex.test(val) || datetimeRegex.test(val) || !isNaN(Date.parse(val));
  }, "Invalid date format").optional(),
});

// Validation schemas for batch sale junction
export const insertBatchSaleJunctionSchema = createInsertSchema(batchSaleJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  transaction_product_junction_id: z.string().min(1, "Transaction Product Junction ID is required"),
  batch_id: z.string().min(1, "Batch ID is required"),
  quantity_sold: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity sold format"),
  purchase_price_used: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid purchase price format"),
  sale_price_per_unit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid sale price format"),
  total_sale_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid total sale amount format"),
  cogs_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid COGS amount format"),
  profit_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid profit amount format"),
});

// Validation schemas for transaction product junction
export const insertTransactionProductJunctionSchema = createInsertSchema(transactionProductJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  quantity: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid quantity format"),
  quantity_before: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity before format").optional(),
  quantity_after: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity after format").optional(),
  unit: z.string().max(50, "Unit must be 50 characters or less").optional(),
  per_unit_rate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid per unit rate format").optional(),
  unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid unit price format").optional(),
  total_amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid total amount format").optional(),
  batch_id: z.string().optional(),
  notes: z.string().optional(),
  type: z.string().max(50, "Type must be 50 characters or less").optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid discount format").optional(),
  discount_per_unit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid discount per unit format").optional(),
  company_id: z.string().optional(),
  company_name: z.string().max(200, "Company name must be 200 characters or less").optional(),
});

// Validation schemas for transaction product sale junction
export const insertTransactionProductSaleJunctionSchema = createInsertSchema(transactionProductSaleJunction).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  batch_id: z.string().min(1, "Batch ID is required"),
  quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity format"),
  q_before: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity before format"),
  q_after: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity after format"),
  purchase_price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid purchase price format"),
  sale_price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid sale price format"),
  profit_loss: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid profit/loss format"), // Can be negative
  type: z.string().max(50, "Type must be 50 characters or less").optional(),
  transaction_product_id: z.string().min(1, "Transaction Product ID is required"),
});

// Type exports for new tables
export type InsertAccountReceivable = z.infer<typeof insertAccountReceivableSchema>;
export type AccountReceivable = typeof accountReceivables.$inferSelect;
export type InsertPurchaser = z.infer<typeof insertPurchaserSchema>;
export type Purchaser = typeof purchasers.$inferSelect;
export type InsertPurchasersProductJunction = z.infer<typeof insertPurchasersProductJunctionSchema>;
export type PurchasersProductJunction = typeof purchasersProductJunction.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoiceProductJunction = z.infer<typeof insertInvoiceProductJunctionSchema>;
export type InvoiceProductJunction = typeof invoiceProductJunction.$inferSelect;
export type InsertPurchaserAccountPayableJunction = z.infer<typeof insertPurchaserAccountPayableJunctionSchema>;
export type PurchaserAccountPayableJunction = typeof purchaserAccountPayableJunction.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
// Payable and Receivable types removed - use Transaction types instead
export type InsertBatchInventory = z.infer<typeof insertBatchInventorySchema>;
export type BatchInventory = typeof batchInventory.$inferSelect;
export type InsertBatchSaleJunction = z.infer<typeof insertBatchSaleJunctionSchema>;
export type BatchSaleJunction = typeof batchSaleJunction.$inferSelect;
export type InsertTransactionProductJunction = z.infer<typeof insertTransactionProductJunctionSchema>;
export type TransactionProductJunction = typeof transactionProductJunction.$inferSelect;
export type InsertTransactionProductSaleJunction = z.infer<typeof insertTransactionProductSaleJunctionSchema>;
export type TransactionProductSaleJunction = typeof transactionProductSaleJunction.$inferSelect;

// Relations for new tables
export const accountReceivablesRelations = relations(accountReceivables, ({ many }) => ({
  invoices: many(invoices),
  transactions: many(transactions),
}));

export const purchasersRelations = relations(purchasers, ({ many }) => ({
  purchasersProductJunction: many(purchasersProductJunction),
  purchaserAccountPayableJunction: many(purchaserAccountPayableJunction),
  transactions: many(transactions),
}));

export const purchasersProductJunctionRelations = relations(purchasersProductJunction, ({ one }) => ({
  purchaser: one(purchasers, {
    fields: [purchasersProductJunction.purchaser_id],
    references: [purchasers.id],
  }),
  product: one(productsInventory, {
    fields: [purchasersProductJunction.product_id],
    references: [productsInventory.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  accountReceivable: one(accountReceivables, {
    fields: [invoices.account_receivable_id],
    references: [accountReceivables.id],
  }),
  invoiceProductJunction: many(invoiceProductJunction),
}));

export const invoiceProductJunctionRelations = relations(invoiceProductJunction, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceProductJunction.invoice_id],
    references: [invoices.id],
  }),
  product: one(productsInventory, {
    fields: [invoiceProductJunction.product_id],
    references: [productsInventory.id],
  }),
}));

export const purchaserAccountPayableJunctionRelations = relations(purchaserAccountPayableJunction, ({ one }) => ({
  purchaser: one(purchasers, {
    fields: [purchaserAccountPayableJunction.purchaser_id],
    references: [purchasers.id],
  }),
  accountPayable: one(accountPayables, {
    fields: [purchaserAccountPayableJunction.account_payable_id],
    references: [accountPayables.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  sourceAccount: one(accounts, {
    fields: [transactions.source_account_id],
    references: [accounts.id],
    relationName: "sourceAccount",
  }),
  destinationAccount: one(accounts, {
    fields: [transactions.destination_account_id],
    references: [accounts.id],
    relationName: "destinationAccount",
  }),
  accountPayable: one(accountPayables, {
    fields: [transactions.account_payable_id],
    references: [accountPayables.id],
  }),
  accountReceivable: one(accountReceivables, {
    fields: [transactions.account_receivable_id],
    references: [accountReceivables.id],
  }),
  purchaser: one(purchasers, {
    fields: [transactions.purchaser_id],
    references: [purchasers.id],
  }),
  transactionProductJunction: many(transactionProductJunction),
}));

// Additional relations for existing tables
export const accountsRelations = relations(accounts, ({ many }) => ({
  sourceTransactions: many(transactions, { relationName: "sourceAccount" }),
  destinationTransactions: many(transactions, { relationName: "destinationAccount" }),
}));

export const productsInventoryRelationsExtended = relations(productsInventory, ({ many }) => ({
  accountPayableProductionJunction: many(accountPayableProductionJunction),
  purchasersProductJunction: many(purchasersProductJunction),
  invoiceProductJunction: many(invoiceProductJunction),
  transactionProductJunction: many(transactionProductJunction),
  batchInventory: many(batchInventory),
}));

export const batchInventoryRelations = relations(batchInventory, ({ one, many }) => ({
  product: one(productsInventory, {
    fields: [batchInventory.product_id],
    references: [productsInventory.id],
  }),
  transaction: one(transactions, {
    fields: [batchInventory.transaction_id],
    references: [transactions.id],
  }),
  purchaser: one(purchasers, {
    fields: [batchInventory.purchaser_id],
    references: [purchasers.id],
  }),
  batchSaleJunctions: many(batchSaleJunction),
}));

export const batchSaleJunctionRelations = relations(batchSaleJunction, ({ one }) => ({
  transactionProductJunction: one(transactionProductJunction, {
    fields: [batchSaleJunction.transaction_product_junction_id],
    references: [transactionProductJunction.id],
  }),
  batch: one(batchInventory, {
    fields: [batchSaleJunction.batch_id],
    references: [batchInventory.id],
  }),
}));

export const transactionProductJunctionRelations = relations(transactionProductJunction, ({ one, many }) => ({
  transaction: one(transactions, {
    fields: [transactionProductJunction.transaction_id],
    references: [transactions.id],
  }),
  product: one(productsInventory, {
    fields: [transactionProductJunction.product_id],
    references: [productsInventory.id],
  }),
  batchSaleJunctions: many(batchSaleJunction),
}));
