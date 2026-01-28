import Dexie, { Table } from 'dexie';
import { Record, Media, Tag, Transaction, Category, Account, Countdown } from '../types';

export class SuijiDatabase extends Dexie {
  records!: Table<Record>;
  media!: Table<Media>;
  tags!: Table<Tag>;
  
  // Finance tables
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  accounts!: Table<Account>;

  // Countdown table
  countdowns!: Table<Countdown>;

  constructor() {
    super('SuijiDatabase');
    this.version(1).stores({
      records: 'id, createdAt, updatedAt', // Primary key and indexes
      media: 'id, recordId, mediaType, createdAt'
    });
    
    // Version 3: Add title field
    this.version(3).stores({
      records: 'id, title, createdAt, updatedAt, *tags', 
      media: 'id, recordId, mediaType, createdAt',
      tags: '++id, &name' 
    }).upgrade(trans => {
      // Optional: Migrate existing records if needed, e.g., extract title from content
      return trans.table('records').toCollection().modify(record => {
        if (!record.title) {
           // Simple strategy: Use first line as title, truncated
           const firstLine = record.content.split('\n')[0] || '无标题';
           record.title = firstLine.slice(0, 20);
        }
      });
    });

    // Version 4: Finance Module
    this.version(4).stores({
      records: 'id, title, createdAt, updatedAt, *tags', 
      media: 'id, recordId, mediaType, createdAt',
      tags: '++id, &name',
      transactions: 'id, type, categoryId, accountId, date, createdAt',
      categories: 'id, type, isDefault',
      accounts: 'id, type'
    }).upgrade(async trans => {
       // Initialize default categories and accounts
       const categoriesTable = trans.table('categories');
       const accountsTable = trans.table('accounts');
       
       // Check if initialized
       const count = await categoriesTable.count();
       if (count === 0) {
         // Default Expense Categories
         const expenseCats = [
            { id: 'c_food', name: '餐饮', icon: 'Utensils', type: 'expense', color: '#ef4444', isDefault: true },
            { id: 'c_transport', name: '交通', icon: 'Bus', type: 'expense', color: '#3b82f6', isDefault: true },
            { id: 'c_shopping', name: '购物', icon: 'ShoppingBag', type: 'expense', color: '#f59e0b', isDefault: true },
            { id: 'c_entertainment', name: '娱乐', icon: 'Gamepad2', type: 'expense', color: '#8b5cf6', isDefault: true },
            { id: 'c_house', name: '居住', icon: 'Home', type: 'expense', color: '#10b981', isDefault: true },
            { id: 'c_medical', name: '医疗', icon: 'Stethoscope', type: 'expense', color: '#ef4444', isDefault: true },
            { id: 'c_other', name: '其他', icon: 'MoreHorizontal', type: 'expense', color: '#6b7280', isDefault: true },
         ];
         
         // Default Income Categories
         const incomeCats = [
            { id: 'c_salary', name: '工资', icon: 'Banknote', type: 'income', color: '#10b981', isDefault: true },
            { id: 'c_bonus', name: '奖金', icon: 'Gift', type: 'income', color: '#f59e0b', isDefault: true },
            { id: 'c_invest', name: '理财', icon: 'TrendingUp', type: 'income', color: '#3b82f6', isDefault: true },
            { id: 'c_other_in', name: '其他', icon: 'MoreHorizontal', type: 'income', color: '#6b7280', isDefault: true },
         ];

         await categoriesTable.bulkAdd([...expenseCats, ...incomeCats]);

         // Default Accounts
         await accountsTable.bulkAdd([
            { id: 'a_cash', name: '现金', type: 'cash', balance: 0, icon: 'Wallet' },
            { id: 'a_wechat', name: '微信', type: 'wechat', balance: 0, icon: 'MessageCircle' },
            { id: 'a_alipay', name: '支付宝', type: 'alipay', balance: 0, icon: 'CreditCard' },
            { id: 'a_bank', name: '银行卡', type: 'bank', balance: 0, icon: 'Landmark' },
         ]);
       }
    });

    // Version 5: Countdowns
    this.version(5).stores({
        records: 'id, title, createdAt, updatedAt, *tags', 
        media: 'id, recordId, mediaType, createdAt',
        tags: '++id, &name',
        transactions: 'id, type, categoryId, accountId, date, createdAt',
        categories: 'id, type, isDefault',
        accounts: 'id, type',
        countdowns: 'id, date, type'
    });
  }
}

export const db = new SuijiDatabase();
