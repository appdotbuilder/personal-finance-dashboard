import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Category, Budget } from '../../../server/src/schema';

interface BudgetFormProps {
  categories: Category[];
  initialData?: Budget | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({ categories, initialData, onSubmit, onCancel }: BudgetFormProps) {
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form with initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        category_id: initialData.category_id?.toString() || '',
        amount: initialData.amount.toString(),
        period: initialData.period
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Budget amount must be greater than 0';
    }

    if (!formData.period) {
      newErrors.period = 'Budget period is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit({
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        amount: parseFloat(formData.amount),
        period: formData.period
      });
      
      // Reset form if adding new budget
      if (!initialData) {
        setFormData({
          category_id: '',
          amount: '',
          period: 'monthly'
        });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save budget. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          {errors.submit}
        </div>
      )}

      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="category_id">Category</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => handleInputChange('category_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category or leave blank for general budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">🎯 General Budget (All Categories)</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.icon ? `${category.icon} ` : '🏷️ '}{category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {formData.category_id 
            ? 'This budget will apply only to the selected category'
            : 'This budget will track all expenses across categories'
          }
        </p>
      </div>

      {/* Budget Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Budget Amount *</Label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-muted-foreground">$</span>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            className={`pl-8 ${errors.amount ? 'border-destructive' : ''}`}
            step="0.01"
            min="0"
            disabled={isSubmitting}
          />
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount}</p>
        )}
      </div>

      {/* Budget Period */}
      <div className="space-y-2">
        <Label htmlFor="period">Budget Period *</Label>
        <Select
          value={formData.period}
          onValueChange={(value: 'monthly' | 'yearly') => handleInputChange('period', value)}
        >
          <SelectTrigger className={errors.period ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select budget period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">📅 Monthly</SelectItem>
            <SelectItem value="yearly">🗓️ Yearly</SelectItem>
          </SelectContent>
        </Select>
        {errors.period && (
          <p className="text-sm text-destructive">{errors.period}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.period === 'monthly' 
            ? 'Budget resets every month'
            : 'Budget resets every year'
          }
        </p>
      </div>

      {/* Budget Preview */}
      {formData.amount && parseFloat(formData.amount) > 0 && (
        <div className="bg-muted/50 rounded p-3 space-y-2">
          <h4 className="font-medium text-sm">Budget Preview</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>${parseFloat(formData.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Period:</span>
              <span className="capitalize">{formData.period}</span>
            </div>
            <div className="flex justify-between">
              <span>Category:</span>
              <span>
                {formData.category_id 
                  ? categories.find(c => c.id.toString() === formData.category_id)?.name || 'Unknown'
                  : 'All Categories'
                }
              </span>
            </div>
            {formData.period === 'monthly' && (
              <div className="flex justify-between font-medium">
                <span>Daily limit:</span>
                <span>${(parseFloat(formData.amount) / 30).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 loading-spinner" />
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            initialData ? 'Update Budget' : 'Create Budget'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}