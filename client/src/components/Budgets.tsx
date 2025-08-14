import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Target, 
  AlertTriangle, 
  Edit, 
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import { BudgetForm } from './BudgetForm';
import type { Budget, Category, BudgetAlert } from '../../../server/src/schema';

interface BudgetWithDetails extends Budget {
  category_name?: string;
  spent_amount?: number;
  remaining_amount?: number;
  percentage_used?: number;
}

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const loadBudgets = useCallback(async () => {
    if (!user) return;

    try {
      const result = await trpc.getBudgets.query({ userId: user.id });
      setBudgets(result);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  }, [user]);

  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const result = await trpc.getCategories.query({ userId: user.id });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [user]);

  const loadBudgetAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const result = await trpc.getBudgetAlerts.query({ userId: user.id });
      setBudgetAlerts(result);
    } catch (error) {
      console.error('Failed to load budget alerts:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadBudgets(),
        loadCategories(),
        loadBudgetAlerts()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [loadBudgets, loadCategories, loadBudgetAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddBudget = async (budgetData: any) => {
    try {
      await trpc.createBudget.mutate({
        ...budgetData,
        user_id: user!.id
      });
      await loadData(); // Reload all data to get updated alerts
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create budget:', error);
      throw error;
    }
  };

  const handleUpdateBudget = async (budgetData: any) => {
    if (!editingBudget) return;

    try {
      await trpc.updateBudget.mutate({
        id: editingBudget.id,
        ...budgetData
      });
      await loadData(); // Reload all data to get updated alerts
      setEditingBudget(null);
    } catch (error) {
      console.error('Failed to update budget:', error);
      throw error;
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!user) return;

    try {
      await trpc.deleteBudget.mutate({
        budgetId,
        userId: user.id
      });
      await loadData(); // Reload all data to get updated alerts
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 100) return { color: 'destructive', label: 'Over Budget' };
    if (percentage >= 80) return { color: 'secondary', label: 'Near Limit', className: 'bg-yellow-500 text-yellow-50' };
    return { color: 'default', label: 'On Track', className: '' };
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'General Budget';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  // Merge budget data with alert data for enhanced display
  const enrichedBudgets = budgets.map(budget => {
    const alert = budgetAlerts.find(a => a.budget_id === budget.id);
    return {
      ...budget,
      category_name: getCategoryName(budget.category_id),
      spent_amount: alert?.spent_amount || 0,
      remaining_amount: budget.amount - (alert?.spent_amount || 0),
      percentage_used: alert?.percentage_used || 0
    };
  });

  // Calculate overview stats
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetAlerts.reduce((sum, alert) => sum + alert.spent_amount, 0);
  const budgetsOverLimit = budgetAlerts.filter(alert => alert.percentage_used >= 100).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Budgets</h1>
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
        <h1 className="text-2xl font-bold">Budget Management</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set spending limits for categories or overall expenses
              </DialogDescription>
            </DialogHeader>
            <BudgetForm
              categories={categories}
              onSubmit={handleAddBudget}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Banner */}
      {budgetsOverLimit > 0 && (
        <Alert variant="destructive" className="animate-slideIn">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget Alert!</strong> You have {budgetsOverLimit} budget{budgetsOverLimit !== 1 ? 's' : ''} over the limit.
            Review your spending to get back on track.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="animate-scaleIn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0'}% of total budget
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(Math.max(0, totalBudget - totalSpent))}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to spend
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {budgetAlerts.filter(alert => alert.percentage_used >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Budgets near or over limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      {enrichedBudgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-medium mb-2">No budgets set</h3>
            <p className="text-muted-foreground mb-4">
              Create your first budget to start tracking your spending limits
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrichedBudgets.map((budget, index) => {
            const status = getBudgetStatus(budget.percentage_used || 0);
            
            return (
              <Card key={budget.id} className="animate-scaleIn" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{budget.category_name}</CardTitle>
                    <Badge variant={status.color as any} className={`text-xs ${status.className || ''}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center text-sm">
                    <Calendar className="mr-1 h-3 w-3" />
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent: {formatCurrency(budget.spent_amount || 0)}</span>
                      <span>Budget: {formatCurrency(budget.amount)}</span>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage_used || 0, 100)} 
                      className={`h-2 ${
                        (budget.percentage_used || 0) >= 100 
                          ? 'bg-destructive/20' 
                          : (budget.percentage_used || 0) >= 80 
                            ? 'bg-warning/20' 
                            : 'bg-success/20'
                      }`}
                    />
                  </div>

                  {/* Budget Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-medium">{(budget.percentage_used || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className={`font-medium ${
                        (budget.remaining_amount || 0) >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(budget.remaining_amount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingBudget(budget)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Budget Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update your budget settings
            </DialogDescription>
          </DialogHeader>
          {editingBudget && (
            <BudgetForm
              categories={categories}
              initialData={editingBudget}
              onSubmit={handleUpdateBudget}
              onCancel={() => setEditingBudget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}