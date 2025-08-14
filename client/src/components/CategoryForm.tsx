import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Palette } from 'lucide-react';
import type { Category } from '../../../server/src/schema';

interface CategoryFormProps {
  initialData?: Category | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  suggestions?: Array<{
    name: string;
    icon: string;
    color: string;
  }>;
}

const commonEmojis = ['🏷️', '🍽️', '🚗', '🎬', '🛍️', '⚡', '🏥', '📚', '✈️', '💪', '📈', '💰', '🛡️', '🏠', '🎮', '☕', '📱', '👕', '⛽', '🎵'];

const commonColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
  '#26de81', '#fd79a8', '#6c5ce7', '#fdcb6e', '#e17055',
  '#74b9ff', '#0984e3', '#00b894', '#00cec9', '#6c5ce7'
];

export function CategoryForm({ initialData, onSubmit, onCancel, suggestions = [] }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    icon: '🏷️',
    color: '#4ecdc4'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form with initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        icon: initialData.icon || '🏷️',
        color: initialData.color || '#4ecdc4'
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
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
        name: formData.name.trim(),
        icon: formData.icon || null,
        color: formData.color || null
      });
      
      // Reset form if adding new category
      if (!initialData) {
        setFormData({
          name: '',
          icon: '🏷️',
          color: '#4ecdc4'
        });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save category. Please try again.' });
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

  const applySuggestion = (suggestion: { name: string; icon: string; color: string }) => {
    setFormData({
      name: suggestion.name,
      icon: suggestion.icon,
      color: suggestion.color
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          {errors.submit}
        </div>
      )}

      {/* Category Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Food & Dining, Transportation"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={errors.name ? 'border-destructive' : ''}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Icon Selection */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Choose an emoji or enter custom icon"
            value={formData.icon}
            onChange={(e) => handleInputChange('icon', e.target.value)}
            disabled={isSubmitting}
            className="text-center text-lg"
          />
          <div className="grid grid-cols-10 gap-1 max-h-24 overflow-y-auto border rounded p-2">
            {commonEmojis.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant={formData.icon === emoji ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 text-lg p-0"
                onClick={() => handleInputChange('icon', emoji)}
                disabled={isSubmitting}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-2">
        <Label className="flex items-center">
          <Palette className="mr-1 h-4 w-4" />
          Color
        </Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              disabled={isSubmitting}
              className="w-12 h-10 p-1 rounded"
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              disabled={isSubmitting}
              className="flex-1 font-mono text-sm"
              placeholder="#4ecdc4"
            />
          </div>
          <div className="grid grid-cols-10 gap-1">
            {commonColors.map((color) => (
              <Button
                key={color}
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 border-2 ${
                  formData.color === color ? 'border-foreground' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleInputChange('color', color)}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 rounded p-3">
        <h4 className="font-medium text-sm mb-2">Preview</h4>
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: formData.color }}
          >
            {formData.icon}
          </div>
          <span className="font-medium">{formData.name || 'Category Name'}</span>
        </div>
      </div>

      {/* Quick Suggestions (only for new categories) */}
      {!initialData && suggestions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Quick Templates</Label>
            <div className="grid gap-2 max-h-24 overflow-y-auto">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="ghost"
                  className="justify-start h-auto p-2 text-left"
                  onClick={() => applySuggestion(suggestion)}
                  disabled={isSubmitting}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm"
                    style={{ backgroundColor: suggestion.color }}
                  >
                    {suggestion.icon}
                  </div>
                  <span className="text-sm">{suggestion.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </>
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
          disabled={isSubmitting || !formData.name.trim()}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 loading-spinner" />
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            initialData ? 'Update Category' : 'Create Category'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}