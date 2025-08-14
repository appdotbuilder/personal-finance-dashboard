import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag,
  Palette,
  Search,
  Grid3X3
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import { CategoryForm } from './CategoryForm';
import type { Category } from '../../../server/src/schema';

export function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCategories = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await trpc.getCategories.query({ userId: user.id });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategory = async (categoryData: any) => {
    try {
      const newCategory = await trpc.createCategory.mutate({
        ...categoryData,
        user_id: user!.id
      });
      setCategories(prev => [...prev, newCategory]);
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  };

  const handleUpdateCategory = async (categoryData: any) => {
    if (!editingCategory) return;

    try {
      const updatedCategory = await trpc.updateCategory.mutate({
        id: editingCategory.id,
        ...categoryData
      });
      setCategories(prev =>
        prev.map(c => c.id === editingCategory.id ? updatedCategory : c)
      );
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await trpc.deleteCategory.mutate({
          categoryId,
          userId: user.id
        });
        setCategories(prev => prev.filter(c => c.id !== categoryId));
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  // Predefined category suggestions
  const categorySuggestions = [
    { name: 'Food & Dining', icon: '🍽️', color: '#ff6b6b' },
    { name: 'Transportation', icon: '🚗', color: '#4ecdc4' },
    { name: 'Entertainment', icon: '🎬', color: '#45b7d1' },
    { name: 'Shopping', icon: '🛍️', color: '#96ceb4' },
    { name: 'Bills & Utilities', icon: '⚡', color: '#feca57' },
    { name: 'Healthcare', icon: '🏥', color: '#ff9ff3' },
    { name: 'Education', icon: '📚', color: '#54a0ff' },
    { name: 'Travel', icon: '✈️', color: '#5f27cd' },
    { name: 'Fitness', icon: '💪', color: '#00d2d3' },
    { name: 'Investment', icon: '📈', color: '#ff9f43' },
    { name: 'Savings', icon: '💰', color: '#26de81' },
    { name: 'Insurance', icon: '🛡️', color: '#fd79a8' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Categories</h1>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
        <h1 className="text-2xl font-bold">Categories</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a category to organize your transactions
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              onSubmit={handleAddCategory}
              onCancel={() => setShowAddDialog(false)}
              suggestions={categorySuggestions}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{categories.length}</span> categories created
          </div>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Suggestions (show only when no categories exist) */}
      {categories.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Grid3X3 className="mr-2 h-5 w-5" />
              Quick Start Categories
            </CardTitle>
            <CardDescription>
              Get started quickly with these common expense categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categorySuggestions.slice(0, 6).map((suggestion, index) => (
                <Button
                  key={suggestion.name}
                  variant="ghost"
                  className="justify-start h-auto p-3 animate-scaleIn"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => {
                    handleAddCategory({
                      name: suggestion.name,
                      icon: suggestion.icon,
                      color: suggestion.color
                    });
                  }}
                >
                  <span className="mr-2 text-lg">{suggestion.icon}</span>
                  <span className="text-sm">{suggestion.name}</span>
                </Button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setShowAddDialog(true)}>
                Or create a custom category
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      {filteredCategories.length === 0 && categories.length > 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">No categories found</h3>
            <p className="text-muted-foreground">
              No categories match your search term "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      ) : filteredCategories.length === 0 && categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-4">
              Create categories to organize your income and expenses
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category, index) => (
            <Card 
              key={category.id} 
              className="animate-scaleIn hover:shadow-md transition-shadow"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: category.color || '#e5e7eb' }}
                    >
                      {category.icon || '🏷️'}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCategory(category)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center">
                      <Palette className="mr-1 h-3 w-3" />
                      Color:
                    </span>
                    <Badge variant="outline" style={{ backgroundColor: category.color || '#e5e7eb' }}>
                      {category.color || 'Default'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center">
                      <Tag className="mr-1 h-3 w-3" />
                      Icon:
                    </span>
                    <span>{category.icon || '🏷️'}</span>
                  </div>
                  
                  <div className="flex justify-between pt-2 text-xs text-muted-foreground border-t">
                    <span>Created {formatDate(category.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Make changes to your category
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              initialData={editingCategory}
              onSubmit={handleUpdateCategory}
              onCancel={() => setEditingCategory(null)}
              suggestions={categorySuggestions}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}