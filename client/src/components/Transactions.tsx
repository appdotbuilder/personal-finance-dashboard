import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Tag
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import { TransactionForm } from './TransactionForm';
import type { Transaction, Category } from '../../../server/src/schema';

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    type: '' as 'income' | 'expense' | '',
    category_id: '',
    min_amount: '',
    max_amount: '',
    start_date: '',
    end_date: ''
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });

  const loadTransactions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const queryParams: any = {
        user_id: user.id,
        limit: pagination.limit,
        offset: pagination.offset
      };

      // Add filters if they exist
      if (filters.search) queryParams.search = filters.search;
      if (filters.type) queryParams.type = filters.type;
      if (filters.category_id) queryParams.category_id = parseInt(filters.category_id);
      if (filters.min_amount) queryParams.min_amount = parseFloat(filters.min_amount);
      if (filters.max_amount) queryParams.max_amount = parseFloat(filters.max_amount);
      if (filters.start_date) queryParams.start_date = new Date(filters.start_date);
      if (filters.end_date) queryParams.end_date = new Date(filters.end_date);

      const result = await trpc.getTransactions.query(queryParams);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, pagination, filters]);

  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const result = await trpc.getCategories.query({ userId: user.id });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddTransaction = async (transactionData: any) => {
    try {
      const newTransaction = await trpc.createTransaction.mutate({
        ...transactionData,
        user_id: user!.id
      });
      setTransactions(prev => [newTransaction, ...prev]);
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };

  const handleUpdateTransaction = async (transactionData: any) => {
    if (!editingTransaction) return;

    try {
      const updatedTransaction = await trpc.updateTransaction.mutate({
        id: editingTransaction.id,
        ...transactionData
      });
      setTransactions(prev =>
        prev.map(t => t.id === editingTransaction.id ? updatedTransaction : t)
      );
      setEditingTransaction(null);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!user) return;

    try {
      await trpc.deleteTransaction.mutate({
        transactionId,
        userId: user.id
      });
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category_id: '',
      min_amount: '',
      max_amount: '',
      start_date: '',
      end_date: ''
    });
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record a new income or expense transaction
              </DialogDescription>
            </DialogHeader>
            <TransactionForm
              categories={categories}
              onSubmit={handleAddTransaction}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="animate-scaleIn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {transactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {transactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalIncome - totalExpenses >= 0 ? 'Positive' : 'Negative'} balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>

            <Select 
              value={filters.type} 
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.category_id} 
              onValueChange={(value) => handleFilterChange('category_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="0">Uncategorized</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Min amount"
              value={filters.min_amount}
              onChange={(e) => handleFilterChange('min_amount', e.target.value)}
              step="0.01"
            />

            <Input
              type="number"
              placeholder="Max amount"
              value={filters.max_amount}
              onChange={(e) => handleFilterChange('max_amount', e.target.value)}
              step="0.01"
            />

            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <p className="text-sm text-muted-foreground">
              Showing {transactions.length} transactions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium mb-2">No transactions found</h3>
              <p className="text-sm">
                {Object.values(filters).some(v => v) 
                  ? 'Try adjusting your filters or add your first transaction'
                  : 'Add your first transaction to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="animate-slideIn">
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(transaction.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                        {getCategoryName(transaction.category_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transaction.type === 'income' ? 'default' : 'secondary'}
                        className={
                          transaction.type === 'income' 
                            ? 'bg-success text-success-foreground' 
                            : 'bg-destructive text-destructive-foreground'
                        }
                      >
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${
                        transaction.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Make changes to your transaction
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <TransactionForm
              categories={categories}
              initialData={editingTransaction}
              onSubmit={handleUpdateTransaction}
              onCancel={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}