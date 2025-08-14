import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Category, Transaction } from '../../../server/src/schema';

interface TransactionFormProps {
  categories: Category[];
  initialData?: Transaction | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function TransactionForm({ categories, initialData, onSubmit, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form with initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        amount: initialData.amount.toString(),
        description: initialData.description,
        category_id: initialData.category_id?.toString() || '',
        date: new Date(initialData.date).toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
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
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        date: new Date(formData.date)
      });
      
      // Reset form if adding new transaction
      if (!initialData) {
        setFormData({
          type: 'expense',
          amount: '',
          description: '',
          category_id: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save transaction. Please try again.' });
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

      {/* Transaction Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value: 'income' | 'expense') => handleInputChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select transaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">💰 Income</SelectItem>
            <SelectItem value="expense">💳 Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Enter transaction description..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className={errors.description ? 'border-destructive' : ''}
          disabled={isSubmitting}
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category_id">Category</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => handleInputChange('category_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">🏷️ Uncategorized</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.icon ? `${category.icon} ` : '🏷️ '}{category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => handleInputChange('date', e.target.value)}
          className={errors.date ? 'border-destructive' : ''}
          disabled={isSubmitting}
        />
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date}</p>
        )}
      </div>

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
              {initialData ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            initialData ? 'Update Transaction' : 'Add Transaction'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}